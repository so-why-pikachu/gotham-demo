import { createTruckMotion } from './route/motion.js';
import { MODEL_HEADING_OFFSET } from './route/waypoints.js';

const Cesium = globalThis.Cesium;

export const MINE_TRUCK_MODEL_URI = '/models/mine_truck.glb';
export const MINE_TRUCK_MAX_DISPLAY_DISTANCE_METERS = 30_000;

// 保留一个统一出口，后续只调整 MODEL_HEADING_OFFSET 即可补偿 GLB 前向轴。
export const MINE_TRUCK_HEADING_OFFSET = MODEL_HEADING_OFFSET;

export function addMineTruck(viewer, routeTimeline, vehicle = {}) {
  const motion = createTruckMotion(routeTimeline);

  return viewer.entities.add({
    id: vehicle.id ?? 'truck-01',
    name: vehicle.name ?? 'XDE240',
    // Waiting vehicles enter at departure instead of overlapping at P1.
    availability: vehicle.departureSeconds > 0
      ? new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
        start: routeTimeline.startTime,
        stop: Cesium.Iso8601.MAXIMUM_VALUE,
      })])
      : undefined,
    // position 使用完整 3D terrain samples；TURN 期间由重复 waypoint sample 保持不动。
    position: motion.positionProperty,
    orientation: new Cesium.CallbackProperty(
      (time, result) => motion.getOrientation(time, result),
      false,
    ),
    model: {
      uri: vehicle.uri ?? MINE_TRUCK_MODEL_URI,
      // Blender 使用 1 unit = 1 meter，保留真实 GLB 尺寸。
      scale: 1.0,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        0,
        MINE_TRUCK_MAX_DISPLAY_DISTANCE_METERS,
      ),
      // 位置已经使用 World Terrain height + ground offset，不能再重复 Clamp。
      heightReference: Cesium.HeightReference.NONE,
      runAnimations: false,
      shadows: Cesium.ShadowMode.ENABLED,
    },
  });
}

export function zoomToMineTruck(viewer, truckEntity) {
  return viewer.zoomTo(truckEntity);
}
