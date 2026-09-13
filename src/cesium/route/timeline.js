const Cesium = globalThis.Cesium;

export const ROUTE_PHASE = Object.freeze({
  DRIVE: 'DRIVE',
  TURN: 'TURN',
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

export function shortestHeadingDeltaDegrees(from, to) {
  return ((to - from + 540) % 360) - 180;
}

export function interpolateHeadingDegrees(from, to, fraction) {
  return ((
    from + shortestHeadingDeltaDegrees(from, to) * clamp(fraction, 0, 1)
  ) % 360 + 360) % 360;
}

export function buildDriveTurnTimeline(
  route,
  speedMetersPerSecond,
  turnDurationSeconds,
) {
  if (speedMetersPerSecond <= 0) {
    throw new Error('Truck speed 必须大于 0。');
  }

  const events = [];
  let currentSeconds = 0;

  route.segments.forEach((segment, segmentIndex) => {
    const driveDurationSeconds =
      segment.distanceMeters / speedMetersPerSecond;
    events.push({
      phase: ROUTE_PHASE.DRIVE,
      segmentIndex,
      startSeconds: currentSeconds,
      endSeconds: currentSeconds + driveDurationSeconds,
      startDistanceMeters: segment.startDistance,
      endDistanceMeters: segment.endDistance,
      bearingDegrees: segment.bearingDegrees,
    });
    currentSeconds += driveDurationSeconds;

    if (segmentIndex < route.segments.length - 1) {
      const nextSegment = route.segments[segmentIndex + 1];
      events.push({
        phase: ROUTE_PHASE.TURN,
        waypointIndex: segment.toWaypointIndex,
        startSeconds: currentSeconds,
        endSeconds: currentSeconds + turnDurationSeconds,
        distanceMeters: segment.endDistance,
        previousBearingDegrees: segment.bearingDegrees,
        nextBearingDegrees: nextSegment.bearingDegrees,
      });
      currentSeconds += turnDurationSeconds;
    }
  });

  return {
    route,
    speedMetersPerSecond,
    turnDurationSeconds,
    events,
    totalDurationSeconds: currentSeconds,
  };
}

export function getSecondsAtDistance(timeline, distanceMeters) {
  const distance = clamp(
    distanceMeters,
    0,
    timeline.route.totalDistanceMeters,
  );
  for (const event of timeline.events) {
    if (
      event.phase === ROUTE_PHASE.DRIVE &&
      distance <= event.endDistanceMeters
    ) {
      return (
        event.startSeconds +
        (distance - event.startDistanceMeters) /
          timeline.speedMetersPerSecond
      );
    }
  }
  return timeline.totalDurationSeconds;
}

export function getTimelineState(timeline, elapsedSeconds) {
  const seconds = clamp(elapsedSeconds, 0, timeline.totalDurationSeconds);
  let event = timeline.events[timeline.events.length - 1];

  for (const candidate of timeline.events) {
    if (seconds < candidate.endSeconds) {
      event = candidate;
      break;
    }
  }

  if (event.phase === ROUTE_PHASE.DRIVE) {
    const driveElapsed = seconds - event.startSeconds;
    return {
      phase: ROUTE_PHASE.DRIVE,
      event,
      distanceMeters: Math.min(
        event.endDistanceMeters,
        event.startDistanceMeters +
          driveElapsed * timeline.speedMetersPerSecond,
      ),
      headingDegrees: event.bearingDegrees,
    };
  }

  const turnDuration = event.endSeconds - event.startSeconds;
  const turnFraction = turnDuration === 0
    ? 1
    : (seconds - event.startSeconds) / turnDuration;
  return {
    phase: ROUTE_PHASE.TURN,
    event,
    distanceMeters: event.distanceMeters,
    headingDegrees: interpolateHeadingDegrees(
      event.previousBearingDegrees,
      event.nextBearingDegrees,
      turnFraction,
    ),
  };
}

export function configureViewerClock(viewer, timeline) {
  const startTime = Cesium.JulianDate.now();
  const stopTime = Cesium.JulianDate.addSeconds(
    startTime,
    timeline.totalDurationSeconds,
    new Cesium.JulianDate(),
  );

  timeline.startTime = Cesium.JulianDate.clone(startTime);
  viewer.clock.startTime = Cesium.JulianDate.clone(startTime);
  viewer.clock.stopTime = Cesium.JulianDate.clone(stopTime);
  viewer.clock.currentTime = Cesium.JulianDate.clone(startTime);
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
}
