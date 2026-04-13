import { useEffect, useRef, useState, useMemo } from "react"
import * as d3 from "d3"

const PALETTE = [
  "#378ADD", "#1D9E75", "#D85A30", "#BA7517",
  "#7F77DD", "#D4537E", "#639922", "#5F5E5A",
  "#E24B4A", "#888780",
]
const UNKNOWN_INSTITUTION = "Unknown"
const UNKNOWN_COLOR = "#A0A0A0"

const getNodeId = (value) => value?.id ?? value

function matchesAuthorName(authorName, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const queryTokens = q.split(/\s+/).filter(Boolean)
  const nameTokens = authorName
    .toLowerCase()
    .split(/[\s.,'`-]+/)
    .filter(Boolean)

  if (queryTokens.length === 1) {
    return nameTokens.some((t) => t === queryTokens[0])
  }

  for (let i = 0; i <= nameTokens.length - queryTokens.length; i++) {
    const isSequenceMatch = queryTokens.every((qt, j) => nameTokens[i + j] === qt)
    if (isSequenceMatch) return true
  }

  return false
}

export default function AuthorNetwork({ nodes, edges, visibleN, onVisibleNChange, visibleMax }) {
  const svgRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const simNodesRef = useRef([])
  const simEdgesRef = useRef([])
  const paintSelectionRef = useRef(null)
  const selectedNodeRef = useRef(null)
  const [selectedInstitutions, setSelectedInstitutions] = useState([])
  const [search, setSearch] = useState("")
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const minVisible = Math.min(5, Math.max(1, visibleMax))
  const selectedInstitutionSet = useMemo(() => new Set(selectedInstitutions), [selectedInstitutions])
  const hasInstitutionFilter = selectedInstitutions.length > 0

  const getVisibleAuthors = (sourceNodes, activeInstitutions, limit) =>
    sourceNodes
      .filter((n) => activeInstitutions.length === 0 || activeInstitutions.includes(n.institution))
      .sort((a, b) => b.paperCount - a.paperCount)
      .slice(0, limit)

  const rankedNodes = useMemo(
    () => [...nodes].sort((a, b) => b.paperCount - a.paperCount).slice(0, visibleN),
    [nodes, visibleN]
  )

  const filteredNodes = useMemo(
    () => getVisibleAuthors(nodes, selectedInstitutions, visibleN),
    [nodes, selectedInstitutions, visibleN]
  )

  const sortedNodes = filteredNodes

  const instColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    for (const n of rankedNodes) {
      if (!map[n.institution]) {
        if (n.institution === UNKNOWN_INSTITUTION) {
          map[n.institution] = UNKNOWN_COLOR
        } else {
          map[n.institution] = PALETTE[idx % 9]
          idx++
        }
      }
    }
    return map
  }, [rankedNodes])

  const visibleIds = useMemo(() => new Set(sortedNodes.map((n) => n.id)), [sortedNodes])
  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [edges, visibleIds]
  )

  const resolveSelectedNodeId = (searchValue, nextSelectedInstitutions, nextVisibleN) => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return null

    const matchedAuthor = getVisibleAuthors(nodes, nextSelectedInstitutions, nextVisibleN)
      .find((n) => matchesAuthorName(n.name, q))

    return matchedAuthor?.id ?? null
  }

  const applyInstitutionFilter = (nextSelectedInstitutions) => {
    setSelectedInstitutions(nextSelectedInstitutions)

    const nextSelectedNodeId = resolveSelectedNodeId(search, nextSelectedInstitutions, visibleN)
    selectedNodeRef.current = nextSelectedNodeId
    setSelectedNodeId(nextSelectedNodeId)
  }

  const toggleInstitution = (institution) => {
    if (selectedInstitutionSet.has(institution)) {
      applyInstitutionFilter(selectedInstitutions.filter((item) => item !== institution))
      return
    }
    applyInstitutionFilter([...selectedInstitutions, institution])
  }

  useEffect(() => {
    selectedNodeRef.current = selectedNodeId
  }, [selectedNodeId])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const container = svgRef.current?.parentElement
    if (!container) return
    const width = container.clientWidth
    const height = container.clientHeight

    svg.selectAll("*").remove()
    svg.attr("width", width).attr("height", height)

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .style("cursor", "default")
      .on("click", () => {
        selectedNodeRef.current = null
        setSelectedNodeId(null)
      })

    const simNodes = sortedNodes.map((n) => ({ ...n }))
    const simEdges = visibleEdges.map((e) => ({ ...e }))
    simNodesRef.current = simNodes
    simEdgesRef.current = simEdges

    const g = svg.append("g")
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform))
    zoomBehaviorRef.current = zoomBehavior
    svg.call(zoomBehavior)

    simNodes.forEach((n) => {
      n.x = width / 2 + (Math.random() - 0.5) * 180
      n.y = height / 2 + (Math.random() - 0.5) * 180
    })

    const sim = d3.forceSimulation(simNodes)
      .force("link",
        d3.forceLink(simEdges)
          .id((d) => d.id)
          .distance((d) => Math.max(65, 120 - (d.weight ?? 1) * 10))
          .strength((d) => Math.min(0.55, 0.18 + (d.weight ?? 1) * 0.06))
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("collide",
        d3.forceCollide().radius((d) => Math.sqrt(d.paperCount) * 3 + 18)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.03))
      .force("y", d3.forceY(height / 2).strength(0.03))
      .alphaDecay(0.025)

    const linkSel = g.append("g").selectAll("line")
      .data(simEdges)
      .join("line")
      .attr("stroke", "rgba(51,65,85,0.55)")
      .attr("stroke-width", (d) => Math.max(0.6, d.weight * 0.8))

    const nodeSel = g.append("g").selectAll("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation()
        selectedNodeRef.current = d.id
        setSelectedNodeId(d.id)
      })
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.2).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )
      .on("mouseenter", (event, d) => {
        setTooltip({ d, x: event.clientX, y: event.clientY })
      })
      .on("mousemove", (event) => {
        setTooltip((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY } : null)
      })
      .on("mouseleave", () => setTooltip(null))

    const applySelectionStyles = () => {
      const currentSelectedId = selectedNodeRef.current
      const selectedNeighbors = new Set()

      if (currentSelectedId) {
        for (const edge of simEdges) {
          const sourceId = getNodeId(edge.source)
          const targetId = getNodeId(edge.target)
          if (sourceId === currentSelectedId || targetId === currentSelectedId) {
            selectedNeighbors.add(sourceId)
            selectedNeighbors.add(targetId)
          }
        }
      }

      nodeSel.attr("opacity", (d) =>
        currentSelectedId
          ? (selectedNeighbors.has(d.id) ? 1 : 0.08)
          : (!hasInstitutionFilter || selectedInstitutionSet.has(d.institution) ? 1 : 0.12)
      )

      nodeCircleSel
        .attr("stroke-width", (d) => (d.id === currentSelectedId ? 4 : 2))
        .attr("filter", (d) => (d.id === currentSelectedId ? "drop-shadow(0 0 5px rgba(59,130,246,0.55))" : null))

      linkSel.attr("opacity", (d) => {
        if (currentSelectedId) {
          const sourceId = getNodeId(d.source)
          const targetId = getNodeId(d.target)
          return sourceId === currentSelectedId || targetId === currentSelectedId ? 0.85 : 0.05
        }
        if (!hasInstitutionFilter) return 0.7
        const sInst = simNodes.find((n) => n.id === getNodeId(d.source))?.institution
        const tInst = simNodes.find((n) => n.id === getNodeId(d.target))?.institution
        return selectedInstitutionSet.has(sInst) || selectedInstitutionSet.has(tInst) ? 0.6 : 0.05
      })
    }

    paintSelectionRef.current = applySelectionStyles

    svg.on("click", () => {
      selectedNodeRef.current = null
      setSelectedNodeId(null)
    })

    const nodeCircleSel = nodeSel.append("circle")
      .attr("r", (d) => Math.max(7, Math.sqrt(d.paperCount) * 3))
      .attr("fill", "#111")
      .attr("stroke", (d) => instColorMap[d.institution] ?? "#888")
      .attr("stroke-width", 2)

    nodeSel.append("text")
      .text((d) => d.paperCount)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", (d) => Math.min(Math.max(Math.sqrt(d.paperCount) * 2, 7), 11))
      .attr("fill", (d) => instColorMap[d.institution] ?? "#888")
      .attr("font-weight", "600")
      .attr("pointer-events", "none")

    nodeSel.append("text")
      .text((d) => d.name.split(" ").pop())
      .attr("text-anchor", "middle")
      .attr("y", (d) => Math.max(7, Math.sqrt(d.paperCount) * 3) + 11)
      .attr("font-size", 9)
      .attr("fill", "rgba(15,23,42,0.78)")
      .attr("pointer-events", "none")

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)

      nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`)

      applySelectionStyles()
    })

    return () => sim.stop()
  }, [sortedNodes, visibleEdges, instColorMap, hasInstitutionFilter, selectedInstitutionSet])

  useEffect(() => {
    paintSelectionRef.current?.()
  }, [selectedNodeId, selectedInstitutions, search, visibleN])

  useEffect(() => {
    const svgElement = d3.select(svgRef.current)
    const zoomBehavior = zoomBehaviorRef.current
    const simNodes = simNodesRef.current
    const simEdges = simEdgesRef.current
    const selectedId = selectedNodeId
    const container = svgRef.current?.parentElement

    if (!svgRef.current || !zoomBehavior || !container || simNodes.length === 0) return

    const width = container.clientWidth
    const height = container.clientHeight

    if (!selectedId) {
      svgElement.transition().duration(550).call(zoomBehavior.transform, d3.zoomIdentity)
      return
    }

    const connectedIds = new Set([selectedId])
    for (const edge of simEdges) {
      const sourceId = getNodeId(edge.source)
      const targetId = getNodeId(edge.target)
      if (sourceId === selectedId || targetId === selectedId) {
        connectedIds.add(sourceId)
        connectedIds.add(targetId)
      }
    }

    const clusterNodes = simNodes.filter((node) => connectedIds.has(node.id))
    if (clusterNodes.length === 0) return

    const xs = clusterNodes.map((node) => node.x)
    const ys = clusterNodes.map((node) => node.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const clusterWidth = Math.max(maxX - minX, 1)
    const clusterHeight = Math.max(maxY - minY, 1)
    const padding = 48
    const scale = Math.min(
      2.4,
      0.88 / Math.max(
        clusterWidth / Math.max(width - padding * 2, 1),
        clusterHeight / Math.max(height - padding * 2, 1)
      )
    )
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY)

    svgElement.transition().duration(650).call(zoomBehavior.transform, transform)
  }, [selectedNodeId])

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          background: "rgba(248,250,252,0.92)",
          padding: "5px 8px",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.12)",
          fontSize: 11,
          color: "rgba(15,23,42,0.72)",
        }}
      >
        <span>Authors</span>
        <input
          type="range" min={minVisible} max={Math.max(minVisible, visibleMax)} step={1}
          value={visibleN}
          onChange={(e) => {
            const nextVisibleN = Number(e.target.value)
            onVisibleNChange(nextVisibleN)

            const nextSelectedNodeId = resolveSelectedNodeId(search, selectedInstitutions, nextVisibleN)
            selectedNodeRef.current = nextSelectedNodeId
            setSelectedNodeId(nextSelectedNodeId)
          }}
          style={{ width: 70 }}
        />
        <span style={{ color: "#0f172a", fontWeight: 600, minWidth: 20 }}>{visibleN}</span>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            const nextSearch = e.target.value
            setSearch(nextSearch)

            const nextSelectedNodeId = resolveSelectedNodeId(nextSearch, selectedInstitutions, visibleN)
            selectedNodeRef.current = nextSelectedNodeId
            setSelectedNodeId(nextSelectedNodeId)
          }}
          placeholder="Search author"
          style={{
            fontSize: 11,
            padding: "3px 7px",
            width: 150,
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.18)",
            background: "#ffffff",
            color: "#0f172a",
          }}
        />

        {selectedNodeId && (
          <button
            onClick={() => {
              selectedNodeRef.current = null
              setSelectedNodeId(null)
            }}
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "#ffffff",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Back to full network
          </button>
        )}
      </div>

      <div
        style={{
          position: "absolute", top: 58, right: 12, zIndex: 10,
          display: "flex", flexDirection: "column", gap: 6,
          background: "rgba(248,250,252,0.9)",
          padding: "5px 8px", borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.12)",
          maxWidth: 180,
          maxHeight: "calc(100% - 80px)",
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => applyInstitutionFilter([])}
          style={{
            fontSize: 10,
            padding: "3px 6px",
            borderRadius: 6,
            border: !hasInstitutionFilter ? "1px solid rgba(37,99,235,0.45)" : "1px solid rgba(0,0,0,0.12)",
            background: !hasInstitutionFilter ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.8)",
            color: !hasInstitutionFilter ? "#1d4ed8" : "rgba(15,23,42,0.7)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          All institutions
        </button>
        {Object.entries(instColorMap).map(([inst, col]) => (
          <button
            key={inst}
            onClick={() => toggleInstitution(inst)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              width: "100%",
              borderRadius: 6,
              border: selectedInstitutionSet.has(inst) ? "1px solid rgba(0,0,0,0.25)" : "1px solid transparent",
              background: selectedInstitutionSet.has(inst) ? "rgba(255,255,255,0.85)" : "transparent",
              padding: "2px 4px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <svg width="16" height="16">
              <circle cx="8" cy="8" r="5" fill={col} />
            </svg>
            <span style={{ color: "rgba(15,23,42,0.75)" }}>
              {inst.length > 14 ? inst.slice(0, 12) + "…" : inst}
            </span>
            <span style={{ marginLeft: "auto", color: "rgba(15,23,42,0.55)", opacity: selectedInstitutionSet.has(inst) ? 1 : 0 }}>
              ✓
            </span>
          </button>
        ))}
      </div>

      <svg ref={svgRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: "rgba(15,15,25,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 12,
            color: "white",
            pointerEvents: "none",
            zIndex: 999,
            maxWidth: 200,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltip.d.name}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            {tooltip.d.institution}
          </div>
          <div style={{ marginTop: 4, fontSize: 11 }}>
            {tooltip.d.paperCount} works
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
            Articles: {tooltip.d.workTypes?.article ?? 0} ·
            Books: {tooltip.d.workTypes?.book ?? 0} ·
            Datasets: {tooltip.d.workTypes?.dataset ?? 0}
          </div>
        </div>
      )}
    </div>
  )
}