import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"

// Match AuthorNetwork palette for institution consistency across tabs.
const PALETTE = [
  "#378ADD", "#1D9E75", "#D85A30", "#BA7517",
  "#7F77DD", "#D4537E", "#639922", "#5F5E5A",
  "#E24B4A", "#888780",
]
const UNKNOWN_COLOR = "#A0A0A0"
const LEGEND_WIDTH = 190

export default function AuthorScatter({ nodes }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [search, setSearch] = useState("")
  const [tooltip, setTooltip] = useState(null)
  const [dims, setDims] = useState({ width: 600, height: 400 })

  const instColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    const sorted = [...nodes].sort((a, b) => b.paperCount - a.paperCount)
    for (const n of sorted) {
      if (!map[n.institution]) {
        map[n.institution] =
          n.institution === "Unknown"
            ? UNKNOWN_COLOR
            : PALETTE[idx++ % PALETTE.length]
      }
    }
    return map
  }, [nodes])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, 200),
      })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const draw = useCallback(() => {
    const W = Math.max(dims.width - LEGEND_WIDTH - 18, 260)
    const H = dims.height
    const pad = { l: 66, r: 28, t: 28, b: 58 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b

    const maxWorks = Math.max(...nodes.map((n) => n.paperCount), 1)
    const maxCit = Math.max(...nodes.map((n) => n.citations ?? 0), 1)
    const xS = d3.scaleSymlog().domain([0, maxWorks]).range([0, pw]).constant(2.5)
    const yS = d3.scaleSymlog().domain([0, maxCit]).range([ph, 0]).constant(4.5)

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`)

    const g = svg.append("g").attr("transform", `translate(${pad.l},${pad.t})`)

    for (let i = 0; i <= 4; i++) {
      const yy = Math.round(ph * (1 - i / 4))
      g.append("line")
        .attr("x1", 0)
        .attr("y1", yy)
        .attr("x2", pw)
        .attr("y2", yy)
        .attr("stroke", "rgba(0,0,0,0.07)")
        .attr("stroke-width", 0.5)

      const yVal = Math.round((i / 4) * maxCit)
      g.append("text")
        .attr("x", -6)
        .attr("y", yy + 4)
        .attr("text-anchor", "end")
        .attr("font-size", 9)
        .attr("fill", "rgba(15,23,42,0.45)")
        .text(yVal >= 1000 ? `${Math.round(yVal / 1000)}k` : yVal)

      const xx = Math.round((pw * i) / 4)
      g.append("line")
        .attr("x1", xx)
        .attr("y1", 0)
        .attr("x2", xx)
        .attr("y2", ph)
        .attr("stroke", "rgba(0,0,0,0.07)")
        .attr("stroke-width", 0.5)

      g.append("text")
        .attr("x", xx)
        .attr("y", ph + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("fill", "rgba(15,23,42,0.45)")
        .text(Math.round((i / 4) * maxWorks))
    }

    g.append("line")
      .attr("x1", 0)
      .attr("y1", ph)
      .attr("x2", pw)
      .attr("y2", ph)
      .attr("stroke", "rgba(0,0,0,0.22)")
      .attr("stroke-width", 0.8)
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", ph)
      .attr("stroke", "rgba(0,0,0,0.22)")
      .attr("stroke-width", 0.8)

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(ph / 2))
      .attr("y", -44)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "rgba(15,23,42,0.5)")
      .text("Total citations")

    g.append("text")
      .attr("x", pw / 2)
      .attr("y", ph + 42)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "rgba(15,23,42,0.5)")
      .text("Number of works")


    const srchLower = search.toLowerCase().trim()
    const plottedNodes = nodes.map((a) => {
      const r = Math.max(5, Math.sqrt(a.paperCount) * 2)
      const col = instColorMap[a.institution] ?? UNKNOWN_COLOR
      const isMatch =
        !srchLower ||
        a.name.toLowerCase().includes(srchLower) ||
        a.institution.toLowerCase().includes(srchLower)
      return {
        ...a,
        r,
        col,
        isMatch,
        op: srchLower && !isMatch ? 0.06 : 1,
        tx: xS(a.paperCount),
        ty: yS(a.citations ?? 0),
        x: xS(a.paperCount),
        y: yS(a.citations ?? 0),
      }
    })

    const sim = d3.forceSimulation(plottedNodes)
      .force("x", d3.forceX((d) => d.tx).strength(0.32))
      .force("y", d3.forceY((d) => d.ty).strength(0.32))
      .force("collide", d3.forceCollide((d) => d.r + 3.5))
      .alpha(0.9)
      .alphaDecay(0.08)
      .stop()

    for (let i = 0; i < 140; i++) sim.tick()

    plottedNodes.forEach((a) => {
      const glow = a.isMatch && srchLower ? 0.18 : 0
      const ng = g
        .append("g")
        .attr("transform", `translate(${a.x},${a.y})`)
        .attr("opacity", a.op)

      if (glow > 0) {
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
  }, [dims, instColorMap, nodes, search])

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return
    draw()
  }, [draw, nodes.length])

  return (
    <div
      ref={containerRef}
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
        <span style={lbl}>Search</span>
        <input
          type="text"
          value={search}
          placeholder="author or institution..."
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inp, width: 170 }}
        />
        {search && <button onClick={() => setSearch("")} style={btn}>Clear</button>}
        <span style={tag}>Mackinlay: position → quantity</span>
        <span style={tag}>Gestalt: proximity → cluster</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", paddingRight: LEGEND_WIDTH + 8, position: "relative" }}>
        <svg ref={svgRef} style={{ display: "block" }} />
      </div>

      {/* Side legend (same placement style as network view) */}
      <div
        style={{
          position: "absolute",
          top: 54,
          right: 12,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "rgba(248,250,252,0.9)",
          padding: "5px 8px",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.12)",
          width: LEGEND_WIDTH - 10,
          maxHeight: "calc(100% - 80px)",
          overflowY: "auto",
        }}
      >
        {Object.entries(instColorMap).map(([inst, col]) => (
          <div key={inst} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
            <svg width="16" height="16">
              <circle cx="8" cy="8" r="5" fill={col} />
            </svg>
            <span style={{ color: "rgba(15,23,42,0.75)" }}>
              {inst.length > 14 ? `${inst.slice(0, 12)}…` : inst}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, marginLeft: 4 }}>
          <svg width="32" height="12">
            <circle cx="6" cy="6" r="6" fill="none" stroke="rgba(15,23,42,0.3)" strokeWidth="1.2" />
            <circle cx="23" cy="6" r="3.5" fill="none" stroke="rgba(15,23,42,0.3)" strokeWidth="1.2" />
          </svg>
          <span style={{ color: "rgba(15,23,42,0.6)" }}>node size = works</span>
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
const tag = { fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(59,130,246,0.1)", color: "#2563eb", whiteSpace: "nowrap" }
