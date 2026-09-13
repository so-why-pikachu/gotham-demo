import { YULONG_MINE } from './locations.js';

const Cesium = globalThis.Cesium;
const REMOTE_MARKER_MIN_DISTANCE_METERS = 30_000;
const REMOTE_MARKER_MAX_DISTANCE_METERS = Number.POSITIVE_INFINITY;
export const YULONG_MARKER_HEIGHT_ABOVE_GROUND_METERS = 25;

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
  return viewer.entities.add({
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
      show: false,
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

// Only the hovered mine gets a label; clicking still uses the existing handler.
export function enableMineLabelHover(viewer, mineEntities) {
  const minesById = new Map(mineEntities.map(entity => [entity.id, entity]));
  let hovered;
  function setHovered(next) {
    if (next === hovered) return;
    if (hovered) hovered.label.show = false;
    hovered = next;
    if (hovered) hovered.label.show = true;
    viewer.scene.requestRender();
  }
  const clear = () => setHovered(undefined);
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(movement => {
    const picked = viewer.scene.pick(movement.endPosition);
    setHovered(minesById.get(picked?.id?.id));
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
