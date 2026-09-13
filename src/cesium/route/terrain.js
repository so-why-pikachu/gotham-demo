const Cesium = globalThis.Cesium;

import {
  addTerrainHeights,
  cartographicFromSample,
} from './preprocess.js';
import { TERRAIN_SMOOTHING_RADIUS_SAMPLES } from './waypoints.js';

const TERRAIN_READY_TIMEOUT_MS = 30_000;

export function waitForWorldTerrainProvider(viewer) {
  const currentProvider = viewer.terrainProvider;
  if (currentProvider?.availability) {
    return Promise.resolve(currentProvider);
  }

  return new Promise((resolve, reject) => {
    let removeListener;
    let timeoutId;
    let settled = false;

    function finish(callback, value) {
      if (settled) {
        return;
      }
      settled = true;
      if (removeListener) {
        removeListener();
      }
      clearTimeout(timeoutId);
      callback(value);
    }

    function checkProvider() {
      const provider = viewer.terrainProvider;
      if (provider?.availability) {
        finish(resolve, provider);
      }
    }

    removeListener = viewer.scene.globe.terrainProviderChanged.addEventListener(
      checkProvider,
    );
    timeoutId = setTimeout(() => {
      finish(
        reject,
        new Error('等待 Cesium World Terrain 就绪超时。'),
      );
    }, TERRAIN_READY_TIMEOUT_MS);
    checkProvider();
  });
}

export function smoothTerrainHeights(heights, radius = 1) {
  return heights.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(heights.length - 1, index + radius);
    let total = 0;
    for (let i = start; i <= end; i += 1) {
      total += heights[i];
    }
    return total / (end - start + 1);
  });
}

export async function sampleRouteTerrain(
  viewer,
  route,
  groundOffsetMeters,
) {
  const terrainProvider = await waitForWorldTerrainProvider(viewer);
  const positions = route.samples.map(cartographicFromSample);

  // World Terrain 的每个 route sample 都使用最高可用层级采样。
  await Cesium.sampleTerrainMostDetailed(terrainProvider, positions, true);
  const rawTerrainHeights = positions.map((position) => position.height);
  const smoothedTerrainHeights = smoothTerrainHeights(
    rawTerrainHeights,
    TERRAIN_SMOOTHING_RADIUS_SAMPLES,
  );
  return addTerrainHeights(
    route,
    rawTerrainHeights,
    smoothedTerrainHeights,
    groundOffsetMeters,
  );
}
