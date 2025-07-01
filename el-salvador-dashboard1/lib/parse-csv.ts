import type { Site } from "@/components/map-dashboard"

// Fallback data in case the fetch fails
const fallbackData = `Sitio	Departamento	Municipio	Distrito	Coordenadas	URL	IP	STATUS
Parque La Concordia	Ahuachapan	Ahuachapán Centro	Ahuachapán	13.919192238119999, -89.84888477936019	ParqueLaConcordia.egob.sv		1
Parque San Martín	La Libertad	La Libertad Sur	Santa Tecla	13.673629720987233, -89.28525065488483	Parque San Martín.egob.sv		0
Parque de Atiquizaya	Ahuachapan	Ahuachapán Norte	Atiquizaya	13.976624487250307, -89.75635848412153	Parque de Atiquizaya.egob.sv		1
Parque Centroamerica	La Libertad	La Libertad Costa	La Libertad	13.488039724843661, -89.32035101058683	Parque Centroamerica.egob.sv		1
Parque La Palma, Chalatenango	Chalatenango	Chalatenango Norte	La Palma	14.317138056788657, -89.1706740705099	Parque La Palma, Chalatenango.egob.sv		0
Parque Rafael Campos, Sosonate	Sonsonate	Sonsonate Centro	Sonsonate	13.721023579990327, -89.72787461729837	Parque Rafael Campos, Sosonate.egob.sv		1
Parque de San Isidro, Cabañas	Cabañas	Chalatenango Sur	San Isidro Labrador	14.009436057848745, -88.84359214589381	Parque de San Isidro, Cabañas.egob.sv		0
Parque de Panchimalco, San Salvador	San Salvador	San Salvador Sur	Panchimalco	13.611474594749689, -89.17950119168214	Parque de Panchimalco, San Salvador.egob.sv		1
Parque Tamanique La Libertad	La Libertad	La Libertad Costa	Tamanique	13.597813482243039, -89.41839966040256	Parque Tamanique La Libertad.egob.sv		1
Parque Cuisnahuat, Sonsonate	Sonsonate	Sonsonate Este	Cuisnahuat	13.63847998149398, -89.60423940432568	Parque Cuisnahuat, Sonsonate.egob.sv		0
Parque Corinto, Morazán	Morazan	Morazán Norte	Corinto	13.808770584691676, -87.96961136183404	Parque Corinto, Morazán.egob.sv		1
Parque Lislique, La Unión	La Union	La Unión Norte	Lislique	13.802966585860034, -87.89736098898041	Parque Lislique, La Unión.egob.sv		0
Parque Central de Ilobasco, Cabañas	Cabañas	Cabañas Oeste	Ilobasco	13.842666124116896, -88.85002298166214	Parque Central de Ilobasco, Cabañas.egob.sv		1
Parque Central de Usulutan, Usulutan	Usulutan	Usulután Este	Usulután	13.345421880447516, -88.43983876986013	Parque Central de Usulutan, Usulutan.egob.sv		1
Parque de Ciudad Dolores, Cabañas	Cabañas	Cabañas Este	Dolores	13.777918823647923, -88.5661225661547	Parque de Ciudad Dolores, Cabañas.egob.sv		0
Parque Central El Paraiso, Chalatenango	Chalatenango	Chalatenango Centro	El Paraíso	14.106367253332529, -89.06887850504116	Parque Central El Paraiso, Chalatenango.egob.sv		1
Plaza Libertad	San Salvador	San Salvador Centro	San Salvador	13.697487864969986, -89.18937920606885	Plaza Libertad.egob.sv		0
Plaza Morazan	San Salvador	San Salvador Centro	San Salvador	13.699375479484631, -89.19036045673155	Plaza Morazan.egob.sv		1
Plaza Barrios	San Salvador	San Salvador Centro	San Salvador	13.697624304981588, -89.1911582234833	Plaza Barrios.egob.sv		1
Plaza Salvador Del Mundo	San Salvador	San Salvador Centro	San Salvador	13.701597295545339, -89.22439060542455	Plaza Salvador Del Mundo.egob.sv		0`

// CSV file URL
const CSV_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Puntos%20Geograficos%20de%20Parques%20con%20Starlink.xlsx%20-%20Hoja%201%20%282%29-N9o399B5Hjy3MIxBOvFja9Zyz8COSg.csv"

/**
 * Parse TSV data into Site objects
 */
