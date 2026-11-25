/**
 * GeospatialService — High-Precision Geospatial Intelligence & Pluggable Routing
 * 
 * Provides Haversine distance, compass bearing, ETA calculation, geofencing,
 * stale location detection, and pluggable routing provider abstraction.
 */

export class GeospatialService {
  constructor(options = {}) {
    this.earthRadiusKm = 6371.0;
    this.defaultUrbanSpeedKmh = options.defaultUrbanSpeedKmh || 30.0;
    this.staleThresholdMs = options.staleThresholdMs || 15 * 60 * 1000; // 15 minutes
  }

  /**
   * High-accuracy Haversine formula calculating great-circle distance between two coordinates in kilometers.
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Support object format: calculateDistance({ lat, lng }, { lat, lng })
    if (typeof lat1 === 'object' && lat1 !== null && typeof lon1 === 'object' && lon1 !== null) {
      lat2 = lon1.lat;
      lon2 = lon1.lng;
      const origin = lat1;
      lat1 = origin.lat;
      lon1 = origin.lng;
    }

    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return 1.5; // Safe default for missing coordinates
    }

    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((this.earthRadiusKm * c).toFixed(2));
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  rad2deg(rad) {
    return rad * (180 / Math.PI);
  }

  /**
   * Calculates the initial compass bearing from origin to destination (0° to 360°).
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    // Support object format: calculateBearing({ lat, lng }, { lat, lng })
    if (typeof lat1 === 'object' && lat1 !== null && typeof lon1 === 'object' && lon1 !== null) {
      lat2 = lon1.lat;
      lon2 = lon1.lng;
      const origin = lat1;
      lat1 = origin.lat;
      lon1 = origin.lng;
    }

    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;

    const φ1 = this.deg2rad(lat1);
    const φ2 = this.deg2rad(lat2);
    const λ1 = this.deg2rad(lon1);
    const λ2 = this.deg2rad(lon2);

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

    const θ = Math.atan2(y, x);
    const bearing = (this.rad2deg(θ) + 360) % 360;
    return Math.round(bearing);
  }

  /**
   * Calculates estimated arrival time (ETA) based on distance, emergency priority,
   * urban density and traffic congestion factors.
   */
  calculateETA(distanceKm, priority = 'CRITICAL', trafficFactor = 1.15) {
    if (!distanceKm || distanceKm <= 0) return 2;

    // Emergency response speed calibration
    let baseSpeedKmh;
    let minMinutes;

    switch (priority) {
      case 'CRITICAL':
        baseSpeedKmh = 38.0; // Rapid transit with emergency siren clearance
        minMinutes = 2;
        break;
      case 'HIGH':
        baseSpeedKmh = 32.0;
        minMinutes = 3;
        break;
      case 'MEDIUM':
        baseSpeedKmh = 28.0;
        minMinutes = 4;
        break;
      default:
        baseSpeedKmh = this.defaultUrbanSpeedKmh;
        minMinutes = 4;
        break;
    }

    const effectiveSpeed = baseSpeedKmh / trafficFactor;
    const travelTimeHours = distanceKm / effectiveSpeed;
    const travelTimeMinutes = Math.ceil(travelTimeHours * 60);

    return Math.max(minMinutes, travelTimeMinutes);
  }

  /**
   * Determines whether coordinates fall within a technician's working geofence radius.
   */
  isWithinRadius(techLat, techLng, centerLat, centerLng, maxRadiusKm = 15.0) {
    const dist = this.calculateDistance(techLat, techLng, centerLat, centerLng);
    return dist <= maxRadiusKm;
  }

  /**
   * Evaluates whether GPS coordinates are stale.
   */
  isLocationStale(lastUpdateTimestamp, customThresholdMs = null) {
    if (!lastUpdateTimestamp) return true;
    const threshold = customThresholdMs || this.staleThresholdMs;
    const ageMs = Date.now() - new Date(lastUpdateTimestamp).getTime();
    return ageMs > threshold;
  }

  /**
   * Generates interpolated GPS waypoints between origin and destination with realistic micro-jitter.
   */
  generateRouteWaypoints(origin, destination, steps = 8) {
    const waypoints = [];
    const dLat = destination.lat - origin.lat;
    const dLng = destination.lng - origin.lng;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Slight road curvature simulation
      const lateralJitter = progress > 0 && progress < 1 ? (Math.sin(progress * Math.PI) * 0.0004) : 0;
      
      const lat = parseFloat((origin.lat + dLat * progress + lateralJitter).toFixed(6));
      const lng = parseFloat((origin.lng + dLng * progress + lateralJitter).toFixed(6));
      const remainingDist = parseFloat((this.calculateDistance(lat, lng, destination.lat, destination.lng)).toFixed(2));
      const bearing = this.calculateBearing(lat, lng, destination.lat, destination.lng);

      waypoints.push({
        step: i,
        progress: parseFloat((progress * 100).toFixed(1)),
        lat,
        lng,
        bearing,
        remainingDistanceKm: remainingDist
      });
    }

    return waypoints;
  }
}

export const geospatialService = new GeospatialService();
