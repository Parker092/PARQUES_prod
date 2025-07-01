import { type NextRequest, NextResponse } from "next/server"
import { mockSitesData } from "@/lib/mock-data"

// Docker API configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://api:3000"
const API_TIMEOUT = 60000 // 1Minutes

export async function GET(request: NextRequest) {
  try {
    console.log(`Attempting to fetch from Docker API: ${API_BASE_URL}/sites`)

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    const response = await fetch(`${API_BASE_URL}/sites`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // Add user agent to help with some API gateways
        "User-Agent": "NextJS-Dashboard/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId)
    })

    if (!response.ok) {
      console.error(`API responded with status: ${response.status} ${response.statusText}`)
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Successfully fetched ${data.length} sites from Docker API`)

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Data-Source": "api",
      },
    })
  } catch (error) {
    console.error("Error connecting to Docker API:", error)

    // Log specific error types for debugging
    if (error.name === "AbortError") {
      console.error("Request timed out after", API_TIMEOUT, "ms")
    } else if (error.code === "ECONNREFUSED") {
      console.error("Connection refused - Docker container may not be running or accessible")
    } else if (error.code === "ENOTFOUND") {
      console.error("Host not found - Check Docker networking configuration")
    }

    // Return mock data as fallback
    console.log("Returning mock data as fallback due to Docker API connection failure")
    return NextResponse.json(mockSitesData, {
      status: 200,
      headers: {
        "X-Data-Source": "mock",
        "X-Error-Reason": error.message || "Unknown error",
        "Cache-Control": "no-store, max-age=0",
      },
    })
  }
}
