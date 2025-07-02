"use client"

import { useEffect, useState } from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { Site } from "@/components/map-dashboard"
import { getStatusLabel, formatResponseTime } from "@/lib/api-service"

interface MapProps {
  sites: Site[]
  onMarkerClick: (site: Site) => void
}

export default function Map({ sites, onMarkerClick }: MapProps) {
  const [mapLoaded, setMapLoaded] = useState(false)

  // El Salvador center coordinates
  const elSalvadorCenter: [number, number] = [13.7942, -88.8965]

  // Create custom icons for different statuses
  const createIcon = (color: string) => {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }

  const upIcon = createIcon("green")
  const pendingIcon = createIcon("yellow")
  const noDataIcon = createIcon("red")

  // Fix Leaflet default icon issue
  useEffect(() => {
    // Only run this once on the client
    delete L.Icon.Default.prototype._getIconUrl

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    })

    setMapLoaded(true)
  }, [])

  const getMarkerIcon = (status: "UP" | "PENDING" | "DOWN") => {
    switch (status) {
      case "UP":
        return upIcon
      case "PENDING":
        return pendingIcon
      case "DOWN":
        return noDataIcon
      default:
        return noDataIcon
    }
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg font-medium">Initializing map...</div>
      </div>
    )
  }

  return (
    <MapContainer center={elSalvadorCenter} zoom={10} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {sites.map((site) => (
        <Marker
          key={site.id}
          position={site.coordenadas}
          icon={getMarkerIcon(site.apiStatus)}
          eventHandlers={{
            click: () => onMarkerClick(site),
          }}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">{site.sitio}</h3>
              <p className="text-sm">{site.departamento}</p>
              <p className="text-sm">{site.municipio}</p>
              <p
                className={`text-sm font-medium ${
                  site.apiStatus === "UP"
                    ? "text-green-600"
                    : site.apiStatus === "PENDING"
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {getStatusLabel(site.apiStatus)}
              </p>
              <p className="text-xs text-gray-500">Response: {formatResponseTime(site.responseTime)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
