const Cesium = globalThis.Cesium;

const RADIANS_TO_DEGREES = 180 / Math.PI;

export function normalizeHeadingDegrees(heading) {
  return ((heading % 360) + 360) % 360;
}

// 使用 Cesium 的 WGS84 EllipsoidGeodesic 自动计算从北向顺时针的 bearing。
export function calculateBearingDegrees(from, to) {
  const geodesic = new Cesium.EllipsoidGeodesic(from, to);
  return normalizeHeadingDegrees(
    geodesic.startHeading * RADIANS_TO_DEGREES,
  );
}

export function buildRouteGeometry(waypoints, sampleSpacingMeters) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('Truck route 至少需要两个 waypoint。');
  }

  const samples = [];
  const segments = [];
  const waypointDistances = [0];
  let cumulativeDistance = 0;

  for (let segmentIndex = 0; segmentIndex < waypoints.length - 1; segmentIndex += 1) {
    const from = Cesium.Cartographic.fromDegrees(
      waypoints[segmentIndex].longitude,
      waypoints[segmentIndex].latitude,
      0,
    );
    const to = Cesium.Cartographic.fromDegrees(
      waypoints[segmentIndex + 1].longitude,
      waypoints[segmentIndex + 1].latitude,
      0,
    );
    const geodesic = new Cesium.EllipsoidGeodesic(from, to);
    const distanceMeters = geodesic.surfaceDistance;
    const sampleCount = Math.max(
      1,
      Math.ceil(distanceMeters / sampleSpacingMeters),
    );
    const bearingDegrees = calculateBearingDegrees(from, to);
    const startDistance = cumulativeDistance;

    segments.push({
      segmentIndex,
      fromWaypointIndex: segmentIndex,
      toWaypointIndex: segmentIndex + 1,
      distanceMeters,
      startDistance,
      endDistance: startDistance + distanceMeters,
      bearingDegrees,
      sampleCount,
    });

    for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
      // 相邻线段共享 waypoint，避免重复采样和重复插值点。
      if (segmentIndex > 0 && sampleIndex === 0) {
        continue;
      }

      const fraction = sampleIndex / sampleCount;
      const cartographic = geodesic.interpolateUsingFraction(
        fraction,
        new Cesium.Cartographic(),
      );
      samples.push({
        segmentIndex,
        fraction,
        distanceFromStart: startDistance + distanceMeters * fraction,
        longitude: cartographic.longitude,
        latitude: cartographic.latitude,
      });
    }

    cumulativeDistance += distanceMeters;
    waypointDistances.push(cumulativeDistance);
  }

  return {
    waypoints,
    samples,
    segments,
    waypointDistances,
    totalDistanceMeters: cumulativeDistance,
    sampleSpacingMeters,
  };
}

export function getPositionAtDistance(route, distanceMeters, result) {
  const distance = Math.max(
    0,
    Math.min(distanceMeters, route.totalDistanceMeters),
  );
  const samples = route.samples;

  if (distance <= samples[0].distanceFromStart) {
    return Cesium.Cartesian3.clone(samples[0].position, result);
  }
  if (distance >= samples[samples.length - 1].distanceFromStart) {
    return Cesium.Cartesian3.clone(
      samples[samples.length - 1].position,
      result,
    );
  }

  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].distanceFromStart <= distance) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const before = samples[low];
  const after = samples[high];
  const span = after.distanceFromStart - before.distanceFromStart;
  const fraction = span === 0 ? 0 : (distance - before.distanceFromStart) / span;
  return Cesium.Cartesian3.lerp(
    before.position,
    after.position,
    fraction,
    result ?? new Cesium.Cartesian3(),
  );
}

export function cartographicFromSample(sample) {
  return Cesium.Cartographic.fromRadians(
    sample.longitude,
    sample.latitude,
    0,
  );
}

export function getPitchAtDistance(route, distanceMeters) {
  const distance = Math.max(
    0,
    Math.min(distanceMeters, route.totalDistanceMeters),
  );
  const samples = route.samples;
  if (distance <= samples[0].distanceFromStart) {
    return samples[0].pitchDegrees;
  }
  if (distance >= samples[samples.length - 1].distanceFromStart) {
    return samples[samples.length - 1].pitchDegrees;
  }

  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].distanceFromStart <= distance) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const before = samples[low];
  const after = samples[high];
  const span = after.distanceFromStart - before.distanceFromStart;
  const fraction = span === 0 ? 0 : (distance - before.distanceFromStart) / span;
  return before.pitchDegrees + (after.pitchDegrees - before.pitchDegrees) * fraction;
}

export function addTerrainHeights(
  route,
  rawTerrainHeights,
  smoothedTerrainHeights,
  groundOffsetMeters,
) {
  const samples = route.samples.map((sample, index) => {
    const rawTerrainHeight = rawTerrainHeights[index];
    const terrainHeight = smoothedTerrainHeights[index];
    if (!Number.isFinite(rawTerrainHeight) || !Number.isFinite(terrainHeight)) {
      throw new Error(`路线采样点 ${index} 没有有效的 terrain height。`);
    }

    const height = terrainHeight + groundOffsetMeters;
    return {
      ...sample,
      rawTerrainHeight,
      terrainHeight,
      height,
      position: Cesium.Cartesian3.fromRadians(
        sample.longitude,
        sample.latitude,
        height,
      ),
    };
  });

  // 用相邻 3D sample 的高度变化计算道路坡度，正值表示上坡。
  samples.forEach((sample, index) => {
    const before = samples[Math.max(0, index - 1)];
    const after = samples[Math.min(samples.length - 1, index + 1)];
    const horizontalDistance = Math.max(
      after.distanceFromStart - before.distanceFromStart,
      0.001,
    );
    sample.pitchDegrees =
      Math.atan2(after.height - before.height, horizontalDistance) *
      RADIANS_TO_DEGREES;
  });

  const completedRoute = {
    ...route,
    samples,
    vehicleGroundOffsetMeters: groundOffsetMeters,
    rawTerrainHeightMin: Math.min(...rawTerrainHeights),
    rawTerrainHeightMax: Math.max(...rawTerrainHeights),
    terrainHeightMin: Math.min(...smoothedTerrainHeights),
    terrainHeightMax: Math.max(...smoothedTerrainHeights),
  };

  return {
    ...completedRoute,
    waypointPositions: route.waypointDistances.map((distance) =>
      getPositionAtDistance(completedRoute, distance),
    ),
    waypointPitches: route.waypointDistances.map((distance) =>
      getPitchAtDistance(completedRoute, distance),
    ),
  };
}

