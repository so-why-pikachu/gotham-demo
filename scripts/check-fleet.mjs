import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Use the same Cesium release as index.html, cached outside the project.
vm.runInThisContext(fs.readFileSync(process.env.CESIUM_TEST_SCRIPT ?? path.join(os.tmpdir(), 'gotham-fleet-cesium.js'), 'utf8'));
const C = globalThis.Cesium;
const { buildRouteGeometry, addTerrainHeights } = await import('../src/cesium/route/preprocess.js');
const { buildFleetTimelines } = await import('../src/cesium/route/fleet.js');
const { getTimelineState, configureViewerClock } = await import('../src/cesium/route/timeline.js');
const { TRUCK_ROUTE_WAYPOINTS } = await import('../src/cesium/route/waypoints.js');
const { addMineTruck } = await import('../src/cesium/mine-truck.js');
const { runOrientationBenchmarks } = await import('../src/cesium/route/orientation-benchmarks.js');

const geometry = buildRouteGeometry(TRUCK_ROUTE_WAYPOINTS, 8);
// Synthetic elevation exercises grade handling without requiring an ion account.
const heights = geometry.samples.map(s => 4500 + 0.025 * s.distanceFromStart);
const route = addTerrainHeights(geometry, heights, heights, 0.8);
const fleet = buildFleetTimelines(route);
const viewer = { entities: new C.EntityCollection(), clock: new C.Clock() };
configureViewerClock(viewer, fleet[0].timeline);
const start = viewer.clock.startTime;
const at = seconds => C.JulianDate.addSeconds(start, seconds, new C.JulianDate());
const finish = Math.max(...fleet.map(v => v.departureSeconds + v.timeline.totalDurationSeconds));
assert.deepEqual(fleet.map(v => v.destination), ['P6', 'P5', 'P4']);
assert.deepEqual(fleet.map(v => v.departureSeconds), [0, 12, 24]);
for (const v of fleet) {
  v.timeline.startTime = at(v.departureSeconds);
  v.entity = addMineTruck(viewer, v.timeline, v);
  assert.ok(v.entity.isAvailable(at(v.departureSeconds)));
  if (v.departureSeconds) assert.equal(v.entity.isAvailable(at(v.departureSeconds - 0.01)), false);
  const destinationIndex = TRUCK_ROUTE_WAYPOINTS.findIndex(p => p.id === v.destination);
  const expected = route.waypointPositions[destinationIndex];
  for (const seconds of [v.departureSeconds + v.timeline.totalDurationSeconds, finish + 120]) {
    assert.ok(C.Cartesian3.distance(v.entity.position.getValue(at(seconds)), expected) < 0.001);
    const q = v.entity.orientation.getValue(at(seconds));
    assert.ok([q.x, q.y, q.z, q.w].every(Number.isFinite));
  }
  for (const event of v.timeline.events.filter(e => e.phase === 'TURN')) {
    const a = v.entity.position.getValue(at(v.departureSeconds + event.startSeconds));
    const b = v.entity.position.getValue(at(v.departureSeconds + event.endSeconds));
    assert.ok(C.Cartesian3.distance(a, b) < 0.001, 'Turn must remain stationary');
  }
}
let minimumSeparation = Infinity;
for (let seconds = 0; seconds <= finish + 5; seconds += 0.1) {
  const active = fleet.filter(v => v.entity.isAvailable(at(seconds)));
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const distance = C.Cartesian3.distance(active[i].entity.position.getValue(at(seconds)), active[j].entity.position.getValue(at(seconds)));
    minimumSeparation = Math.min(minimumSeparation, distance);
    assert.ok(distance > 20, `Vehicles too close at ${seconds}: ${distance}m`);
  }
}
for (const benchmark of runOrientationBenchmarks(90)) {
  const forward = benchmark.results.find(result => result.offsetDegrees === 90).forwardBearingDegrees;
  assert.ok(Math.abs(((forward - benchmark.bearingDegrees + 540) % 360) - 180) < 0.001);
}
const assets = [];
for (const v of fleet.slice(1)) {
  const bytes = fs.readFileSync(new URL('../public' + v.uri, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(gltf.scene);
  assert.ok(Math.abs(box.min.y) < 0.01, 'Model origin must be at ground level');
  assert.ok(box.max.z - box.min.z > 8 && box.max.z - box.min.z < 11);
  assets.push({ uri: v.uri, groundY: box.min.y, lengthMeters: box.max.z - box.min.z });
}
console.log(JSON.stringify({ status: 'PASS', cesium: C.VERSION, terrain: 'synthetic grade on actual waypoint coordinates', minimumSeparationMeters: minimumSeparation, vehicles: fleet.map(v => ({ id: v.id, departure: v.departureSeconds, destination: v.destination, arrival: v.departureSeconds + v.timeline.totalDurationSeconds })), assets }, null, 2));
