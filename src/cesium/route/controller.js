import { addMineTruck } from '../mine-truck.js';
import { buildFleetTimelines } from './fleet.js';
import {
  buildRouteGeometry,
} from './preprocess.js';
import {
  configureViewerClock,
  buildDriveTurnTimeline,
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
} from './waypoints.js';
import { addRouteVisualization } from './visualization.js';
import {
  CESIUM_CORRECTED_FORWARD_AXIS,
  GLB_LOCAL_FORWARD_AXIS,
  runOrientationBenchmarks,
} from './orientation-benchmarks.js';

export async function initializeTruckRoute(viewer, onStatus = () => {}) {
  onStatus('XDE240 · 正在生成路线采样点…');
  const geometry = buildRouteGeometry(
    TRUCK_ROUTE_WAYPOINTS,
    ROUTE_SAMPLE_SPACING_METERS,
  );

  onStatus(
    `XDE240 · 正在采样 World Terrain（${geometry.samples.length} 个点）…`,
  );
  const route = await sampleRouteTerrain(
    viewer,
    geometry,
    VEHICLE_GROUND_OFFSET_METERS,
  );
  if (viewer.isDestroyed()) return;

  const timeline = buildDriveTurnTimeline(
    route,
    TRUCK_SPEED_METERS_PER_SECOND,
    TURN_DURATION_SECONDS,
  );
  configureViewerClock(viewer, timeline);
  const fleet = buildFleetTimelines(route);
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

  const visualization = addRouteVisualization(
    viewer,
    route,
    SHOW_ROUTE_DEBUG_MARKERS,
  );
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
    timeline,
    truckEntity,
    fleet,
    visualization,
  };
}
