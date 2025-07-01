"use client"

import type { Site } from "@/components/map-dashboard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getStatusLabel, formatResponseTime } from "@/lib/api-service"

interface SiteModalProps {
  site: Site | null
  isOpen: boolean
  onClose: () => void
}

export function SiteModal({ site, isOpen, onClose }: SiteModalProps) {
  if (!site) return null

  const getStatusVariant = (status: "UP" | "PENDING" | "DOWN") => {
    switch (status) {
      case "UP":
        return "success" as const
      case "PENDING":
        return "secondary" as const
      case "DOWN":
        return "destructive" as const
      default:
        return "outline" as const
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{site.sitio}</DialogTitle>
          <DialogDescription>Site details and monitoring information</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">ID:</span>
            <span className="col-span-3">{site.id}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Status:</span>
            <div className="col-span-3">
              <Badge variant={getStatusVariant(site.apiStatus)}>{getStatusLabel(site.apiStatus)}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Response Time:</span>
            <span className="col-span-3">{formatResponseTime(site.responseTime)}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Department:</span>
            <span className="col-span-3">{site.departamento}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Municipality:</span>
            <span className="col-span-3">{site.municipio}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">District:</span>
            <span className="col-span-3">{site.distrito}</span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Coordinates:</span>
            <span className="col-span-3">
              {site.coordenadas[0]}, {site.coordenadas[1]}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
