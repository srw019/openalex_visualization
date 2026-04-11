import { useState, useEffect } from "react"

const BASE = "https://api.openalex.org"
const MAILTO = "srw019@uregina.ca"
// we were here 8 48

const getIdSuffix = (openAlexId) => String(openAlexId).split("/").pop()

function buildHierarchy(domains) {
  const children = domains
    .filter((domain) => domain.fields && domain.fields.length > 0)
    .map((domain) => {
      const fieldChildren = domain.fields
        .filter((field) => field && field.display_name)
        .map((field) => {
          const subChildren = (field.subfields ?? [])
            .filter((sub) => sub && sub.display_name)
            .map((sub) => ({
              name: sub.display_name,
              id: sub.id,
              works_count: sub.works_count ?? 0,
              value: Math.max(sub.works_count ?? 1, 1),
            }))

          if (subChildren.length === 0) {
            return {
              name: field.display_name,
              id: field.id,
              works_count: field.works_count ?? 0,
              value: Math.max(field.works_count ?? 1, 1),
            }
          }

          return {
            name: field.display_name,
            id: field.id,
            works_count: field.works_count ?? 0,
            children: subChildren,
          }
        })

      return {
        name: domain.display_name,
        id: domain.id,
        works_count: domain.works_count ?? 0,
        children: fieldChildren,
      }
    })

  return { name: "root", children }
}

export function useOpenAlex() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        // 1. Get Physical Sciences domain only
        const domainRes = await fetch(
          `${BASE}/domains?per-page=200&mailto=${MAILTO}`
        )
        const domainJson = await domainRes.json()
        const physicalSci = domainJson.results.find(
          (d) => d.display_name === "Physical Sciences"
        )

        if (!physicalSci) throw new Error("Physical Sciences domain not found")

        // 2. Fetch all fields under Physical Sciences (includes subfields)
        const domainId = getIdSuffix(physicalSci.id)
        const fRes = await fetch(
          `${BASE}/fields?filter=domain.id:${domainId}&per-page=200&mailto=${MAILTO}`
        )
        const fJson = await fRes.json()

        if (!Array.isArray(fJson.results) || fJson.results.length === 0) {
          throw new Error("No fields returned for Physical Sciences from OpenAlex")
        }

        // 3. For each field, fetch its subfields
        const fieldsWithSubs = await Promise.all(
          fJson.results.map(async (field) => {
            const fieldId = getIdSuffix(field.id)
            const sRes = await fetch(
              `${BASE}/subfields?filter=field.id:${fieldId}&per-page=200&mailto=${MAILTO}`
            )
            const sJson = await sRes.json()
            return { ...field, subfields: sJson.results ?? [] }
          })
        )

        const enrichedDomain = { ...physicalSci, fields: fieldsWithSubs }
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
