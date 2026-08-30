"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface TruckRoute {
  id: string;
  name: string;
  group: string;
  vehicle: string;
  points: [number, number][];
  color: string;
}

const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};

export default function NamparkTruckMap({
  truckRoutes,
  selectedRouteId,
  selectedGroup,
  showWards,
}: {
  truckRoutes: TruckRoute[];
  selectedRouteId: string | null;
  selectedGroup: string;
  showWards: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const wardsLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-1.29, 36.82], 7);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap | Nampark RMS",
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (wardsLayerRef.current) {
      wardsLayerRef.current.remove();
      wardsLayerRef.current = null;
    }
    if (!showWards) return;
    fetch("/geo/territory_wards.json")
      .then((r) => r.json())
      .then((geojson) => {
        if (!mapInstanceRef.current) return;
        const layer = L.geoJSON(geojson, {
          style: {
            color: "#0f766e",
            weight: 1,
            opacity: 0.35,
            fillColor: "#ccfbf1",
            fillOpacity: 0.08,
          },
          onEachFeature: (feature, lyr) => {
            const p = feature.properties as { ward?: string; constituency?: string };
            if (p?.ward) (lyr as L.Path).bindTooltip(`${p.ward} · ${p.constituency ?? ""}`, { sticky: true, opacity: 0.9 });
          },
        }).addTo(map);
        wardsLayerRef.current = layer;
      })
      .catch(() => {});
  }, [showWards]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    polylinesRef.current.forEach((l) => l.remove());
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (truckRoutes.length === 0) return;
    const bounds: [number, number][] = [];
    truckRoutes.forEach((route) => {
      if (route.points.length < 2) return;
      const isSelected = selectedRouteId ? route.id === selectedRouteId : selectedGroup === "All" || route.group === selectedGroup;
      const dimmed = selectedRouteId ? !isSelected : selectedGroup !== "All" && route.group !== selectedGroup;
      const color = GROUP_COLORS[route.group] || route.color || "#047857";
      const line = L.polyline(route.points, {
        color,
        weight: isSelected ? 4.5 : dimmed ? 1.5 : 2.8,
        opacity: isSelected ? 0.92 : dimmed ? 0.22 : 0.55,
        dashArray: isSelected ? undefined : "7 7",
        lineCap: "round",
      }).addTo(map).bindTooltip(
        `<div style="font-family:system-ui;font-size:11px;min-width:140px"><div style="font-weight:700">${route.name}</div><div style="color:#666">${route.group} · ${route.vehicle}</div><div style="color:#999;font-size:10px">${route.points.length - 1} stops · ${isSelected ? "TRUCK HIGHLIGHTED" : "dashed = other"}</div></div>`,
        { sticky: true }
      );
      const headIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px">🚚</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const head = L.marker(route.points[0], { icon: headIcon }).addTo(map);
      markersRef.current.push(head);
      polylinesRef.current.push(line);
      route.points.forEach((pt) => bounds.push(pt));
    });
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [truckRoutes, selectedRouteId, selectedGroup, showWards]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: 520 }} />;
}
