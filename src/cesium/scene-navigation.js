import { getChinaView } from './locations.js';
export function createSceneNavigation(viewer, onPhase) {
  const C = globalThis.Cesium;
  let sequence = 0;
  let removeFollow;
  function stopFollowing() {
    removeFollow?.(); removeFollow = undefined;
    if (viewer.camera.lookAtTransform) viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  }
  for (const field of ['enableRotate','enableTranslate','enableZoom','enableTilt','enableLook']) viewer.scene.screenSpaceCameraController[field] = false;
  viewer.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  function navigate(mine, terrainHeight = 0, instant = false) {
    const token = ++sequence;
    stopFollowing();
    viewer.camera.cancelFlight(); viewer.trackedEntity = undefined;
    onPhase(mine ? 'entering' : 'returning');
    const complete = () => { if (token === sequence && !viewer.isDestroyed()) onPhase(mine ? 'mine' : 'national'); };
    const duration = instant || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1.8;
    if (!mine) {
      const {longitude,latitude,height,heading,pitch,roll} = getChinaView(viewer);
      viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(longitude,latitude,height),orientation:{heading:C.Math.toRadians(heading),pitch:C.Math.toRadians(pitch),roll:C.Math.toRadians(roll)},duration,complete});
    } else {
      const yulong = mine.id === 'yulong-mine';
      const center = C.Cartesian3.fromDegrees(yulong ? 97.7368 : mine.longitude, yulong ? 31.4117 : mine.latitude, terrainHeight);
      const width = viewer.scene.canvas.clientWidth || 1280;
      const safeFraction = Math.max(.32, (width - (width < 1100 ? 360 : 710)) / width);
      const radius = mine.sceneRadius ?? (yulong ? 460 : 2200);
      const range = radius / Math.tan(viewer.camera.frustum.fovy / 2) / safeFraction * 1.25;
      viewer.camera.flyToBoundingSphere(new C.BoundingSphere(center,radius), {offset:new C.HeadingPitchRange(0,C.Math.toRadians(-72),range),duration,complete});
    }
  }
  function focusEquipment(position, model = 'XDE240', getPosition) {
    stopFollowing();
    const center = C.Cartesian3.clone(position);
    const token = ++sequence;
    viewer.camera.cancelFlight();
    viewer.trackedEntity = undefined;
    onPhase('focusing');
    const offset = new C.HeadingPitchRange(0, C.Math.toRadians(-43), (model.startsWith('XDE') ? 145 : 110) * Math.max(1, 1.6 / (viewer.scene.canvas.clientWidth / (viewer.scene.canvas.clientHeight || 900))));
    viewer.camera.flyToBoundingSphere(new C.BoundingSphere(center, 15), {
      offset,
      duration: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1.2,
      complete: () => {
        if (token !== sequence || viewer.isDestroyed()) return;
        if (getPosition) {
          const follow = () => { const target = getPosition(); if (target) viewer.camera.lookAt(target, offset); };
          follow();
          removeFollow = viewer.scene.preRender.addEventListener(follow);
        }
        onPhase('equipment');
      },
    });
  }
  return {navigate, focusEquipment, destroy(){++sequence;stopFollowing();viewer.camera.cancelFlight();}};
}
