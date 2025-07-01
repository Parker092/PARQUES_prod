"use client"

import type { Site } from "@/components/map-dashboard"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getStatusLabel, formatResponseTime } from "@/lib/api-service"

interface SitesListProps {
  sites: Site[]
  onSiteClick: (site: Site) => void
}

export function SitesList({ sites, onSiteClick }: SitesListProps) {
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
    <div className="w-full h-screen p-4 pt-32 overflow-auto bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Municipality</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Response Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No sites found matching your criteria
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => (
              <TableRow key={site.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSiteClick(site)}>
                <TableCell className="font-medium">{site.id}</TableCell>
                <TableCell className="font-medium">{site.sitio}</TableCell>
                <TableCell>{site.departamento}</TableCell>
                <TableCell>{site.municipio}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(site.apiStatus)}>{getStatusLabel(site.apiStatus)}</Badge>
                </TableCell>
                <TableCell>{formatResponseTime(site.responseTime)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
