// Arrival, not zero displacement: turning and waiting to depart are not parking.
export function createParkedEquipmentEffects(viewer, effects, getVehicle, isEnabled, onChange) {
  let shownId = null;
  function clear() {
    if (shownId !== null) effects.clear();
    shownId = null;
    onChange(false);
  }
  function sync() {
    const vehicle = getVehicle();
    const timeline = vehicle?.timeline;
    const arrived = isEnabled() && timeline?.startTime != null &&
      globalThis.Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, timeline.startTime) >= timeline.totalDurationSeconds;
    if (!arrived) { if (shownId !== null) clear(); return; }
    if (shownId === vehicle.id) return;
    const position = vehicle.entity.position.getValue(viewer.clock.currentTime);
    if (!position) { clear(); return; }
    shownId = vehicle.id;
    effects.show(position, vehicle.name, vehicle.routeId ?? 'main');
    onChange(true);
  }
  const removeTick = viewer.clock.onTick.addEventListener(sync);
  return {sync, clear, destroy() {removeTick(); clear();}};
}
