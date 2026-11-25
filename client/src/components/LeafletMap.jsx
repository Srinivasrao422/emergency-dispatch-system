import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Flame, Layers, Map as MapIcon } from 'lucide-react';

export default function LeafletMap({
  customerLocation,
  technicianLocation,
  routeCoordinates = null,
  allTechnicians = [],
  allRequests = [],
  interactivePinDrop = false,
  onLocationSelect = null,
  height = '420px',
  zoom = 13,
  enableHeatmap = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const heatmapCirclesRef = useRef([]);

  const [showHeatmap, setShowHeatmap] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const defaultCenter = customerLocation
      ? [customerLocation.lat, customerLocation.lng]
      : technicianLocation
      ? [technicianLocation.lat, technicianLocation.lng]
      : [40.7282, -73.9942];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: zoom,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Handle pin drop click if enabled
    if (interactivePinDrop && onLocationSelect) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelect({
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          address: `Selected Incident Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        });
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle Distress Heatmap Layer (Phase 2 Benchmark)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous heatmap circles
    heatmapCirclesRef.current.forEach((c) => map.removeLayer(c));
    heatmapCirclesRef.current = [];

    if (showHeatmap) {
      // Determine center base coordinates
      const centerLat = customerLocation?.lat || 40.7282;
      const centerLng = customerLocation?.lng || -73.9942;

      const hotspots = [
        {
          lat: centerLat + 0.003,
          lng: centerLng - 0.002,
          radius: 750,
          color: '#ef4444',
          fillColor: '#f87171',
          label: '🔥 High Plumbing Surge (14 calls/hr)'
        },
        {
          lat: centerLat - 0.006,
          lng: centerLng + 0.005,
          radius: 950,
          color: '#f59e0b',
          fillColor: '#fbbf24',
          label: '⚡ Electrical Outage Cluster (8 calls/hr)'
        },
        {
          lat: centerLat + 0.008,
          lng: centerLng + 0.006,
          radius: 800,
          color: '#ec4899',
          fillColor: '#f472b6',
          label: '💨 Gas & Hazmat Alert Zone (3 active units)'
        }
      ];

      hotspots.forEach((spot) => {
        const circle = L.circle([spot.lat, spot.lng], {
          color: spot.color,
          fillColor: spot.fillColor,
          fillOpacity: 0.35,
          weight: 2,
          radius: spot.radius
        }).addTo(map);

        circle.bindTooltip(spot.label, {
          permanent: true,
          direction: 'center',
          className: 'heatmap-tooltip'
        });

        heatmapCirclesRef.current.push(circle);
      });
    }
  }, [showHeatmap, customerLocation]);

  // Update Markers and Polyline whenever locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const bounds = [];

    // 1. Single Customer Location Marker (Emergency Distress Beacon)
    if (customerLocation && customerLocation.lat && customerLocation.lng) {
      const customerIcon = L.divIcon({
        className: 'custom-customer-icon',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(225, 29, 72, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background: #e11d48; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); color: white; font-weight: bold; font-size: 14px;">
              🚨
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const customerMarker = L.marker([customerLocation.lat, customerLocation.lng], {
        icon: customerIcon
      }).addTo(map);

      customerMarker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: bold; color: #e11d48; font-size: 13px;">
            <span>🚨</span> EMERGENCY INCIDENT SITE
          </div>
          <div style="font-size: 12px; margin-top: 4px; color: #334155; font-weight: 500;">${customerLocation.address || 'Selected Location'}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Coordinates: ${customerLocation.lat.toFixed(4)}, ${customerLocation.lng.toFixed(4)}</div>
        </div>
      `);

      markersRef.current.push(customerMarker);
      bounds.push([customerLocation.lat, customerLocation.lng]);
    }

    // 2. Single Assigned Technician Location Marker
    if (technicianLocation && technicianLocation.lat && technicianLocation.lng) {
      const techIcon = L.divIcon({
        className: 'custom-tech-icon',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(79, 70, 229, 0.35); animation: pulse 2s infinite;"></div>
            <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #4f46e5; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.5); color: white; font-weight: bold; font-size: 15px;">
              🚐
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const techMarker = L.marker([technicianLocation.lat, technicianLocation.lng], {
        icon: techIcon
      }).addTo(map);

      techMarker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 170px;">
          <div style="font-weight: bold; color: #4f46e5; font-size: 13px;">🚐 ${technicianLocation.name || 'Technician En Route'}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">${technicianLocation.categoryName || 'Emergency Specialist'}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${technicianLocation.address || 'GPS Live Telemetry'}</div>
        </div>
      `);

      markersRef.current.push(techMarker);
      bounds.push([technicianLocation.lat, technicianLocation.lng]);
    }

    // 3. Polyline Route between Customer & Assigned Technician (Real Road Network or Fallback)
    if (
      customerLocation &&
      technicianLocation &&
      customerLocation.lat &&
      technicianLocation.lat
    ) {
      if (routeCoordinates && Array.isArray(routeCoordinates) && routeCoordinates.length >= 2) {
        polylineRef.current = L.polyline(routeCoordinates, {
          color: '#2563eb',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      } else {
        const latlngs = [
          [technicianLocation.lat, technicianLocation.lng],
          [customerLocation.lat, customerLocation.lng]
        ];

        polylineRef.current = L.polyline(latlngs, {
          color: '#4f46e5',
          weight: 5,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);
      }
    }

    // 4. All Technicians Fleet Overview (Used by Admin Tower)
    if (allTechnicians && allTechnicians.length > 0) {
      allTechnicians.forEach((t) => {
        if (!t.currentLocation || !t.currentLocation.lat) return;

        let statusColor = '#10b981';
        let statusBadge = 'Available';

        if (!t.isOnline) {
          statusColor = '#94a3b8';
          statusBadge = 'Offline';
        } else if (t.status === 'en_route') {
          statusColor = '#f59e0b';
          statusBadge = 'En Route';
        } else if (t.status === 'in_progress') {
          statusColor = '#8b5cf6';
          statusBadge = 'Working On Site';
        }

        const fleetIcon = L.divIcon({
          className: 'custom-fleet-icon',
          html: `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${statusColor}; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3); font-size: 14px;">
              ${t.category === 'plumbing' ? '🔧' : t.category === 'electrical' ? '⚡' : t.category === 'hvac' ? '❄️' : t.category === 'gas' ? '🔥' : '🛠️'}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const m = L.marker([t.currentLocation.lat, t.currentLocation.lng], {
          icon: fleetIcon
        }).addTo(map);

        m.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; min-width: 190px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; font-size: 14px;">${t.name}</span>
              <span style="font-size: 11px; padding: 2px 7px; border-radius: 10px; background: ${statusColor}22; color: ${statusColor}; font-weight: bold;">${statusBadge}</span>
            </div>
            <div style="font-size: 12px; color: #475569; margin-top: 3px;">${t.categoryName} • ⭐ ${t.rating}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Vehicle: ${t.vehicle?.type} (${t.vehicle?.plate})</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Completed Today: ${t.completedJobsToday || 0} jobs</div>
            <div style="font-size: 11px; color: #2563eb; margin-top: 2px; font-weight: 500;">Service Radius: ${t.workingRadiusKm || 15} km${t.heading ? ` • Bearing: ${t.heading}°` : ''}</div>
          </div>
        `);

        markersRef.current.push(m);
        bounds.push([t.currentLocation.lat, t.currentLocation.lng]);
      });
    }

    // 5. All Active Requests
    if (allRequests && allRequests.length > 0) {
      allRequests.forEach((req) => {
        if (!req.location || !req.location.lat) return;
        if (req.status === 'completed' || req.status === 'cancelled') return;

        const isEscalated = req.status === 'escalated';
        const color = isEscalated ? '#ef4444' : '#f43f5e';

        const reqIcon = L.divIcon({
          className: 'custom-req-icon',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}55; animation: ping 1.8s infinite;"></div>
              <div style="width: 28px; height: 28px; border-radius: 50%; background: ${color}; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                ${isEscalated ? '⚠️' : '🚨'}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const rm = L.marker([req.location.lat, req.location.lng], { icon: reqIcon }).addTo(map);

        rm.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; min-width: 190px;">
            <div style="color: ${color}; font-weight: bold; font-size: 13px;">${req.id} • ${req.priority}</div>
            <div style="font-weight: 600; font-size: 12px; margin-top: 2px;">${req.categoryName}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">${req.issueDescription}</div>
            <div style="font-size: 11px; color: #4f46e5; margin-top: 4px; font-weight: bold;">Status: ${req.status.toUpperCase()}</div>
          </div>
        `);

        markersRef.current.push(rm);
        bounds.push([req.location.lat, req.location.lng]);
      });
    }

    // Auto-fit bounds if we have multiple points
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], zoom);
    }
  }, [customerLocation, technicianLocation, allTechnicians, allRequests, zoom]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Layer Control: Heatmap Switcher (Phase 2) */}
      {enableHeatmap && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 text-xs shadow-lg">
          <button
            type="button"
            onClick={() => setShowHeatmap(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              !showHeatmap
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Street</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeatmap(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              showHeatmap
                ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Distress Heatmap</span>
          </button>
        </div>
      )}

      {interactivePinDrop && (
        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-200 flex items-center gap-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Click anywhere on the map to set incident pin</span>
        </div>
      )}
    </div>
  );
}
