import { useState, useEffect } from "react"
import { buildHierarchy } from "../utils/dataTransform.js"

const BASE = "https://api.openalex.org"
const MAILTO = "srw019@uregina.ca"

const getIdSuffix = (openAlexId) => String(openAlexId).split("/").pop()

export function useOpenAlex() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      // Small helper so each OpenAlex request stays readable.
      const fetchJson = async (url) => {
        const response = await fetch(url)
        return response.json()
      }

      try {
        // Load the top-level domain list and keep only Physical Sciences.
        const domainJson = await fetchJson(`${BASE}/domains?per-page=200&mailto=${MAILTO}`)
        const physicalSci = domainJson.results.find(
          (d) => d.display_name === "Physical Sciences"
        )

        if (!physicalSci) throw new Error("Physical Sciences domain not found")

        const domainId = getIdSuffix(physicalSci.id)
        // Fetch all fields in the selected domain.
        const fJson = await fetchJson(
          `${BASE}/fields?filter=domain.id:${domainId}&per-page=200&mailto=${MAILTO}`
        )

        if (!Array.isArray(fJson.results) || fJson.results.length === 0) {
          throw new Error("No fields returned for Physical Sciences from OpenAlex")
        }

        const fieldsWithSubs = await Promise.all(
          // Enrich each field with its subfields before building the hierarchy.
          fJson.results.map(async (field) => {
            const fieldId = getIdSuffix(field.id)
            const sJson = await fetchJson(
              `${BASE}/subfields?filter=field.id:${fieldId}&per-page=200&mailto=${MAILTO}`
            )
            return { ...field, subfields: sJson.results ?? [] }
          })
        )

        const enrichedDomain = { ...physicalSci, fields: fieldsWithSubs }
        // Convert the API response into the tree structure used by the UI.
        const hierarchy = buildHierarchy([enrichedDomain])

        if (!hierarchy.children?.length) {
          throw new Error("OpenAlex returned an empty hierarchy")
        }

        setData(hierarchy)
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  return { data, loading, error }
}
