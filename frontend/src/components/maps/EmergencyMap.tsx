"use client";

import { useEffect, useRef } from "react";
import type { Incident } from "@/types";

interface Props {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  selectedId?: string;
  infirmaryLat?: number;
  infirmaryLng?: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "#16a34a",
  medium: "#d97706",
  high: "#ea580c",
  critical: "#dc2626",
};

export function EmergencyMap({
  incidents,
  onSelectIncident,
  selectedId,
  infirmaryLat = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? "7.1907"),
  infirmaryLng = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? "100.5930"),
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Dynamically import Leaflet (no SSR)
    import("leaflet").then((L) => {
      // Fix default icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapRef.current || leafletRef.current) return;

      const map = L.map(mapRef.current, {
        center: [infirmaryLat, infirmaryLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Infirmary marker
      const infirmaryIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;
          background:#1d4ed8;
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          font-size:14px;
        ">🏥</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([infirmaryLat, infirmaryLng], { icon: infirmaryIcon })
        .addTo(map)
        .bindPopup("<b>ห้องพยาบาล มทร.ศรีวิชัย</b>")
        .openPopup();

      leafletRef.current = map;
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when incidents change
  useEffect(() => {
    if (!leafletRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletRef.current;
      if (!map) return;

      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const validIncidents = incidents.filter((i) => i.latitude && i.longitude);
      if (validIncidents.length === 0) return;

      const bounds: [number, number][] = [[infirmaryLat, infirmaryLng]];

      validIncidents.forEach((incident) => {
        const lat = incident.latitude!;
        const lng = incident.longitude!;
        const color = SEVERITY_COLORS[incident.severity] ?? "#dc2626";
        const isSelected = incident.id === selectedId;

        const icon = L.divIcon({
          html: `<div style="
            width:${isSelected ? 40 : 32}px;
            height:${isSelected ? 40 : 32}px;
            background:${color};
            border:${isSelected ? 4 : 2}px solid white;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px ${isSelected ? 12 : 6}px rgba(0,0,0,${isSelected ? 0.4 : 0.25});
            ${incident.severity === "critical" ? "animation: pulse 1s infinite;" : ""}
          "></div>`,
          className: "",
          iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
          iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:180px">
              <b style="color:${color}">${getSeverityLabel(incident.severity)}</b>
              <p style="margin:4px 0 0;font-size:13px">${getTypeLabel(incident.incidentType)}</p>
              ${incident.distanceKm != null ? `<p style="margin:2px 0 0;font-size:12px;color:#666">ระยะ ${incident.distanceKm.toFixed(2)} กม.</p>` : ""}
              <p style="margin:4px 0 0;font-size:11px;color:#888">คลิกที่หมุดเพื่อดูรายละเอียด</p>
            </div>`,
            { maxWidth: 220 }
          );

        marker.on("click", () => onSelectIncident(incident));
        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    });
  }, [incidents, selectedId, infirmaryLat, infirmaryLng, onSelectIncident]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { transform:rotate(-45deg) scale(1); }
          50% { transform:rotate(-45deg) scale(1.15); }
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
    </>
  );
}

function getSeverityLabel(s: string) {
  const m: Record<string, string> = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง", critical: "วิกฤต" };
  return m[s] ?? s;
}
function getTypeLabel(t: string) {
  const m: Record<string, string> = { injury: "บาดเจ็บ", illness: "ป่วย", accident: "อุบัติเหตุ", fainting: "หมดสติ", other: "อื่นๆ" };
  return m[t] ?? t;
}
