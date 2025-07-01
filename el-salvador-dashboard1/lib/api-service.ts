import type { Site } from "@/components/map-dashboard"

// API response type
export type ApiSite = {
  id: number
  sitio: string
  departamento: string
  municipio: string
  distrito: string
  latitud: string
  longitud: string
  status: "UP" | "PENDING" | "DOWN"
  response_time: number | null
}

/**
 * Fetch sites data from the API via Next.js API route
 */
export async function fetchSitesFromApi(): Promise<Site[]> {
  try {
    console.log("Fetching sites data from API...")

    // Use the Next.js API route instead of direct API call
    const response = await fetch("/api/sites", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const apiSites: ApiSite[] = await response.json()

    // Check if we're using mock data
    const isMockData = response.headers.get("X-Data-Source") === "mock"
    if (isMockData) {
      console.log("Using mock data (API unavailable)")
    } else {
      console.log(`Successfully fetched ${apiSites.length} sites from API`)
    }

    // Transform API response to our Site format
    const sites: Site[] = apiSites.map((apiSite) => ({
      id: apiSite.id,
      sitio: apiSite.sitio,
      departamento: apiSite.departamento,
      municipio: apiSite.municipio,
      distrito: apiSite.distrito,
      coordenadas: [Number.parseFloat(apiSite.latitud), Number.parseFloat(apiSite.longitud)] as [number, number],
      url: "", // Not provided by API
      ip: "", // Not provided by API
      status: mapApiStatusToNumeric(apiSite.status),
      apiStatus: apiSite.status,
      responseTime: apiSite.response_time,
    }))

    // Filter out sites with invalid coordinates
    const validSites = sites.filter((site) => !isNaN(site.coordenadas[0]) && !isNaN(site.coordenadas[1]))

    console.log(`Processed ${validSites.length} valid sites`)
    return validSites
  } catch (error) {
    console.error("Error fetching sites from API:", error)
    throw error
  }
}

/**
 * Map API status to numeric status for backward compatibility
 */
function mapApiStatusToNumeric(apiStatus: "UP" | "PENDING" | "DOWN"): number {
  switch (apiStatus) {
    case "UP":
      return 1
    case "PENDING":
      return 0
    case "DOWN":
      return -1
    default:
      return 0
  }
}

/**
 * Get status color based on API status
 */
export function getStatusColor(apiStatus: "UP" | "PENDING" | "DOWN"): string {
  switch (apiStatus) {
    case "UP":
      return "green"
    case "PENDING":
      return "yellow"
    case "DOWN":
      return "red"
    default:
      return "gray"
  }
}

/**
 * Get status label based on API status
 */
export function getStatusLabel(apiStatus: "UP" | "PENDING" | "DOWN"): string {
  switch (apiStatus) {
    case "UP":
      return "Online"
    case "PENDING":
      return "Pending"
    case "DOWN":
      return "No Data"
    default:
      return "Unknown"
  }
}

/**
 * Format response time for display
 */
export function formatResponseTime(responseTime: number | null): string {
  if (responseTime === null || responseTime === -1) {
    return "N/A"
  }
  return `${responseTime}ms`
}
