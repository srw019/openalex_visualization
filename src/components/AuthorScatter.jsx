import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"

const PALETTE = [
  "#378ADD", "#1D9E75", "#D85A30", "#BA7517",
  "#7F77DD", "#D4537E", "#639922", "#5F5E5A",
  "#E24B4A", "#888780",
]
const UNKNOWN_COLOR = "#A0A0A0"
const LEGEND_WIDTH = 190

function matchesAuthorName(authorName, query) {
  // Same token-based name search as network view.
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

export default function AuthorScatter({ nodes, visibleN, onVisibleNChange, visibleMax }) {
  const svgRef = useRef(null)
  const plotAreaRef = useRef(null)
  const [search, setSearch] = useState("")
  const [tooltip, setTooltip] = useState(null)
  const [selectedInstitutions, setSelectedInstitutions] = useState([])
  const [dims, setDims] = useState({ width: 600, height: 400 })
  const minVisible = Math.min(5, Math.max(1, visibleMax))
  const selectedInstitutionSet = useMemo(() => new Set(selectedInstitutions), [selectedInstitutions])
  const hasInstitutionFilter = selectedInstitutions.length > 0
  // Keep top authors for the current slider range.
  const rankedNodes = useMemo(
    () => [...nodes].sort((a, b) => b.paperCount - a.paperCount).slice(0, visibleN),
    [nodes, visibleN]
  )

  const instColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    for (const n of rankedNodes) {
      if (!map[n.institution]) {
        map[n.institution] =
          n.institution === "Unknown"
            ? UNKNOWN_COLOR
            : PALETTE[idx++ % PALETTE.length]
      }
    }
    return map
  }, [rankedNodes])

  const toggleInstitution = (institution) => {
    if (selectedInstitutionSet.has(institution)) {
      setSelectedInstitutions(selectedInstitutions.filter((item) => item !== institution))
      return
    }
    setSelectedInstitutions([...selectedInstitutions, institution])
  }

  useEffect(() => {
    // Measure plotting area before drawing.
    if (!plotAreaRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, 200),
      })
    })
    ro.observe(plotAreaRef.current)
    return () => ro.disconnect()
  }, [])

  const draw = useCallback(() => {
    // Redraw from scratch because D3 owns SVG nodes.
    const chartWidth = Math.max(dims.width, 220)
    const chartHeight = dims.height
    const padding = { left: 66, right: 28, top: 28, bottom: 58 }
    const plotWidth = chartWidth - padding.left - padding.right
    const plotHeight = chartHeight - padding.top - padding.bottom

    const visibleNodes = rankedNodes
      .filter((a) => !hasInstitutionFilter || selectedInstitutionSet.has(a.institution))
      .slice(0, visibleN)

    // Build scales from current visible data.
    const maxWorksRaw = d3.max(visibleNodes, (n) => n.paperCount) ?? 1
    const maxCitRaw = d3.max(visibleNodes, (n) => n.citations ?? 0) ?? 1
    const maxWorks = Math.max(1, maxWorksRaw) * 1.05
    const maxCit = Math.max(1, maxCitRaw) * 1.05

    const xScale = d3.scaleLinear().domain([0, maxWorks]).nice().range([0, plotWidth]).clamp(true)
    const yScale = d3.scaleLinear().domain([0, maxCit]).nice().range([plotHeight, 0]).clamp(true)

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", chartWidth).attr("height", chartHeight).attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)

    const chartLayer = svg.append("g").attr("transform", `translate(${padding.left},${padding.top})`)
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "author-scatter-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", plotWidth)
      .attr("height", plotHeight)

    const nodeLayer = chartLayer.append("g").attr("clip-path", "url(#author-scatter-clip)")

    const xTicks = xScale.ticks(5)
    const yTicks = yScale.ticks(5)

    for (const tick of yTicks) {
      const yy = yScale(tick)
      chartLayer.append("line")
        .attr("x1", 0)
        .attr("y1", yy)
        .attr("x2", plotWidth)
        .attr("y2", yy)
        .attr("stroke", "rgba(0,0,0,0.07)")
        .attr("stroke-width", 0.5)

      chartLayer.append("text")
        .attr("x", -6)
        .attr("y", yy + 4)
        .attr("text-anchor", "end")
        .attr("font-size", 9)
        .attr("fill", "rgba(15,23,42,0.45)")
        .text(tick >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick))
    }

    for (const tick of xTicks) {
      const xx = xScale(tick)
      chartLayer.append("line")
        .attr("x1", xx)
        .attr("y1", 0)
        .attr("x2", xx)
        .attr("y2", plotHeight)
        .attr("stroke", "rgba(0,0,0,0.07)")
        .attr("stroke-width", 0.5)

      chartLayer.append("text")
        .attr("x", xx)
        .attr("y", plotHeight + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("fill", "rgba(15,23,42,0.45)")
        .text(tick >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick))
    }

    chartLayer.append("line")
      .attr("x1", 0)
      .attr("y1", plotHeight)
      .attr("x2", plotWidth)
      .attr("y2", plotHeight)
      .attr("stroke", "rgba(0,0,0,0.22)")
      .attr("stroke-width", 0.8)
    chartLayer.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", plotHeight)
      .attr("stroke", "rgba(0,0,0,0.22)")
      .attr("stroke-width", 0.8)

    chartLayer.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(plotHeight / 2))
      .attr("y", -44)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "rgba(15,23,42,0.5)")
      .text("Total citations")

    chartLayer.append("text")
      .attr("x", plotWidth / 2)
      .attr("y", plotHeight + 42)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "rgba(15,23,42,0.5)")
      .text("Total works")


    const searchQuery = search.toLowerCase().trim()
    const plottedNodes = visibleNodes.map((a) => {
      // Compute per-point size, color, and search state.
      const r = Math.max(5, Math.sqrt(a.paperCount) * 1.6)
      const col = instColorMap[a.institution] ?? UNKNOWN_COLOR
      const isMatch = matchesAuthorName(a.name, searchQuery)
      const x = xScale(a.paperCount)
      const y = yScale(a.citations ?? 0)
      return {
        ...a,
        r,
        col,
        isMatch,
        op: searchQuery && !isMatch ? 0.06 : 1,
        x,
        y,
      }
    })

    plottedNodes.forEach((a) => {
      a.x = Math.max(a.r, Math.min(plotWidth - a.r, a.x))
      a.y = Math.max(a.r, Math.min(plotHeight - a.r, a.y))
      const glow = a.isMatch && searchQuery ? 0.18 : 0
      const ng = nodeLayer
        .append("g")
        .attr("transform", `translate(${a.x},${a.y})`)
        .attr("opacity", a.op)

      if (glow > 0) {
        // Soft glow for search matches.
        ng.append("circle")
          .attr("r", a.r + 8)
          .attr("fill", a.col)
          .attr("fill-opacity", glow)
          .attr("stroke", "none")
      }

      ng.append("circle")
        .attr("r", a.r)
        .attr("fill", a.col)
        .attr("fill-opacity", 0.65)
        .attr("stroke", a.col)
        .attr("stroke-width", 1.8)

      ng.on("mouseenter", (event) => setTooltip({ x: event.clientX, y: event.clientY, author: a }))
        .on("mousemove", (event) =>
          setTooltip((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : null))
        )
        .on("mouseleave", () => setTooltip(null))
    })
  }, [dims, instColorMap, rankedNodes, search, visibleN, hasInstitutionFilter, selectedInstitutionSet])

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return
    draw()
  }, [draw, nodes.length])

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "10px 14px",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        background: "#f3f4f6",
        color: "#0f172a",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, flexShrink: 0 }}>
        {/* Controls stay above the chart area. */}
        <span style={lbl}>Authors</span>
        <input
          type="range"
          min={minVisible}
          max={Math.max(minVisible, visibleMax)}
          step={1}
          value={visibleN}
          onChange={(e) => onVisibleNChange(Number(e.target.value))}
          style={{ width: 70 }}
        />
        <span style={{ ...lbl, color: "#0f172a", fontWeight: 600, minWidth: 20 }}>{visibleN}</span>

        <span style={lbl}>Search</span>
        <input
          type="text"
          value={search}
          placeholder="search author name..."
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inp, width: 170 }}
        />
        {search && <button onClick={() => setSearch("")} style={btn}>Clear</button>}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", gap: 8 }}>
        <div ref={plotAreaRef} style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
          <svg ref={svgRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(248,250,252,0.9)",
            padding: "5px 8px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.12)",
            width: LEGEND_WIDTH - 10,
            maxHeight: "100%",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {/* Institution buttons act as legend filters. */}
          <button
            onClick={() => setSelectedInstitutions([])}
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
              title={inst}
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
                {inst.length > 14 ? `${inst.slice(0, 12)}…` : inst}
              </span>
              <span style={{ marginLeft: "auto", color: "rgba(15,23,42,0.55)", opacity: selectedInstitutionSet.has(inst) ? 1 : 0 }}>
                ✓
              </span>
            </button>
          ))}
        </div>
      </div>

      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10, background: "rgba(15,23,42,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "white", pointerEvents: "none", zIndex: 999, lineHeight: 1.6, maxWidth: 200 }}>
          <div style={{ fontWeight: 600 }}>{tooltip.author.name}</div>
          <div style={{ color: instColorMap[tooltip.author.institution] ?? "#aaa", fontSize: 10, marginBottom: 3 }}>{tooltip.author.institution}</div>
          <div>Works: {tooltip.author.paperCount}</div>
          <div>Citations: {(tooltip.author.citations ?? 0).toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}

const lbl = { fontSize: 11, color: "rgba(15,23,42,0.65)", whiteSpace: "nowrap" }
const inp = { fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.18)", background: "#fff", color: "#0f172a" }
const btn = { fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.18)", background: "transparent", color: "rgba(15,23,42,0.65)", cursor: "pointer" }
