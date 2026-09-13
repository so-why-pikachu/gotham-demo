const Cesium = globalThis.Cesium;

const RADIANS_TO_DEGREES = 180 / Math.PI;
const DEGREES_TO_RADIANS = Math.PI / 180;

// glTF 几何检查结果：车头朝本地 -Z；Cesium 默认 glTF 轴修正后，
// 这个实际车头向量在 ENU heading frame 中等效为 -X。
export const GLB_LOCAL_FORWARD_AXIS = '-Z';
export const CESIUM_CORRECTED_FORWARD_AXIS = '-X';

function normalizeHeadingDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function forwardBearingForCesiumHeading(headingDegrees) {
  const hpr = new Cesium.HeadingPitchRoll(
    headingDegrees * DEGREES_TO_RADIANS,
    0,
    0,
  );
  const quaternion = Cesium.Quaternion.fromHeadingPitchRoll(hpr);
  const rotation = Cesium.Matrix3.fromQuaternion(quaternion);
  const forward = Cesium.Matrix3.multiplyByVector(
    rotation,
    new Cesium.Cartesian3(-1, 0, 0),
    new Cesium.Cartesian3(),
  );

  return normalizeHeadingDegrees(
    Math.atan2(forward.x, forward.y) * RADIANS_TO_DEGREES,
  );
}

function calculateBenchmarkBearing(from, to) {
  const geodesic = new Cesium.EllipsoidGeodesic(from, to);
  return normalizeHeadingDegrees(geodesic.startHeading * RADIANS_TO_DEGREES);
}

// 临时基准路线：一条正北、一条正东。它们不加入真实路线，只验证
// bearing(0°=北，90°=东) 经过 HPR 后实际旋转出的 GLB 车头方向。
export function runOrientationBenchmarks(modelHeadingOffset) {
  const northFrom = Cesium.Cartographic.fromDegrees(100, 30);
  const northTo = Cesium.Cartographic.fromDegrees(100, 30.001);
  const eastFrom = Cesium.Cartographic.fromDegrees(100, 30);
  const eastTo = Cesium.Cartographic.fromDegrees(100.001, 30);
  const cases = [
    {
      id: 'north',
      from: northFrom,
      to: northTo,
      bearingDegrees: calculateBenchmarkBearing(northFrom, northTo),
    },
    {
      id: 'east',
      from: eastFrom,
      to: eastTo,
      bearingDegrees: calculateBenchmarkBearing(eastFrom, eastTo),
    },
  ];
  const offsets = [0, 90, -90];

  return cases.map((testCase) => ({
    id: testCase.id,
    bearingDegrees: testCase.bearingDegrees,
    results: offsets.map((offset) => ({
      offsetDegrees: offset,
      forwardBearingDegrees: forwardBearingForCesiumHeading(
        testCase.bearingDegrees + offset,
      ),
    })),
    selectedOffsetDegrees: modelHeadingOffset,
    selectedForwardBearingDegrees: forwardBearingForCesiumHeading(
      testCase.bearingDegrees + modelHeadingOffset,
    ),
  }));
}
