import { CHINA_VIEW, YULONG_VIEW } from './locations.js';

const Cesium = globalThis.Cesium;

function toCameraOptions(view) {
  return {
    destination: Cesium.Cartesian3.fromDegrees(
      view.longitude,
      view.latitude,
      view.height,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(view.heading),
      pitch: Cesium.Math.toRadians(view.pitch),
      roll: Cesium.Math.toRadians(view.roll),
    },
  };
}

// 页面首次打开时直接设置全国视角，避免用户先看到 Cesium 默认视角。
export function setChinaView(viewer) {
  viewer.camera.setView(toCameraOptions(CHINA_VIEW));
}

export function flyToChina(viewer) {
  viewer.camera.cancelFlight();
  return viewer.camera.flyTo({
    ...toCameraOptions(CHINA_VIEW),
    duration: 1.8,
  });
}

export function flyToYulong(viewer) {
  viewer.camera.cancelFlight();
  return viewer.camera.flyTo({
    ...toCameraOptions(YULONG_VIEW),
    duration: 2,
  });
}

// 新增矿山复用玉龙的局部观察尺度，不改变原有 flyToYulong 行为。
export function flyToMine(viewer, mine) {
  viewer.camera.cancelFlight();
  return viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      mine.longitude,
      mine.latitude,
      YULONG_VIEW.height,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(YULONG_VIEW.heading),
      pitch: Cesium.Math.toRadians(YULONG_VIEW.pitch),
      roll: Cesium.Math.toRadians(YULONG_VIEW.roll),
    },
    duration: 2,
  });
}
