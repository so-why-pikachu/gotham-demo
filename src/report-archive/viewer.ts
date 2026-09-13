import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { damp } from "./shared/motion";
import { lighting, labelTexture } from "./scene";
import type { recordAt } from "./data";

export class ObjectViewer {
  private dialog: HTMLDialogElement;
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
  private controls: OrbitControls;
  private source?: T.Group;
  private template?: Promise<T.Group>;
  private spread = { value: 0, velocity: 0 };
  private target = 0;
  private reduced = false;
  private closing = false;
  private last = 0;
  private generation = 0;
  private offsets: Record<string, number> = {};
  private label?: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  private groups = new Map<string, T.Group>();
  private opener: HTMLElement | null = null;
  get isOpen() {
    return this.dialog.open;
  }
  constructor() {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "object-viewer";
    this.dialog.setAttribute("aria-label", "360° 模型查看器");
    this.dialog.innerHTML =
      '<div class="viewer-canvas"></div><div class="viewer-bar"><button data-view="close">← RETURN TO ARCHIVE</button><div><h2></h2><p>OBJECT STUDY / 360°</p></div><button data-view="close" aria-label="关闭模型查看器">✕</button></div><div class="viewer-parts">01 / CARRIER<br>02 / SUBSTRATE<br>03 / CORE<br>04 / RAILS<br>05 / COVER<br>06 / FASTENERS</div><p class="viewer-status">LOADING OBJECT…</p><div class="viewer-bottom"><span>拖动旋转 · 滚轮缩放 · 方向键平移</span><div><button data-view="explode">＋ 拆解档案</button> <button data-view="assemble">− 一键重组</button></div><button data-view="reset">复位视角 ↗</button></div>';
    document.body.append(this.dialog);
    this.renderer = new T.WebGLRenderer({ antialias: true });
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.dialog
      .querySelector(".viewer-canvas")!
      .append(this.renderer.domElement);
    this.scene.background = new T.Color("#1c3245");
    lighting(this.renderer, this.scene);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.085;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 22;
    this.controls.maxTargetRadius = 5;
    this.dialog.addEventListener("click", (e) => {
      const v = (e.target as HTMLElement).closest<HTMLElement>("[data-view]")
        ?.dataset.view;
      if (v === "close") void this.close();
      if (this.closing || !this.source) return;
      if (v === "explode" || v === "assemble")
        this.target = v === "explode" ? 1 : 0;
      if (v === "reset") this.reset();
    });
    this.dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      void this.close();
    });
    this.dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        void this.close();
        return;
      }
      if (!e.key.startsWith("Arrow") || this.closing) return;
      e.preventDefault();
      e.stopPropagation();
      const right = new T.Vector3().setFromMatrixColumn(this.camera.matrix, 0),
        up = new T.Vector3().setFromMatrixColumn(this.camera.matrix, 1),
        shift = new T.Vector3();
      const d = this.camera.position.distanceTo(this.controls.target) * 0.025;
      if (e.key === "ArrowLeft") shift.addScaledVector(right, -d);
      if (e.key === "ArrowRight") shift.addScaledVector(right, d);
      if (e.key === "ArrowUp") shift.addScaledVector(up, d);
      if (e.key === "ArrowDown") shift.addScaledVector(up, -d);
      this.camera.position.add(shift);
      this.controls.target.add(shift);
    });
  }
  async open(record: ReturnType<typeof recordAt>, reduced: boolean) {
    if (this.dialog.open) return;
    this.opener = document.activeElement as HTMLElement;
    this.reduced = reduced;
    this.closing = false;
    const ticket = ++this.generation;
    this.dialog.querySelector("h2")!.textContent =
      record.code + " / " + record.title;
    this.dialog.querySelector(".viewer-status")!.textContent =
      "LOADING OBJECT…";
    this.dialog.showModal();
    this.resize();
    this.reset();
    this.controls.enabled = false;
    if (!reduced)
      this.dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 320,
        easing: "cubic-bezier(.22,1,.36,1)",
      });
    try {
      this.template ??= new GLTFLoader()
        .loadAsync("/report-archive/assets/archive-metal-assembly.glb")
        .then((g) => g.scene)
        .catch((e) => {
          this.template = undefined;
          throw e;
        });
      const [template, manifest] = await Promise.all([
        this.template,
        fetch("/report-archive/assets/archive-metal.manifest.json").then((r) => {
          if (!r.ok) throw new Error("Missing asset manifest");
          return r.json();
        }),
      ]);
      if (ticket !== this.generation || this.closing || !this.dialog.open)
        return;
      this.offsets = manifest.explodeOffsetsZ;
      this.source = new T.Group();
      template.updateMatrixWorld(true);
      for (const part of manifest.parts) {
        const group = new T.Group();
        this.groups.set(part, group);
        this.source.add(group);
      }
      template.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        const mesh = new T.Mesh(
          o.geometry.clone().applyMatrix4(o.matrixWorld),
          o.material,
        );
        this.groups.get(o.userData.assemblyPart)!.add(mesh);
      });
      this.label = new T.Mesh(
        new T.PlaneGeometry(manifest.label.width, manifest.label.height),
        new T.MeshBasicMaterial({
          map: labelTexture(record.code),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      this.label.position.fromArray(manifest.label.center);
      this.groups.get("cover")!.add(this.label);
      this.source.position.y = -1.85;
      this.scene.add(this.source);
      this.spread = { value: 0, velocity: 0 };
      this.target = 0;
      this.last = 0;
      this.controls.enabled = true;
      if (!reduced)
        this.renderer.domElement.animate(
          [
            { opacity: 0, transform: "scale(.97)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" },
        );
    } catch (e) {
      if (ticket === this.generation) {
        await this.close();
      }
      throw e;
    }
  }
  private reset() {
    this.controls.enableDamping = false;
    this.controls.update();
    this.camera.position.set(-6, 3.5, 11);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.enableDamping = !this.reduced;
  }
  async close() {
    if (this.closing || !this.dialog.open) return;
    this.closing = true;
    this.generation++;
    this.controls.enabled = false;
    const opacity = getComputedStyle(this.dialog).opacity;
    this.dialog.getAnimations().forEach((a) => a.cancel());
    if (!this.reduced)
      await this.dialog
        .animate([{ opacity }, { opacity: 0 }], {
          duration: 220,
          fill: "forwards",
        })
        .finished.catch(() => {});
    this.dialog.close();
    this.dialog.getAnimations().forEach((a) => a.cancel());
    if (this.source) {
      this.scene.remove(this.source);
      this.source.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      this.label?.material.map?.dispose();
      this.label?.material.dispose();
      this.source = undefined;
      this.groups.clear();
    }
    this.closing = false;
    this.opener?.focus({ preventScroll: true });
  }
  resize() {
    if (!this.dialog.open) return;
    const w = this.dialog.clientWidth,
      h = this.dialog.clientHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  update(time: number) {
    if (!this.dialog.open) return;
    const dt = Math.min(this.last ? time - this.last : 1 / 60, 0.05);
    this.last = time;
    if (this.reduced) this.spread = { value: this.target, velocity: 0 };
    else damp(this.spread, this.target, 5.5, dt);
    for (const [part, group] of this.groups)
      group.position.z = this.offsets[part] * this.spread.value;
    if (this.source)
      this.dialog.querySelector(".viewer-status")!.textContent =
        Math.abs(this.spread.value - this.target) > 0.001
          ? this.target
            ? "EXPANDING ASSEMBLY…"
            : "REASSEMBLING…"
          : this.target
            ? "ASSEMBLY EXPANDED"
            : "ASSEMBLY COMPLETE";
    this.dialog
      .querySelector("[data-view=explode]")!
      .classList.toggle("active", this.target === 1);
    this.dialog
      .querySelector("[data-view=assemble]")!
      .classList.toggle("active", this.target === 0);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.dialog.dataset.stats = JSON.stringify({
      loaded: !!this.source,
      spread: this.spread.value,
      target: this.target,
      parts: this.groups.size,
    });
  }
}
