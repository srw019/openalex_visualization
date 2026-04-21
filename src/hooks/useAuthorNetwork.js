import { useState, useEffect } from "react"

const BASE = "https://api.openalex.org"
const MAILTO = "srw019@uregina.ca"
const WORKS_PAGE_SIZE = 200
const MAX_WORKS_SCAN = 1200
const MAX_INSTITUTIONS = 10
const MAX_AUTHORS = 100

const INITIAL_STATE = {
  nodes: [],
  edges: [],
  stats: { authorCount: 0, workCount: 0, institutionCount: 0 },
  loading: true,
  error: null,
}

const idSuffix = (url) => String(url ?? "").split("/").pop()

const createInitialAuthor = (authorship) => ({
  id: idSuffix(authorship.author?.id),
  name: authorship.author?.display_name ?? "Unknown",
  institution: authorship.institutions?.[0]?.display_name ?? "Unknown",
  paperCount: 0,
  citations: 0,
  workTypes: { article: 0, book: 0, dataset: 0, other: 0 },
})

function normalizeType(type) {
  if (!type) return "other"
  const t = type.toLowerCase()
  if (t === "article" || t === "journal-article") return "article"
  if (t.includes("book")) return "book"
  if (t === "dataset") return "dataset"
  return "other"
}

export function useAuthorNetwork(subfieldId) {
  const [state, setState] = useState(INITIAL_STATE)

  useEffect(() => {
    if (!subfieldId) return
    // Reset to loading whenever the selected subfield changes.
    setState((s) => ({ ...s, loading: true, error: null }))

    async function fetchWorks() {
      // Page through OpenAlex works until we hit the scan limit.
      const rawId = idSuffix(subfieldId)
      const allWorks = []
      let cursor = "*"

      while (cursor) {
        const params = new URLSearchParams({
          filter: `primary_topic.subfield.id:${rawId}`,
          per_page: String(WORKS_PAGE_SIZE),
          sort: "cited_by_count:desc",
          cursor,
          mailto: MAILTO,
        })
        const res = await fetch(`${BASE}/works?${params.toString()}`)
        if (!res.ok) throw new Error(`OpenAlex error: ${res.status}`)
        const json = await res.json()
        const pageWorks = json.results ?? []
        allWorks.push(...pageWorks)

        if (allWorks.length >= MAX_WORKS_SCAN) return allWorks.slice(0, MAX_WORKS_SCAN)

        const nextCursor = json.meta?.next_cursor
        if (!nextCursor || pageWorks.length === 0) break
        cursor = nextCursor
      }

      return allWorks
    }

    async function build() {
      try {
        const works = await fetchWorks()

        // Aggregate works into author-level nodes and co-authorship edges.
        const authorMap = new Map()
        const edgeMap = new Map()

        for (const work of works) {
          const type = normalizeType(work.type)
          const workCit = work.cited_by_count ?? 0
          const authorships = work.authorships ?? []
          const workAuthorIds = []

          for (const authorship of authorships) {
            const authorId = idSuffix(authorship.author?.id)
            if (!authorId) continue

            workAuthorIds.push(authorId)

            if (!authorMap.has(authorId)) {
              authorMap.set(authorId, createInitialAuthor(authorship))
            }

            const author = authorMap.get(authorId)
            author.paperCount += 1
            author.citations += workCit
            author.workTypes[type] = (author.workTypes[type] ?? 0) + 1
          }

          for (let i = 0; i < workAuthorIds.length; i++) {
            for (let j = i + 1; j < workAuthorIds.length; j++) {
              const a = workAuthorIds[i]
              const b = workAuthorIds[j]
              const key = a < b ? `${a}|${b}` : `${b}|${a}`
              edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1)
            }
          }
        }

        const instTotals = new Map()
        // Keep only the busiest institutions and authors so the graph stays readable.
        for (const author of authorMap.values()) {
          instTotals.set(
            author.institution,
            (instTotals.get(author.institution) ?? 0) + author.paperCount
          )
        }
        const allowedInstitutions = new Set(
          Array.from(instTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_INSTITUTIONS)
            .map(([inst]) => inst)
        )

        const nodes = Array.from(authorMap.values())
          .filter((a) => allowedInstitutions.has(a.institution))
          .sort((a, b) => b.paperCount - a.paperCount)
          .slice(0, MAX_AUTHORS)

        const nodeIds = new Set(nodes.map((n) => n.id))

        const edges = Array.from(edgeMap.entries())
          .map(([key, weight]) => {
            const [source, target] = key.split("|")
            return { source, target, weight }
          })
          .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

        const institutions = new Set(nodes.map((n) => n.institution))

        // Count how many works remain represented after node filtering.
        const workIdsForSelectedAuthors = new Set()
        for (const work of works) {
          for (const authorship of work.authorships ?? []) {
            const authorId = idSuffix(authorship.author?.id)
            if (authorId && nodeIds.has(authorId)) {
              const workId = idSuffix(work.id)
              if (workId) workIdsForSelectedAuthors.add(workId)
              break
            }
          }
        }

        setState({
          nodes,
          edges,
          stats: {
            authorCount: nodes.length,
            workCount: workIdsForSelectedAuthors.size,
            institutionCount: institutions.size,
          },
          loading: false,
          error: null,
        })
      } catch (e) {
        console.error(e)
        setState((s) => ({ ...s, loading: false, error: e }))
      }
    }

    build()
  }, [subfieldId])

  return state
}
