import { addMineTruck } from '../mine-truck.js';
import { buildFleetTimelines } from './fleet.js';
import {
  buildRouteGeometry,
} from './preprocess.js';
import {
  configureViewerClock,
  buildDriveTurnTimeline,
  getTimelineState,
} from './timeline.js';
import { sampleRouteTerrain } from './terrain.js';
import {
  ROUTE_SAMPLE_SPACING_METERS,
  SHOW_ROUTE_DEBUG_MARKERS,
  TRUCK_ROUTE_WAYPOINTS,
  TRUCK_SPEED_METERS_PER_SECOND,
  TURN_DURATION_SECONDS,
  VEHICLE_GROUND_OFFSET_METERS,
  MODEL_HEADING_OFFSET,
  MINE_ROUTES,
} from './waypoints.js';
import { addRouteVisualization } from './visualization.js';
import {
  CESIUM_CORRECTED_FORWARD_AXIS,
  GLB_LOCAL_FORWARD_AXIS,
  runOrientationBenchmarks,
} from './orientation-benchmarks.js';

export async function initializeTruckRoute(viewer, onStatus = () => {}) {
  onStatus('XDE240 · 正在生成路线采样点…');
  const routes = {};
  for (const definition of MINE_ROUTES) {
    onStatus(`${definition.name} · 正在采样地形…`);
    routes[definition.id] = await sampleRouteTerrain(viewer,
      buildRouteGeometry(definition.waypoints, ROUTE_SAMPLE_SPACING_METERS),
      VEHICLE_GROUND_OFFSET_METERS);
    if (viewer.isDestroyed()) return;
  }
  const route = routes.main;
  if (viewer.isDestroyed()) return;

  const timeline = buildDriveTurnTimeline(
    route,
    TRUCK_SPEED_METERS_PER_SECOND,
    TURN_DURATION_SECONDS,
  );
  configureViewerClock(viewer, timeline);
  const fleet = buildFleetTimelines(routes);
  for (const vehicle of fleet) {
    vehicle.timeline.startTime = globalThis.Cesium.JulianDate.addSeconds(
      timeline.startTime, vehicle.departureSeconds, new globalThis.Cesium.JulianDate(),
    );
  }
  viewer.clock.stopTime = globalThis.Cesium.JulianDate.addSeconds(
    timeline.startTime,
    Math.max(...fleet.map(vehicle => vehicle.departureSeconds + vehicle.timeline.totalDurationSeconds)),
    new globalThis.Cesium.JulianDate(),
  );

  const orientationBenchmarks = runOrientationBenchmarks(MODEL_HEADING_OFFSET);
  const debugInfo = {
    glbLocalForwardAxis: GLB_LOCAL_FORWARD_AXIS,
    cesiumCorrectedForwardAxis: CESIUM_CORRECTED_FORWARD_AXIS,
    modelHeadingOffsetDegrees: MODEL_HEADING_OFFSET,
    orientationBenchmarks,
    sampleCount: route.samples.length,
    sampleSpacingMeters: ROUTE_SAMPLE_SPACING_METERS,
    rawTerrainHeightMin: route.rawTerrainHeightMin,
    rawTerrainHeightMax: route.rawTerrainHeightMax,
    smoothedTerrainHeightMin: route.terrainHeightMin,
    smoothedTerrainHeightMax: route.terrainHeightMax,
    vehicleGroundOffsetMeters: VEHICLE_GROUND_OFFSET_METERS,
    speedMetersPerSecond: TRUCK_SPEED_METERS_PER_SECOND,
    turnDurationSeconds: TURN_DURATION_SECONDS,
    totalDistanceMeters: route.totalDistanceMeters,
    totalDurationSeconds: timeline.totalDurationSeconds,
    segments: route.segments.map((segment) => ({
      from: TRUCK_ROUTE_WAYPOINTS[segment.fromWaypointIndex].id,
      to: TRUCK_ROUTE_WAYPOINTS[segment.toWaypointIndex].id,
      distanceMeters: segment.distanceMeters,
      bearingDegrees: segment.bearingDegrees,
    })),
  };
  globalThis.__TRUCK_ROUTE_DEBUG__ = debugInfo;
  console.info('XDE240 route prepared', debugInfo);

  const routeVisuals = MINE_ROUTES.map(definition => addRouteVisualization(
    viewer, routes[definition.id], SHOW_ROUTE_DEBUG_MARKERS, definition.id, definition.name));
  const C = globalThis.Cesium;
  let visible = true, selected;
  const destination = viewer.entities.add({id:'guidance-destination',show:false,
    point:{pixelSize:10,color:C.Color.WHITE,outlineColor:C.Color.fromCssColorString('#203820'),outlineWidth:3,disableDepthTestDistance:Infinity}});
  function updateGuidance() {
    routeVisuals.forEach((v,i)=>{
      const routeId=MINE_ROUTES[i].id;
      v.setShow(visible && (!selected || (selected.routeId??'main')===routeId));
      if (selected && (selected.routeId??'main')===routeId) {
        const vehicle = selected;
        v.entities[0].polyline.positions = new C.CallbackProperty(time => {
          const clockTime = time ?? viewer.clock.currentTime;
          const elapsed = C.JulianDate.secondsDifference(clockTime, vehicle.timeline.startTime);
          if (elapsed >= vehicle.timeline.totalDurationSeconds) return [];
          const position = vehicle.entity?.position.getValue(clockTime);
          if (!position) return [];
          const distance = getTimelineState(vehicle.timeline, elapsed).distanceMeters;
          const remaining = vehicle.timeline.route.samples
            .filter(sample => sample.distanceFromStart > distance)
            .map(sample => sample.position);
          // Exact live position avoids revealing the previous sample behind the vehicle.
          return remaining.length ? [C.Cartesian3.clone(position), ...remaining] : [];
        }, false);
      } else {
        v.entities[0].polyline.positions = routes[routeId].samples.map(s=>s.position);
      }
    });
    destination.show=visible && !!selected;
    if(selected) destination.position=selected.timeline.route.waypointPositions.at(-1);
  }
  const visualization = {
    setShow(show) {visible=show;updateGuidance();},
    setSelected(id) {const next=fleet.find(v=>v.id===id);if(next===selected)return;selected=next;updateGuidance();},
  };
  for (const vehicle of fleet) vehicle.entity = addMineTruck(viewer, vehicle.timeline, vehicle);
  const truckEntity = fleet[0].entity;
  globalThis.__TRUCK_ROUTE_DEBUG__.truckEntity = truckEntity;
  globalThis.__TRUCK_ROUTE_DEBUG__.timeline = timeline;
  globalThis.__TRUCK_ROUTE_DEBUG__.fleet = fleet;

  onStatus(
    `XDE240 · ${TRUCK_SPEED_METERS_PER_SECOND} m/s · DRIVE/TURN 路线已开始`,
  );

  return {
    route,
    routes,
    timeline,
    truckEntity,
    fleet,
    visualization,
  };
}
