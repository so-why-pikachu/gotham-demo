const Cesium = globalThis.Cesium;

export function addRouteVisualization(viewer, route, showDebugMarkers = false, routeId = 'main', routeName = '主运输线') {
  const entities = [];
  const routePositions = route.samples.map((sample) => sample.position);

  entities.push(
    viewer.entities.add({
      id: `${routeId}-route`,
      name: routeName,
      polyline: {
        positions: routePositions,
        width: 7,
        material: new Cesium.PolylineDashMaterialProperty({color:Cesium.Color.fromCssColorString('#b8f584').withAlpha(.9),gapColor:Cesium.Color.TRANSPARENT,dashLength:24,dashPattern:255}),
        clampToGround: false,
      },
      show: true,
    }),
  );

  route.waypoints.forEach((waypoint, index) => {
    entities.push(
      viewer.entities.add({
        id: `${routeId}-${waypoint.id}`,
        name: `XDE240 ${waypoint.id}`,
        position: route.waypointPositions[index],
        point: {
          pixelSize: 8,
          color: Cesium.Color.ORANGE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: waypoint.id,
          font: '600 13px MiSans, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        show: showDebugMarkers,
      }),
    );
  });

  return {
    entities,
    setShow(show) {
      entities.forEach((entity, index) => {
        entity.show = show && (index === 0 || showDebugMarkers);
      });
    },
  };
}
