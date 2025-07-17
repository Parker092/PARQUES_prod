"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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

const normalizeDepartment = (input: string): string => {
  const normalized = input.trim().toLowerCase();
  const map: Record<string, string> = {
    "ahuachapan": "Ahuachapán",
    "ahuachapán": "Ahuachapán",
    "santa ana": "Santa Ana",
    "sonsonate": "Sonsonate",
    "chalatenango": "Chalatenango",
    "la libertad": "La Libertad",
    "san salvador": "San Salvador",
    "cuscatlan": "Cuscatlán",
    "cuscatlán": "Cuscatlán",
    "la paz": "La Paz",
    "cabañas": "Cabañas",
    "san vicente": "San Vicente",
    "usulutan": "Usulután",
    "usulután": "Usulután",
    "san miguel": "San Miguel",
    "morazan": "Morazán",
    "morazán": "Morazán",
    "la union": "La Unión",
    "la unión": "La Unión",
  };
  return map[normalized] || input;
};

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

  // Inicializar los refs con null o un valor por defecto simple
  const selectedDepartmentsRef = useRef<string[]>([]); // Inicializar con un array vacío, no el estado
  const statusFilterRef = useRef<string | null>(null);
  const searchQueryRef = useRef<string>("");
  const loadDataRef = useRef<(() => Promise<void>) | null>(null); // Inicializar con null

  // Actualizar los refs cuando los estados cambian (esto se ejecuta en el cliente después de SSR)
  useEffect(() => {
    selectedDepartmentsRef.current = selectedDepartments;
  }, [selectedDepartments]);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);


  // --- Funciones de Filtrado ---
  const applyFilters = useCallback((allSites: Site[]) => {
    // Accede a los valores actuales a través de .current
    const currentDepartments = selectedDepartmentsRef.current;
    const currentStatus = statusFilterRef.current;
    const currentQuery = searchQueryRef.current;

    let filtered = allSites;

    if (currentDepartments.length > 0 && currentDepartments.length < departments.length) {
      filtered = filtered.filter((site) => currentDepartments.includes(site.departamento));
    }

    if (currentStatus !== null) {
      filtered = filtered.filter((site) => site.apiStatus === currentStatus);
    }

    if (currentQuery.trim() !== "") {
      const searchLower = currentQuery.toLowerCase();
      filtered = filtered.filter(
        (site) =>
          site.sitio.toLowerCase().includes(searchLower) ||
          site.municipio.toLowerCase().includes(searchLower) ||
          site.departamento.toLowerCase().includes(searchLower) ||
          site.distrito.toLowerCase().includes(searchLower),
      );
    }

    setFilteredSites(filtered);
  }, [departments]); // 'departments' es una dependencia válida aquí.

  // removeAlert se define aquí para que esté disponible dentro de loadData si se usa un callback de setAlerts
  const removeAlert = useCallback((site: Site) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== site.id));
  }, []);



  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Loading data from API, attempt:", retryCount + 1);

      const response = await fetch("/api/sites");
      const isMockData = response.headers.get("X-Data-Source") === "mock";
      const errorReason = response.headers.get("X-Error-Reason");

      const apiData = await response.json();

      if (apiData.length === 0 && !isMockData) {
        setError("No data found from API. It might be down or return an empty response.");
        setUsingMockData(false);
        return;
      }

      // ✅ Filtrar solo sitios con status válidos: "UP", "DOWN", "PENDING"
      const allowedStatuses = ["UP", "DOWN", "PENDING"];
      const fetchedSites: Site[] = apiData
        .filter((apiSite: any) => allowedStatuses.includes(apiSite.status))
        .map((apiSite: any) => ({
          id: apiSite.id,
          sitio: apiSite.sitio,
          departamento: normalizeDepartment(apiSite.departamento),
          municipio: apiSite.municipio,
          distrito: apiSite.distrito,
          coordenadas: [
            Number.parseFloat(apiSite.latitud),
            Number.parseFloat(apiSite.longitud),
          ] as [number, number],
          url: "",
          ip: "",
          status:
            apiSite.status === "UP"
              ? 1
              : apiSite.status === "PENDING"
                ? 0
                : -1,
          apiStatus: apiSite.status,
          responseTime: apiSite.response_time,
        }));

      // ✅ Validar coordenadas válidas
      const validSites = fetchedSites.filter(
        (site) => !isNaN(site.coordenadas[0]) && !isNaN(site.coordenadas[1])
      );

      console.log(`Loaded ${validSites.length} valid sites (with UP, DOWN or PENDING)`);
      setSites(validSites);
      setLastUpdated(new Date());
      setUsingMockData(isMockData);
      setApiConnected(!isMockData);

      if (isMockData && errorReason) {
        console.warn("Using mock data due to:", errorReason);
      }

      // 🚨 Alertar DOWN y PENDING
      setAlerts((prevAlerts) => {
        const newProblemSites = validSites.filter(
          (site) =>
            (site.apiStatus === "DOWN" || site.apiStatus === "PENDING") &&
            !prevAlerts.some((alert) => alert.id === site.id)
        );

        if (newProblemSites.length > 0) {
          newProblemSites.forEach((alertToAdd) => {
            setTimeout(() => {
              setAlerts((latestAlerts) =>
                latestAlerts.filter((alert) => alert.id !== alertToAdd.id)
              );
            }, 5000);
          });
          return [...prevAlerts, ...newProblemSites];
        }
        return prevAlerts;
      });

      // 📍 Agrupar departamentos
      const uniqueDepartments = Array.from(
        new Set(validSites.map((site) => site.departamento))
      )
        .filter(Boolean)
        .sort();

      setDepartments(uniqueDepartments);

      if (
        selectedDepartmentsRef.current.length === 0 &&
        uniqueDepartments.length > 0
      ) {
        setSelectedDepartments(uniqueDepartments);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setError(
        "Failed to load data from API. Check Docker container status or API route response."
      );
      setUsingMockData(true);
      setApiConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);



  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);


  useEffect(() => {
    if (loadDataRef.current) {
      loadDataRef.current();
    }
  }, [loadData, retryCount]); // `loadData` y `retryCount` son dependencias aquí


  // Set up monitoring interval (Polling)
  // Este useEffect solo se configura una vez al montar el componente.
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      console.log("Polling for site data updates...");
      // Asegurarse de que loadDataRef.current no sea null antes de llamarlo
      if (loadDataRef.current) {
        loadDataRef.current();
      }
    }, 180000); // 180000 ms = 3 minutes

    return () => clearInterval(pollingInterval);
  }, []); // Array de dependencias vacío para que se ejecute solo una vez.


  // Apply filters when filter criteria change OR when sites data changes
  useEffect(() => {
    applyFilters(sites);
  }, [sites, selectedDepartments, statusFilter, searchQuery, applyFilters]);


  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) => {
      const newSelection = prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept];
      return newSelection;
    });
  };

  const selectAllDepartments = () => {
    setSelectedDepartments(departments);
  };

  const clearDepartmentSelection = () => {
    setSelectedDepartments([]);
  };

  // removeAlert ya definido arriba con useCallback


  const handleAlertClick = (site: Site) => {
    setSelectedSite(site);
    setIsModalOpen(true);
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleRefresh = async () => {
    // Usar loadDataRef.current para el refresh manual también
    if (loadDataRef.current) {
      await loadDataRef.current();
    }
  };

  const exportData = useCallback(() => {
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
    ];
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
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `el_salvador_sites_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredSites]);

  const totalSites = sites.length;
  const upSites = sites.filter((site) => site.apiStatus === "UP").length;
  const pendingSites = sites.filter((site) => site.apiStatus === "PENDING").length;
  const noDataSites = sites.filter((site) => site.apiStatus === "DOWN").length;
  const avgResponseTime =
    sites
      .filter((site) => site.responseTime !== null && site.responseTime !== -1)
      .reduce((sum, site) => sum + (site.responseTime || 0), 0) /
    sites.filter((site) => site.responseTime !== null && site.responseTime !== -1).length || 0;


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
                setSelectedSite(site);
                setIsModalOpen(true);
              }}
            />
          ) : (
            <SitesList
              sites={filteredSites}
              onSiteClick={(site) => {
                setSelectedSite(site);
                setIsModalOpen(true);
              }}
              className="mt-60 px-4"
            />
          )}

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
                {/* <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                  <span className="sr-only">List View</span>
                </Button> */}
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
                {/* <Clock className="h-3 w-3" />
                Avg Response: {avgResponseTime > 0 ? `${Math.round(avgResponseTime)}ms` : "N/A"} */}
              </div>
              <div>Data Source: {usingMockData ? "Mock Data" : "API - Monitoreo"}</div>
              <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
            </div>

            {/* <div className="flex gap-2 mt-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={handleRefresh}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={exportData}>
                <Download className="h-3 w-3 mr-2" />
                Export
              </Button>
            </div> */}

            {/* <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div> */}

            {/* <div className="flex gap-2 mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 flex-1">
                    <Filter className="h-4 w-4" />
                    Departments ({selectedDepartments.length}/{departments.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  sideOffset={8}
                  className="w-56 max-h-[300px] overflow-y-auto z-50 bg-white shadow-md border rounded-md"
                >
                  <DropdownMenuCheckboxItem
                    checked={selectedDepartments.length === departments.length}
                    onCheckedChange={selectAllDepartments}
                  >
                    Select All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={selectedDepartments.length === 0}
                    onCheckedChange={clearDepartmentSelection}
                  >
                    Clear All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem disabled />
                  {departments.map((dept) => (
                    <DropdownMenuCheckboxItem
                      key={dept}
                      checked={selectedDepartments.includes(dept)}
                      onCheckedChange={() => toggleDepartment(dept)}
                    >
                      {dept}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 flex-1">
                    <Filter className="h-4 w-4" />
                    Status ({statusFilter || "All"})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  sideOffset={8}
                  className="w-56 z-50 bg-white shadow-md border rounded-md"
                >
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === null}
                    onCheckedChange={() => setStatusFilter(null)}
                  >
                    All Statuses
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "UP"}
                    onCheckedChange={() => setStatusFilter("UP")}
                  >
                    Up
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "PENDING"}
                    onCheckedChange={() => setStatusFilter("PENDING")}
                  >
                    Pending
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "DOWN"}
                    onCheckedChange={() => setStatusFilter("DOWN")}
                  >
                    Down
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div> */}

          </div>

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
                    e.stopPropagation();
                    removeAlert(site);
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            ))}
          </div>

          <SiteModal site={selectedSite} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
      )}
    </div>
  );
}