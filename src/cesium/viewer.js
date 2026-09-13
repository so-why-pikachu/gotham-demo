const Cesium = globalThis.Cesium;

export function createViewer(creditContainer) {
  if (!Cesium) {
    throw new Error('Cesium 没有成功加载，请检查 CDN 网络连接。');
  }

  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();
  if (!ionToken) {
    throw new Error(
      '缺少 VITE_CESIUM_ION_TOKEN，请在 gotham-demo/.env.local 中配置。',
    );
  }

  // Cesium ion token 只从 Vite 环境变量读取，不写入源码。
  Cesium.Ion.defaultAccessToken = ionToken;

  const viewer = new Cesium.Viewer('cesiumContainer', {
    // 将归属信息放到 Gotham 场景中的独立容器，避免被底部抽屉遮挡。
    creditContainer,
    // Cesium World Imagery 的 AERIAL 样式对应 ion 的默认卫星影像。
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.createWorldImageryAsync({
        style: Cesium.IonWorldImageryStyle.AERIAL,
      }),
    ),
    // World Terrain 同样通过 Cesium ion 异步加载。
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: false,
  });

  return viewer;
}
