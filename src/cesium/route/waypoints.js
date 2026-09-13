// Truck-01 的路线数据和运动参数，保持经度在前、纬度在后。
export const TRUCK_ROUTE_WAYPOINTS = Object.freeze([
  Object.freeze({ id: 'P1', longitude: 97.73740506, latitude: 31.41123402 }),
  Object.freeze({ id: 'P2', longitude: 97.73690617, latitude: 31.41215882 }),
  Object.freeze({ id: 'P3', longitude: 97.73617846, latitude: 31.4132432 }),
  Object.freeze({ id: 'P4', longitude: 97.73550254, latitude: 31.41371933 }),
  Object.freeze({ id: 'P5', longitude: 97.73450476, latitude: 31.4133897 }),
  Object.freeze({ id: 'P6', longitude: 97.73328347, latitude: 31.41186081 }),
]);

export const TRUCK_SPEED_METERS_PER_SECOND = 10;
export const ROUTE_SAMPLE_SPACING_METERS = 8;
export const TERRAIN_SMOOTHING_RADIUS_SAMPLES = 1;
export const VEHICLE_GROUND_OFFSET_METERS = 0.8;
export const TURN_DURATION_SECONDS = 1.0;

// mine_truck.glb 的实际车头为本地 -Z；Cesium 默认轴修正后等效为 -X。
// 统一测试 +90° / -90° 后，+90° 使 bearing(0°=北，90°=东) 对齐车头。
export const MODEL_HEADING_OFFSET = 90;
export const MODEL_HEADING_OFFSET_DEGREES = MODEL_HEADING_OFFSET;

export const SHOW_ROUTE_DEBUG_MARKERS = false;