export async function parseCsv(): Promise<Site[]> {
  try {
    let csvText = ""

    // Try to fetch the CSV file from the provided URL
    try {
      console.log("Fetching CSV data from new URL...")
      const response = await fetch(CSV_URL, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
      }

      csvText = await response.text()
      console.log("CSV data fetched successfully")
    } catch (fetchError) {
      console.error("Error fetching CSV:", fetchError)
      console.log("Using fallback data instead")
      csvText = fallbackData
    }

    // Parse the CSV/TSV data
    const lines = csvText.split("\n").filter((line) => line.trim() !== "")
    const sites: Site[] = []

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      try {
        // Check if the line is tab-separated or comma-separated
        const isTabSeparated = lines[i].includes("\t")

        // Split by tab or parse CSV line
        const fields = isTabSeparated ? lines[i].split("\t") : parseCSVLine(lines[i])

        if (fields.length >= 8) {
          // Parse coordinates
          const coordsStr = fields[4].trim()
          const coordParts = coordsStr.split(",").map((part) => part.trim())

          if (coordParts.length === 2) {
            const lat = Number.parseFloat(coordParts[0])
            const lng = Number.parseFloat(coordParts[1])

            if (!isNaN(lat) && !isNaN(lng)) {
              // Parse status - handle both numeric and date formats
              let status = 0
              if (fields[7] && fields[7].trim() !== "") {
                // Try to parse as number first
                const statusValue = Number.parseInt(fields[7])
                if (!isNaN(statusValue)) {
                  status = statusValue
                } else {
                  // If it's not a number, assume it's a date and set status to 1 (online)
                  status = 1
                }
              }

              sites.push({
                sitio: fields[0],
                departamento: fields[1],
                municipio: fields[2],
                distrito: fields[3],
                coordenadas: [lat, lng],
                url: fields[5],
                ip: fields[6] || "N/A",
                status: status,
              })
            } else {
              console.error(`Invalid coordinates in line ${i + 1}: ${coordsStr}`)
            }
          } else {
            console.error(`Malformed coordinates in line ${i + 1}: ${coordsStr}`)
          }
        } else {
          console.error(`Line ${i + 1} has fewer than 8 fields: ${fields.length}`)
        }
      } catch (lineError) {
        console.error(`Error parsing line ${i + 1}:`, lineError)
      }
    }

    console.log(`Successfully parsed ${sites.length} sites`)

    if (sites.length === 0) {
      throw new Error("No valid sites found in the data")
    }

    // Update 80% of URLs to google.com for testing
    const sitesToUpdate = Math.floor(sites.length * 0.8)

    // Create a copy of the sites array and shuffle it
    const shuffledSites = [...sites].sort(() => Math.random() - 0.5)

    // Update the first 80% of the shuffled array
    for (let i = 0; i < sitesToUpdate; i++) {
      const siteIndex = sites.findIndex(
        (site) =>
          site.sitio === shuffledSites[i].sitio &&
          site.coordenadas[0] === shuffledSites[i].coordenadas[0] &&
          site.coordenadas[1] === shuffledSites[i].coordenadas[1],
      )

      if (siteIndex !== -1) {
        sites[siteIndex].url = "google.com"
      }
    }

    console.log(`Updated ${sitesToUpdate} sites to use google.com URL`)

    return sites
  } catch (error) {
    console.error("Error parsing CSV:", error)

    // As a last resort, parse the hardcoded fallback data
    try {
      console.log("Using hardcoded fallback data")
      const lines = fallbackData.split("\n").filter((line) => line.trim() !== "")
      const sites: Site[] = []

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split("\t")

        if (fields.length >= 8) {
          const coordsStr = fields[4].trim()
          const coordParts = coordsStr.split(",").map((part) => part.trim())

          if (coordParts.length === 2) {
            const lat = Number.parseFloat(coordParts[0])
            const lng = Number.parseFloat(coordParts[1])

            if (!isNaN(lat) && !isNaN(lng)) {
              sites.push({
                sitio: fields[0],
                departamento: fields[1],
                municipio: fields[2],
                distrito: fields[3],
                coordenadas: [lat, lng],
                url: fields[5],
                ip: fields[6] || "N/A",
                status: Number.parseInt(fields[7]) || 0,
              })
            }
          }
        }
      }

      // Update 80% of URLs to google.com for testing
      const sitesToUpdate = Math.floor(sites.length * 0.8)

      // Create a copy of the sites array and shuffle it
      const shuffledSites = [...sites].sort(() => Math.random() - 0.5)

      // Update the first 80% of the shuffled array
      for (let i = 0; i < sitesToUpdate; i++) {
        const siteIndex = sites.findIndex(
          (site) =>
            site.sitio === shuffledSites[i].sitio &&
            site.coordenadas[0] === shuffledSites[i].coordenadas[0] &&
            site.coordenadas[1] === shuffledSites[i].coordenadas[1],
        )

        if (siteIndex !== -1) {
          sites[siteIndex].url = "google.com"
        }
      }

      console.log(`Updated ${sitesToUpdate} sites to use google.com URL`)

      return sites
    } catch (fallbackError) {
      console.error("Error parsing fallback data:", fallbackError)
      return []
    }
  }
}

/**
 * Parse a CSV line properly handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }

  // Add the last field
  result.push(current)

  // Clean up quotes from fields
  return result.map((field) => field.replace(/"/g, ""))
}
