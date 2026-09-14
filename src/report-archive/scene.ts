import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  damp,
  baselineSelectionWave,
  idleWave,
  returnStep,
  smooth,
  INSPECTION_LIFT,
} from "./shared/motion";
import { recordAt, wrap, key } from "./data";

type Cell = { lane: number; row: number };
type Moving = {
  cell: Cell;
  group: T.Group;
  lift: { value: number; velocity: number };
  angle: number;
  hold: number | null;
};
const COLS = 9,
  ROWS = 32,
  COUNT = COLS * ROWS;
const nearest = (v: number, c: number, p: number) =>
  v + Math.floor((c - v + p / 2) / p) * p;

function labelTexture(code: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(64, 512);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#1e3040";
  ctx.font = "54px MiSans, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, 0, 0);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
function lighting(renderer: T.WebGLRenderer, scene: T.Scene) {
  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.65;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight("#d4ebff", "#152436", 0.75));
  const keyLight = new T.DirectionalLight("#d5e8ff", 2.4);
  keyLight.position.set(-8, 12, 5);
  scene.add(keyLight);
  const rim = new T.DirectionalLight("#c3e0ff", 2.8);
  rim.position.set(3, 8, -8);
  scene.add(rim);
  return env;
}

export class MetalScene {
  readonly renderer: T.WebGLRenderer;
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(10, 16 / 9, 0.1, 250);
  private composer: EffectComposer;
  private bokeh: BokehPass;
  private ao: SSAOPass;
  private template = new T.Group();
  private instances: T.InstancedMesh[] = [];
  private labels!: T.InstancedMesh;
  private tile!: T.InstancedBufferAttribute;
  private cells: Cell[] = [];
  private moving = new Map<string, Moving>();
  private selected: Cell = { lane: 0, row: 0 };
  private trackX = { value: 0, velocity: 0 };
  private trackRow = { value: 0, velocity: 0 };
  private shoulder = { value: 0, velocity: 0 };
  private laneFocus = { value: 0, velocity: 0 };
  private detail = 0;
  private cameraAim = new T.Vector3();
  private ready = false;
  private last = 0;
  private clock = 0;
  private idleSince = 0;
  private idleGain = 0;
  private pulses: { cell: Cell; time: number }[] = [];
  private dummy = new T.Object3D();
  private ray = new T.Raycaster();
  private cursor = new T.Vector2();
  private down: { x: number; y: number; drag: boolean } | null = null;
  private targetAngle = 0;
  private canRotate = false;
  private detailTarget = false;
  private reduced = false;
  private quality = true;
  private clearance = 0;
  private entry = { value: 0, velocity: 0 };
  onPick?: (cell: Cell) => void;
  onOpen?: () => void;
  onHover?: (record: ReturnType<typeof recordAt> | null) => void;

