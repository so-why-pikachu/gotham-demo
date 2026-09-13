const Cesium = globalThis.Cesium;

import {
  getPitchAtDistance,
  getPositionAtDistance,
} from './preprocess.js';
import {
  getSecondsAtDistance,
  getTimelineState,
  ROUTE_PHASE,
} from './timeline.js';
import { MODEL_HEADING_OFFSET } from './waypoints.js';

function addTimedSample(property, startTime, seconds, position) {
  const time = Cesium.JulianDate.addSeconds(
    startTime,
    seconds,
    new Cesium.JulianDate(),
  );
  property.addSample(time, position);
}

function buildSampledPositionProperty(timeline) {
  const property = new Cesium.SampledPositionProperty();

  timeline.route.samples.forEach((sample) => {
    addTimedSample(
      property,
      timeline.startTime,
      getSecondsAtDistance(timeline, sample.distanceFromStart),
      sample.position,
    );
  });

  // DRIVE 结束时已经到达 waypoint；再添加一个相同位置的 TURN 结束样本，
  // SampledPositionProperty 会在整个转向期间保持位置不动。
  timeline.events.forEach((event) => {
    if (event.phase !== ROUTE_PHASE.TURN) {
      return;
    }
    const waypointPosition = getPositionAtDistance(
      timeline.route,
      event.distanceMeters,
    );
    addTimedSample(
      property,
      timeline.startTime,
      event.endSeconds,
      waypointPosition,
    );
  });

  property.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  property.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  property.setInterpolationOptions({
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation,
  });
  return property;
}

export function createTruckMotion(timeline) {
  const positionProperty = buildSampledPositionProperty(timeline);
  const positionScratch = new Cesium.Cartesian3();
  const headingPitchRoll = new Cesium.HeadingPitchRoll(0, 0, 0);

  function elapsedSeconds(time) {
    if (!time || !timeline.startTime) {
      return 0;
    }
    return Cesium.JulianDate.secondsDifference(time, timeline.startTime);
  }

  function getState(time) {
    return getTimelineState(timeline, elapsedSeconds(time));
  }

  return {
    positionProperty,
    getState,

    // Position 使用完整 terrain-sampled 3D 路线的 SampledPositionProperty。
    getPosition(time, result) {
      return (
        positionProperty.getValue(time, result) ??
        getPositionAtDistance(timeline.route, 0, result)
      );
    },

    // Orientation 单独回调：DRIVE 随路线坡度改变 pitch，TURN 只平滑旋转 heading。
    getOrientation(time, result) {
      const state = getState(time);
      const position =
        positionProperty.getValue(time, positionScratch) ??
        getPositionAtDistance(timeline.route, state.distanceMeters, positionScratch);
      const pitchDegrees =
        state.phase === ROUTE_PHASE.TURN
          ? timeline.route.waypointPitches[state.event.waypointIndex]
          : getPitchAtDistance(timeline.route, state.distanceMeters);

      headingPitchRoll.heading = Cesium.Math.toRadians(
        state.headingDegrees + MODEL_HEADING_OFFSET,
      );
      // Cesium 轴修正后 GLB 车头为 -X；对该前向轴，正的道路坡度
      // 需要使用负的 HPR pitch 才表示车头上仰。
      headingPitchRoll.pitch = Cesium.Math.toRadians(-pitchDegrees);
      headingPitchRoll.roll = 0;

      return Cesium.Transforms.headingPitchRollQuaternion(
        position,
        headingPitchRoll,
        Cesium.Ellipsoid.WGS84,
        undefined,
        result,
      );
    },
  };
}
