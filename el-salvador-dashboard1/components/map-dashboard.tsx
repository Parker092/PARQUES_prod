"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, X, Filter, Search, List, MapIcon, RefreshCw, Download, Clock, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteModal } from "@/components/site-modal"
import { getStatusLabel } from "@/lib/api-service"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SitesList } from "@/components/sites-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Import Map component dynamically to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-slate-100">
      <div className="text-lg font-medium">Loading map...</div>
    </div>
  ),
})

export type Site = {
  id: number
  sitio: string
  departamento: string
  municipio: string
  distrito: string
  coordenadas: [number, number]
  url: string
  ip: string
  status: number // For backward compatibility
  apiStatus: "UP" | "PENDING" | "DOWN"
  responseTime: number | null
}

export function MapDashboard() {
  const [sites, setSites] = useState<Site[]>([])
  const [filteredSites, setFilteredSites] = useState<Site[]>([])
  const [alerts, setAlerts] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [usingMockData, setUsingMockData] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("Loading data from API, attempt:", retryCount + 1)

      const response = await fetch("/api/sites")
      const isMockData = response.headers.get("X-Data-Source") === "mock"
      const errorReason = response.headers.get("X-Error-Reason")

      const apiData = await response.json()

      if (apiData.length === 0) {
        setError("Down found from API")
        return
      }

      // Transform API response to our Site format
      const sites: Site[] = apiData.map((apiSite: any) => ({
        id: apiSite.id,
        sitio: apiSite.sitio,
        departamento: apiSite.departamento,
        municipio: apiSite.municipio,
        distrito: apiSite.distrito,
        coordenadas: [Number.parseFloat(apiSite.latitud), Number.parseFloat(apiSite.longitud)] as [number, number],
        url: "", // Not provided by API
        ip: "", // Not provided by API
        status: apiSite.status === "UP" ? 1 : apiSite.status === "PENDING" ? 0 : -1,
        apiStatus: apiSite.status,
        responseTime: apiSite.response_time,
      }))

      // Filter out sites with invalid coordinates
      const validSites = sites.filter((site) => !isNaN(site.coordenadas[0]) && !isNaN(site.coordenadas[1]))

      console.log(`Loaded ${validSites.length} sites successfully`)
      setSites(validSites)
      setFilteredSites(validSites)
      setLastUpdated(new Date())
      setUsingMockData(isMockData)
      setApiConnected(!isMockData)

      if (isMockData && errorReason) {
        console.warn("Using mock data due to:", errorReason)
      }

      // Check for new down/Down sites for alerts
      const problemSites = validSites.filter(
        (site) =>
          (site.apiStatus === "DOWN" || site.apiStatus === "PENDING") &&
          !alerts.some((alert) => alert.id === site.id),
      )

      setAlerts((prev) => {
        const unique = problemSites.filter(
          (newAlert) => !prev.some((existing) => existing.id === newAlert.id)
        )

        unique.forEach((alert) => {
          setTimeout(() => removeAlert(alert), 5000)
        })

        return [...prev, ...unique]
      })

      // Extract unique departments for filtering
      const uniqueDepartments = Array.from(new Set(validSites.map((site) => site.departamento)))
        .filter(Boolean)
        .sort()
      setDepartments(uniqueDepartments)
      setSelectedDepartments(uniqueDepartments) // Initially select all
    } catch (error) {
      console.error("Failed to load data:", error)
      setError("Failed to load data from API. Check Docker container status.")
      setUsingMockData(true)
      setApiConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [retryCount])

  // Initial data load
  useEffect(() => {
    loadData()
  }, [loadData])


  // Set up monitoring interval
  useEffect(() => {
    if (sites.length === 0) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/sites")
        const isMockData = response.headers.get("X-Data-Source") === "mock"
        const apiData = await response.json()

        setLastUpdated(new Date())
        setUsingMockData(isMockData)
        setApiConnected(!isMockData)

        const sites: Site[] = apiData.map((apiSite: any) => ({
          id: apiSite.id,
          sitio: apiSite.sitio,
          departamento: apiSite.departamento,
          municipio: apiSite.municipio,
          distrito: apiSite.distrito,
          coordenadas: [Number.parseFloat(apiSite.latitud), Number.parseFloat(apiSite.longitud)] as [number, number],
          url: "",
          ip: "",
          status: apiSite.status === "UP" ? 1 : apiSite.status === "PENDING" ? 0 : -1,
          apiStatus: apiSite.status,
          responseTime: apiSite.response_time,
        }))

        const validSites = sites.filter((site) => !isNaN(site.coordenadas[0]) && !isNaN(site.coordenadas[1]))

        const newProblemSites = validSites.filter(
          (site) =>
            (site.apiStatus === "DOWN" || site.apiStatus === "PENDING") &&
            !alerts.some((alert) => alert.id === site.id),
        )

        if (newProblemSites.length > 0) {
          setAlerts((prev) => {
            const unique = newProblemSites.filter(
              (newAlert) => !prev.some((existing) => existing.id === newAlert.id)
            )
            // Auto-remove cada nueva alerta después de 5 segundos
            unique.forEach((alert) => {
              setTimeout(() => removeAlert(alert), 5000)
            })

            return [...prev, ...unique]
          })
        }

        setSites(validSites)
        //applyFilters(validSites, selectedDepartments, statusFilter, searchQuery)
      } catch (error) {
        console.error("Error monitoring sites:", error)
        setApiConnected(false)
      }
    }, 300000) // cada 5 minutos

    return () => clearInterval(interval)
  }, [sites, alerts, selectedDepartments, statusFilter, searchQuery])


  // Apply filters when filter criteria change
  // useEffect(() => {
  //   applyFilters(sites, selectedDepartments, statusFilter, searchQuery)
  // }, [sites, selectedDepartments, statusFilter, searchQuery])

  // // Apply filters to sites
  // const applyFilters = (allSites: Site[], depts: string[], status: string | null, query: string) => {
  //   let filtered = allSites

  //   // Filter by department
  //   if (depts.length > 0 && depts.length < departments.length) {
  //     filtered = filtered.filter((site) => depts.includes(site.departamento))
  //   }

  //   // Filter by status
  //   if (status !== null) {
  //     filtered = filtered.filter((site) => site.apiStatus === status)
  //   }

  //   // Filter by search query
  //   if (query.trim() !== "") {
  //     const searchLower = query.toLowerCase()
  //     filtered = filtered.filter(
  //       (site) =>
  //         site.sitio.toLowerCase().includes(searchLower) ||
  //         site.municipio.toLowerCase().includes(searchLower) ||
  //         site.departamento.toLowerCase().includes(searchLower) ||
  //         site.distrito.toLowerCase().includes(searchLower),
  //     )
  //   }

  //   setFilteredSites(filtered)
  // }

  // Toggle department selection
  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(dept)) {
        return prev.filter((d) => d !== dept)
      } else {
        return [...prev, dept]
      }
    })
  }

  // Select all departments
  const selectAllDepartments = () => {
    setSelectedDepartments(departments)
  }

  // Clear all department selections
  const clearDepartmentSelection = () => {
    setSelectedDepartments([])
  }

  // Remove alert after 30 seconds or when manually closed
  const removeAlert = (site: Site) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== site.id))
  }

  // Auto-remove alerts after 5 seconds
  // useEffect(() => {
  //   const timeouts = alerts.map((alert) => {
  //     return setTimeout(() => {
  //       removeAlert(alert)
  //     }, 5000)
  //   })

  //   return () => {
  //     timeouts.forEach((timeout) => clearTimeout(timeout))
  //   }
  // }, [alerts])


  const handleAlertClick = (site: Site) => {
    setSelectedSite(site)
    setIsModalOpen(true)
  }

  // Handle retry
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  // Manually refresh data
  const handleRefresh = async () => {
    await loadData()
  }

  // Export data as CSV
  const exportData = () => {
    // Create CSV content
    const headers = [
      "ID",
      "Sitio",
      "Departamento",
      "Municipio",
      "Distrito",
      "Latitud",
      "Longitud",
      "Status",
      "Response Time",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredSites.map((site) => {
        return [
          site.id,
          `"${site.sitio}"`,
          `"${site.departamento}"`,
          `"${site.municipio}"`,
          `"${site.distrito}"`,
          site.coordenadas[0],
          site.coordenadas[1],
          `"${site.apiStatus}"`,
          site.responseTime || "N/A",
        ].join(",")
      }),
    ].join("\n")

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `el_salvador_sites_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Stats
  const totalSites = sites.length
  const upSites = sites.filter((site) => site.apiStatus === "UP").length
  const pendingSites = sites.filter((site) => site.apiStatus === "PENDING").length
  const noDataSites = sites.filter((site) => site.apiStatus === "DOWN").length
  const avgResponseTime =
    sites
      .filter((site) => site.responseTime !== null && site.responseTime !== -1)
      .reduce((sum, site) => sum + (site.responseTime || 0), 0) /
    sites.filter((site) => site.responseTime !== null && site.responseTime !== -1).length || 0



  return (
    <div className="relative w-full h-screen">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="text-xl font-semibold">Loading sites data...</div>
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50 p-4">
          <div className="text-xl font-semibold text-red-600 mb-4">{error}</div>
          <div className="text-sm text-gray-600 mb-4 text-center max-w-md">
            Make sure your Docker container is running and accessible at the configured endpoint.
          </div>
          <Button onClick={handleRetry} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      ) : (
        <>
          {viewMode === "map" ? (
            <Map
              sites={filteredSites}
              onMarkerClick={(site) => {
                setSelectedSite(site)
                setIsModalOpen(true)
              }}
            />
          ) : (
            <SitesList
              sites={filteredSites}
              onSiteClick={(site) => {
                setSelectedSite(site)
                setIsModalOpen(true)
              }}
            />
          )}

          {/* API Connection Status */}
          {usingMockData && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-auto max-w-md">
              <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
                <WifiOff className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Docker API Disconnected</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Cannot connect to Docker API. Using mock data. Check container status.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Stats panel */}
          <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[1000] flex flex-col gap-2 max-w-md">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Conectando El Salvador - Monitoreo</h2>
              <div className="flex gap-1">
                <div className="flex items-center gap-1">
                  {apiConnected ? (
                    <Wifi className="h-4 w-4 text-green-600" title="API OK" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" title="API Disconnected" />
                  )}
                </div>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("map")}
                >
                  <MapIcon className="h-4 w-4" />
                  <span className="sr-only">Map View</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                  <span className="sr-only">List View</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <div className="font-medium">Total</div>
                <div className="text-lg">{totalSites}</div>
              </div>
              <div>
                <div className="font-medium text-green-600">Up</div>
                <div className="text-lg text-green-600">{upSites}</div>
              </div>
              <div>
                <div className="font-medium text-yellow-600">Pending</div>
                <div className="text-lg text-yellow-600">{pendingSites}</div>
              </div>
              <div>
                <div className="font-medium text-red-600">Down</div>
                <div className="text-lg text-red-600">{noDataSites}</div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Avg Response: {avgResponseTime > 0 ? `${Math.round(avgResponseTime)}ms` : "N/A"}
              </div>
              <div>Data Source: {usingMockData ? "Mock Data" : "API"}</div>
              <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
            </div>

            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={handleRefresh}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={exportData}>
                <Download className="h-3 w-3 mr-2" />
                Export
              </Button>
            </div>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}

          </div>

          {/* Alerts container */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 max-w-md z-[1000]">
            {alerts.map((site) => (
              <div
                key={site.id}
                className={`text-white p-4 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-right ${site.apiStatus === "DOWN" ? "bg-red-600" : "bg-yellow-600"
                  }`}
                onClick={() => handleAlertClick(site)}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 cursor-pointer">
                  <h3 className="font-bold">
                    {site.sitio} - {getStatusLabel(site.apiStatus)}
                  </h3>
                  <p className="text-sm opacity-90">
                    {site.apiStatus === "DOWN" ? "Down" : "Status pending"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-white hover:bg-black/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAlert(site)
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            ))}
          </div>

          {/* Site details modal */}
          <SiteModal site={selectedSite} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
      )}
    </div>
  )
}
