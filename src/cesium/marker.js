import { YULONG_MINE } from './locations.js';

const Cesium = globalThis.Cesium;
const REMOTE_MARKER_MIN_DISTANCE_METERS = 30_000;
const REMOTE_MARKER_MAX_DISTANCE_METERS = Number.POSITIVE_INFINITY;
export const YULONG_MARKER_HEIGHT_ABOVE_GROUND_METERS = 25;

const WARNING_RING = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" fill="none" stroke="white" stroke-width="2"/></svg>');

function warningBillboard(minimumDisplayDistance) {
  const start = performance.now();
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const progress = () => ((performance.now() - start) % 2400) / 2400;
  return {
    image: WARNING_RING,
    width: 96, height: 96,
    scale: new Cesium.CallbackProperty(() => reducedMotion ? .55 : .18 + progress() * .92, false),
    color: new Cesium.CallbackProperty(() => Cesium.Color.fromCssColorString('#ff5656').withAlpha(reducedMotion ? .55 : .85 * (1 - progress())), false),
    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(minimumDisplayDistance, REMOTE_MARKER_MAX_DISTANCE_METERS),
  };
}

function getMarkerColor(markerColor) {
  // Resolve colors only when a viewer exists; a failed CDN must not block other tabs.
  const MARKER_COLORS = {
    red: Cesium.Color.RED,
    yellow: Cesium.Color.YELLOW,
    blue: Cesium.Color.BLUE,
  };
  return MARKER_COLORS[markerColor] ?? Cesium.Color.RED;
}

export function addMineMarker(
  viewer,
  mine,
  { minimumDisplayDistance = REMOTE_MARKER_MIN_DISTANCE_METERS } = {},
) {
  // Entity 是 Cesium 中组合位置、点和文字的基础对象。
  const marker = viewer.entities.add({
    id: mine.id,
    name: mine.name,
    description: `${mine.name}<br>地区：${mine.region}<br>类型：${mine.mineType}`,
    properties: {
      region: mine.region,
      mineType: mine.mineType,
      markerColor: mine.markerColor,
    },
    // 25m 是相对地面的显示高度，不再把椭球 height=0 当作地面。
    position: Cesium.Cartesian3.fromDegrees(
      mine.longitude,
      mine.latitude,
      YULONG_MARKER_HEIGHT_ABOVE_GROUND_METERS,
    ),
    point: {
      pixelSize: 16,
      color: getMarkerColor(mine.markerColor),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      // 远距离使用轻量 Point，近距离让真实矿卡接管显示。
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        minimumDisplayDistance,
        REMOTE_MARKER_MAX_DISTANCE_METERS,
      ),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      show: mine.markerColor === 'red',
      text: mine.name,
      font: '600 16px MiSans, sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        minimumDisplayDistance,
        REMOTE_MARKER_MAX_DISTANCE_METERS,
      ),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  // Keep the pulse separate from PointGraphics, which also uses an internal billboard.
  if (mine.markerColor === 'red') viewer.entities.add({
    id: `${mine.id}-warning-ring`, parent: marker, position: marker.position,
    billboard: warningBillboard(minimumDisplayDistance),
  });
  return marker;
}

export function addMineMarkers(viewer, mines) {
  // 这些矿山没有近距离 GLB，所以 Point 本身需要保持可见。
  return mines.map((mine) =>
    addMineMarker(viewer, mine, { minimumDisplayDistance: 0 }),
  );
}

export function addYulongMarker(viewer) {
  return addMineMarker(viewer, YULONG_MINE);
}

// Alert mine names remain visible; other names appear only on hover.
export function enableMineLabelHover(viewer, mineEntities) {
  const minesById = new Map(mineEntities.map(entity => [entity.id, entity]));
  let hovered;
  function setHovered(next) {
    if (next === hovered) return;
    if (hovered) hovered.label.show = hovered.properties.markerColor.getValue() === 'red';
    hovered = next;
    if (hovered) hovered.label.show = true;
    viewer.scene.requestRender();
  }
  const clear = () => setHovered(undefined);
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(movement => {
    const picked = viewer.scene.pick(movement.endPosition);
    setHovered(minesById.get(picked?.id?.parent?.id ?? picked?.id?.id));
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  viewer.scene.canvas.addEventListener('pointerleave', clear);
  const removeCameraListener = viewer.camera.moveStart.addEventListener(clear);
  return () => {
    clear();
    handler.destroy();
    viewer.scene.canvas.removeEventListener('pointerleave', clear);
    removeCameraListener();
  };
}
