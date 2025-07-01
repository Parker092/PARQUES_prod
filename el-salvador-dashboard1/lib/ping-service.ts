import type { Site } from "@/components/map-dashboard"

/**
 * Pings a URL to check if it's responding
 */
export async function pingUrl(url: string, testMode = true): Promise<boolean> {
  try {
    // Special case for google.com in test mode - always return true
    if (testMode && url === "google.com") {
      return Math.random() < 0.9 // 90% chance of being online in test mode
    }

    // Remove protocol if present
    const cleanUrl = url.replace(/^https?:\/\//, "")

    // Add timeout to avoid long waits
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000)

    const response = await fetch(`https://${cleanUrl}`, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    console.error(`Error pinging ${url}:`, error)
    return false
  }
}

/**
 * Pings all sites and updates their status
 */
export async function pingAllSites(sites: Site[], testMode = true): Promise<Site[]> {
  const updatedSites = await Promise.all(
    sites.map(async (site) => {
      // Skip if URL is not valid
      if (!site.url || site.url === "0.0.0.0") {
        return site
      }

      // For google.com URLs in test mode, randomly set some to offline for testing
      if (testMode && site.url === "google.com") {
        // 90% chance of being online, 10% chance of being offline
        const isUp = Math.random() < 0.9
        return {
          ...site,
          status: isUp ? 1 : 0,
        }
      }

      const isUp = await pingUrl(site.url, testMode)
      return {
        ...site,
        status: isUp ? 1 : 0,
      }
    }),
  )

  return updatedSites
}