  constructor(private host: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    host.append(this.renderer.domElement);
    this.scene.background = new T.Color("#263b4c");
    this.scene.fog = new T.Fog("#263b4c", 60, 95);
    lighting(this.renderer, this.scene);
    this.composer = new EffectComposer(this.renderer);
    this.composer.renderTarget1.samples = 4;
    this.composer.renderTarget2.samples = 4;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new SSAOPass(this.scene, this.camera, 1920, 1080);
    this.ao.kernelRadius = 10;
    this.ao.minDistance = 0.001;
    this.ao.maxDistance = 0.08;
    this.composer.addPass(this.ao);
    this.bokeh = new BokehPass(this.scene, this.camera, {
      focus: 70,
      aperture: 0.0014,
      maxblur: 0.019,
    });
    this.composer.addPass(this.bokeh);
    this.composer.addPass(new OutputPass());
    this.camera.position.set(-55, 28, 34);
    this.camera.lookAt(0, 0, 0);
    this.bind();
    this.resize();
  }
  async load() {
    const gltf = await new GLTFLoader().loadAsync("/report-archive/assets/archive-metal.glb");
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((obj) => {
      if (!(obj instanceof T.Mesh)) return;
      const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld),
        material = (obj.material as T.MeshStandardMaterial).clone();
      material.envMapIntensity = 0.8;
      const mesh = new T.Mesh(geometry, material);
      this.template.add(mesh);
      const inst = new T.InstancedMesh(geometry, material, COUNT);
      inst.instanceMatrix.setUsage(T.DynamicDrawUsage);
      inst.frustumCulled = false;
      this.instances.push(inst);
      this.scene.add(inst);
    });
    const atlas = document.createElement("canvas");
    atlas.width = 640;
    atlas.height = 4096;
    const ctx = atlas.getContext("2d")!;
    for (let col = 0; col < 5; col++)
      for (let row = 0; row < 8; row++) {
        ctx.save();
        ctx.translate(col * 128 + 64, row * 512 + 256);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "#253748";
        ctx.font = "43px MiSans, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ARCHIVE", 0, 0);
        ctx.restore();
      }
    const map = new T.CanvasTexture(atlas);
    map.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "attribute vec2 archiveTile;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\nvMapUv = (vMapUv + archiveTile) / vec2(5.0, 8.0);",
      );
    };
    const plane = new T.PlaneGeometry(0.31, 2.3);
    this.tile = new T.InstancedBufferAttribute(new Float32Array(COUNT * 2), 2);
    plane.setAttribute("archiveTile", this.tile);
    this.labels = new T.InstancedMesh(plane, mat, COUNT);
    this.labels.frustumCulled = false;
    this.scene.add(this.labels);
    this.ready = true;
    this.ensure(this.selected);
    this.idleSince = performance.now() / 1000;
  }
  private ensure(cell: Cell) {
    const id = key(cell.lane, cell.row);
    let item = this.moving.get(id);
    if (item) return item;
    const group = this.template.clone(true);
    const texture = labelTexture(recordAt(cell.lane, cell.row).code);
    const label = new T.Mesh(
      new T.PlaneGeometry(0.31, 2.3),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    label.name = "dynamic-label";
    label.position.set(-2.17, 2.07, 0.204);
    group.add(label);
    this.scene.add(group);
    item = {
      cell: { ...cell },
      group,
      lift: { value: 0, velocity: 0 },
      angle: 0,
      hold: null,
    };
    this.moving.set(id, item);
    return item;
  }
  select(cell: Cell) {
    if (key(cell.lane, cell.row) === key(this.selected.lane, this.selected.row))
      return;
    const old = this.moving.get(key(this.selected.lane, this.selected.row));
    if (old && old.angle !== 0) old.hold = old.group.position.y;
    this.selected = { ...cell };
    this.targetAngle = 0;
    if (this.ready) this.ensure(cell);
    this.pulses.push({ cell: { ...cell }, time: this.clock });
    this.idleSince = this.clock;
  }
  refreshLabels() {
    for (const item of this.moving.values()) {
      const label = item.group.getObjectByName('dynamic-label') as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
      if (!label) continue;
      label.material.map?.dispose();
      label.material.map = labelTexture(recordAt(item.cell.lane,item.cell.row).code);
      label.material.needsUpdate = true;
    }
  }
  setDetail(value: boolean) {
    this.detailTarget = value;
    this.targetAngle = 0;
    this.idleSince = this.clock;
    const item = this.moving.get(key(this.selected.lane, this.selected.row));
    if (item && !value && item.angle !== 0) item.hold = item.group.position.y;
  }
  setPreferences(reduced: boolean, quality: boolean) {
    this.reduced = reduced;
    this.quality = quality;
    this.bokeh.enabled = quality;
    this.ao.enabled = quality;
    this.resize();
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, this.quality ? 1.5 : 1) *
        Math.min(innerWidth / 1920, innerHeight / 1007),
    );
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  private field(row: number, lane: number) {
    const shoulder =
      2.15 * Math.exp(-0.5 * ((row - this.shoulder.value) / 3.6) ** 2);
    const col =
      0.24 +
      0.76 * Math.exp(-0.5 * ((lane - this.laneFocus.value) / 0.68) ** 2);
    let ripple = 0;
    if (!this.reduced)
      for (const p of this.pulses)
        ripple += baselineSelectionWave(
          Math.hypot(row - p.cell.row, (lane - p.cell.lane) * 2.2),
          this.clock - p.time,
        );
    const idle = idleWave(row, lane, this.clock) * 0.45 * this.idleGain;
    return (
      shoulder * col +
      T.MathUtils.clamp(ripple, -0.6, 0.6) * (1 - this.detail) +
      idle
    );
  }
  update(time: number) {
    const dt = Math.min(this.last ? time - this.last : 1 / 60, 0.05);
    this.last = time;
    this.clock = time;
    if (!this.ready) return;
    damp(this.entry, 1, this.reduced ? 40 : 3, dt);
    damp(this.trackX, this.selected.lane * 5.2, this.reduced ? 40 : 3.7, dt);
    damp(this.trackRow, this.selected.row, this.reduced ? 40 : 3.7, dt);
    damp(this.shoulder, this.selected.row, this.reduced ? 40 : 5, dt);
    damp(this.laneFocus, this.selected.lane, this.reduced ? 40 : 4, dt);
    this.pulses = this.pulses.filter((p) => time - p.time < 3.2);
    const idle =
      !this.reduced &&
      !this.detailTarget &&
      this.detail < 0.01 &&
      time - this.idleSince > 2.5 &&
      ![...this.moving.values()].some((item) => item.hold !== null);
    this.idleGain = T.MathUtils.lerp(
      this.idleGain,
      idle ? 1 : 0,
      1 - Math.exp(-dt * (idle ? 0.8 : 4)),
    );
    const selectedKey = key(this.selected.lane, this.selected.row);
    const selected = this.ensure(this.selected);
    const entryOffset = -(1 - this.entry.value) * 9;
    for (const [id, item] of this.moving) {
      const active = id === selectedKey,
        base = -3.0 + this.field(item.cell.row, item.cell.lane);
      if (active && this.detailTarget && item.hold === null)
        item.angle = T.MathUtils.lerp(
          item.angle,
          this.targetAngle,
          1 - Math.exp(-dt * 7),
        );
      else item.angle = returnStep(item.angle, dt, this.reduced);
      if (item.hold !== null) {
        item.lift.value = item.hold - base;
        item.lift.velocity = 0;
        if (item.angle === 0) item.hold = null;
      } else
        damp(
          item.lift,
          active ? (this.detailTarget ? INSPECTION_LIFT : 0.4) : 0,
          this.reduced ? 40 : active ? 4.2 : 4.5,
          dt,
        );
      item.group.position.set(
        item.cell.lane * 5.2 - this.trackX.value,
        base + item.lift.value,
        -(item.cell.row - this.trackRow.value) * 0.62 + entryOffset,
      );
      item.group.rotation.y = item.angle;
      if (
        !active &&
        item.lift.value < 0.0001 &&
        item.hold === null &&
        item.angle === 0
      ) {
        this.scene.remove(item.group);
        const label = item.group.getObjectByName("dynamic-label") as T.Mesh<
          T.PlaneGeometry,
          T.MeshBasicMaterial
        >;
        label.geometry.dispose();
        label.material.map?.dispose();
        label.material.dispose();
        this.moving.delete(id);
      }
    }
    const cameraTarget = this.detailTarget
      ? smooth((selected.lift.value - 0.8) / 2.4)
      : selected.hold !== null
        ? this.detail
        : smooth((selected.lift.value - 0.4) / (INSPECTION_LIFT - 0.4));
    this.detail = T.MathUtils.lerp(
      this.detail,
      cameraTarget,
      1 - Math.exp(-dt * 3.8),
    );
    this.cells = [];
    for (let i = 0; i < COUNT; i++) {
      const lane = nearest(
          Math.floor(i / ROWS) - 4,
          this.trackX.value / 5.2,
          COLS,
        ),
        row = nearest((i % ROWS) - 16, this.trackRow.value, ROWS);
      const cell = { lane, row };
      this.cells.push(cell);
      const hidden = this.moving.has(key(lane, row));
      this.dummy.position.set(
        lane * 5.2 - this.trackX.value,
        -3 + this.field(row, lane),
        -(row - this.trackRow.value) * 0.62 + entryOffset,
      );
      this.dummy.rotation.set(
        (this.field(row + 0.5, lane) - this.field(row - 0.5, lane)) *
          0.024 *
          (1 - this.detail),
        0,
        0,
      );
      this.dummy.scale.setScalar(hidden ? 0 : 1);
      this.dummy.updateMatrix();
      for (const inst of this.instances) inst.setMatrixAt(i, this.dummy.matrix);
      this.dummy.translateX(-2.17);
      this.dummy.translateY(2.07);
      this.dummy.translateZ(0.204);
      this.dummy.updateMatrix();
      this.labels.setMatrixAt(i, this.dummy.matrix);
      this.tile.setXY(i, wrap(lane, 5), 7 - wrap(row, 8));
    }
    this.tile.needsUpdate = true;
    this.labels.instanceMatrix.needsUpdate = true;
    for (const inst of this.instances) inst.instanceMatrix.needsUpdate = true;
    // Model remains above its slot; the camera carries all reframing.
    const dir = new T.Vector3(-0.8, 0.36, 0.48)
      .normalize()
      .lerp(new T.Vector3(-0.28, 0.16, 0.947).normalize(), this.detail)
      .normalize();
    const right = new T.Vector3(dir.z, 0, -dir.x).normalize();
    const aim = new T.Vector3(0, 1.05, 0).addScaledVector(right, 0.1);
    const close = selected.group.position
      .clone()
      .add(new T.Vector3(0, 1.85, 0))
      .addScaledVector(right, 2.2);
    aim.lerp(close, this.detail);
    const distance = T.MathUtils.lerp(70, 58, this.detail),
      span = T.MathUtils.lerp(7.33, 6.7, this.detail);
    const cameraBlend =
      this.last === time && this.entry.value < 0.01 ? 1 : 1 - Math.exp(-dt * 5);
    this.cameraAim.lerp(aim, cameraBlend);
    this.camera.position.lerp(
      aim.clone().addScaledVector(dir, distance),
      cameraBlend,
    );
    this.camera.lookAt(this.cameraAim);
    this.camera.fov = T.MathUtils.radToDeg(
      2 * Math.atan(span / (2 * distance)),
    );
    this.camera.updateProjectionMatrix();
    const actual = this.camera.position.distanceTo(this.cameraAim),
      fog = this.scene.fog as T.Fog;
    fog.near = actual - 1;
    fog.far = actual + 15;
    const point = selected.group
      .localToWorld(new T.Vector3(-2.17, 2.07, 0.204))
      .applyMatrix4(this.camera.matrixWorldInverse);
    const uniforms = this.bokeh.uniforms as Record<string, { value: number }>;
    uniforms.focus.value = -point.z;
    uniforms.aperture.value = T.MathUtils.lerp(0.0014, 0.00065, this.detail);
    let neighbor = -Infinity;
    for (let r = this.selected.row - 5; r <= this.selected.row + 5; r++)
      if (r !== this.selected.row)
        neighbor = Math.max(
          neighbor,
          -3 + this.field(r, this.selected.lane) + 3.7,
        );
    for (const [id, item] of this.moving)
      if (
        id !== selectedKey &&
        item.cell.lane === this.selected.lane &&
        Math.abs(item.cell.row - this.selected.row) <= 5
      )
        neighbor = Math.max(neighbor, item.group.position.y + 3.7);
    this.clearance = selected.group.position.y - neighbor;
    this.canRotate =
      this.detailTarget && this.detail > 0.9 && this.clearance > 0.3;
    this.composer.render();
    this.host.dataset.stats = JSON.stringify({
      ready: true,
      selected: this.selected,
      lift: selected.lift.value,
      detail: this.detail,
      angle: selected.angle,
      clearance: this.clearance,
      canRotate: this.canRotate,
      returning: this.moving.size - 1,
      phase:
        selected.hold !== null
          ? "aligning"
          : this.canRotate
            ? "ready"
            : this.detailTarget
              ? "lifting"
              : "preview",
      instances: COUNT,
    });
  }
  get detailVisibility() {
    return smooth((this.detail - 0.25) / 0.55);
  }
  private bind() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.down = { x: e.clientX, y: e.clientY, drag: false };
      if (this.canRotate) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (
        this.down &&
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4
      )
        this.down.drag = true;
      if (this.down?.drag && this.canRotate) {
        this.targetAngle = T.MathUtils.clamp(
          this.targetAngle + e.movementX * 0.004,
          -0.9,
          0.9,
        );
        return;
      }
      if (this.detailTarget || !this.ready) return;
      const hit = this.pick(e);
      const record = hit ? recordAt(hit.lane, hit.row) : null;
      this.onHover?.(record);
      canvas.style.cursor = hit ? "pointer" : "default";
    });
    canvas.addEventListener("pointerup", (e) => {
      if (this.down && !this.down.drag && !this.detailTarget) {
        const cell = this.pick(e);
        if (cell) {
          if (
            key(cell.lane, cell.row) ===
            key(this.selected.lane, this.selected.row)
          )
            this.onOpen?.();
          else this.onPick?.(cell);
        }
      }
      this.down = null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointercancel", () => (this.down = null));
    canvas.addEventListener("pointerleave", () => {
      this.onHover?.(null);
    });
  }
  private pick(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.cursor.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.cursor, this.camera);
    const selected = this.moving.get(
      key(this.selected.lane, this.selected.row),
    );
    // Empty collections still support spatial selection; opening requires a report.
    if (selected && this.ray.intersectObject(selected.group, true).length)
      return this.selected;
    const hit = this.ray.intersectObjects(this.instances, false)[0];
    const cell = hit?.instanceId !== undefined ? this.cells[hit.instanceId] : null;
    return cell;
  }
}

export { lighting, labelTexture };
