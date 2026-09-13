import { buildDriveTurnTimeline } from './timeline.js';
import { TRUCK_SPEED_METERS_PER_SECOND, TURN_DURATION_SECONDS } from './waypoints.js';

export const ROUTE_VEHICLES = Object.freeze([
  { id: 'truck-01', name: 'Truck-01', uri: '/models/mine_truck.glb', departureSeconds: 0, destination: 'P6' },
  { id: 'excavator-01', name: 'XE215C · 挖掘机', uri: '/models/XE215C.glb', departureSeconds: 12, destination: 'P5' },
  { id: 'loader-01', name: 'XC958U · 铲车', uri: '/models/XC958U.glb', departureSeconds: 24, destination: 'P4' },
]);

// Reuse the same terrain samples so all vehicles follow exactly the same road.
export function buildFleetTimelines(route) {
  return ROUTE_VEHICLES.map(vehicle => {
    const index = route.waypoints.findIndex(point => point.id === vehicle.destination);
    if (index < 1) throw new Error(`Invalid fleet destination: ${vehicle.destination}`);
    const distance = route.waypointDistances[index];
    const vehicleRoute = {
      ...route,
      waypoints: route.waypoints.slice(0, index + 1),
      segments: route.segments.slice(0, index),
      samples: route.samples.filter(sample => sample.distanceFromStart <= distance),
      waypointDistances: route.waypointDistances.slice(0, index + 1),
      waypointPitches: route.waypointPitches.slice(0, index + 1),
      waypointPositions: route.waypointPositions.slice(0, index + 1),
      totalDistanceMeters: distance,
    };
    return { ...vehicle, timeline: buildDriveTurnTimeline(vehicleRoute, TRUCK_SPEED_METERS_PER_SECOND, TURN_DURATION_SECONDS) };
  });
}
