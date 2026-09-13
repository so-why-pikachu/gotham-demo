const Cesium = globalThis.Cesium;

export function addRouteVisualization(viewer, route, showDebugMarkers = false) {
  const entities = [];
  const routePositions = route.samples.map((sample) => sample.position);

  entities.push(
    viewer.entities.add({
      id: 'truck-01-route',
      name: 'XDE240 路线',
      polyline: {
        positions: routePositions,
        width: 3,
        material: Cesium.Color.CYAN,
        clampToGround: false,
      },
      show: true,
    }),
  );

  route.waypoints.forEach((waypoint, index) => {
    entities.push(
      viewer.entities.add({
        id: `truck-01-${waypoint.id}`,
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
