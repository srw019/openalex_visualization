import { useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import Tooltip from "./Tooltip.jsx"
// we were here 8 48
const PALETTE = [
  "#FF4D6D", "#22C55E", "#F59E0B", "#3B82F6",
  "#A855F7", "#14B8A6", "#EF4444", "#06B6D4",
  "#84CC16", "#F97316", "#8B5CF6", "#10B981",
  "#E11D48", "#0EA5E9", "#D946EF", "#F43F5E",
]

const TOP_UI_HEIGHT = 96

export default function CirclePack({ data, width, height, onSubfieldSelect, initialFocusPath = [] }) {
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState({ node: null, x: 0, y: 0 })
  const [focusPath, setFocusPath] = useState(initialFocusPath)

  const categoryRoot = useMemo(() => {
    if (!data) return null
    return data.children?.[0] ?? data
  }, [data])

  const currentNode = useMemo(() => {
    if (!categoryRoot) return null
    if (focusPath.length === 0) return categoryRoot
    return focusPath[focusPath.length - 1]
  }, [categoryRoot, focusPath])

  const originalChildren = useMemo(() => {
    if (!currentNode) return {}
    const map = {}
    for (const child of currentNode.children ?? []) {
      map[child.name] = child
    }
    return map
  }, [currentNode])

  const circles = useMemo(() => {
    if (!currentNode || !width || !height) return []

    const shallowData = {
      name: currentNode.name,
      children: (currentNode.children ?? []).map((child) => ({
        ...child,
        children: undefined,
        value: Math.sqrt(Math.max(child.works_count ?? child.value ?? 1, 1)),
      })),
    }

    const root = d3
      .hierarchy(shallowData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => b.value - a.value)

    if (root.value === 0) return []

    d3
      .pack()
      .size([width, Math.max(height - TOP_UI_HEIGHT, 140)])
      .padding(6)(root)

    return root.descendants().filter(
      (n) => n.depth === 1 && !Number.isNaN(n.r) && n.r > 0
    )
  }, [currentNode, width, height])

  const breadcrumbs = useMemo(() => {
    if (!categoryRoot) return []
    return [
      { label: categoryRoot.name, index: -1 },
      ...focusPath.map((node, i) => ({ label: node.name, index: i })),
    ]
  }, [categoryRoot, focusPath])

  const categoryColorMap = useMemo(() => {
    const map = {}
    for (const [index, child] of (categoryRoot?.children ?? []).entries()) {
      map[child.name] = PALETTE[index % PALETTE.length]
    }
    return map
  }, [categoryRoot])

  const handleCircleClick = (node) => {
    const original = originalChildren[node.data.name]

    // Has children → drill down into next level as before
    if (original?.children?.length) {
      setFocusPath((prev) => [...prev, original])
      setTooltip({ node: null, x: 0, y: 0 })
      return
    }

    // Leaf node = subfield with no further children → trigger Layer 2
    // Pass the full hierarchy: domain, field(s), and subfield
    if (original?.id && onSubfieldSelect) {
      const domainName = categoryRoot?.name || "Unknown"
      const fieldName = focusPath.length > 0 ? focusPath[focusPath.length - 1].name : "Unknown"
      const parentField = focusPath.length > 0 ? focusPath[focusPath.length - 1] : null
      const subfieldName = original.name
      
      onSubfieldSelect({
        subfieldId: original.id,
        subfieldName: subfieldName,
        fieldName: fieldName,
        domainName: domainName,
        field: parentField, // pass the parent field object for back navigation
      })
    }
  }

  const handleBreadcrumbClick = (index) => {
    setFocusPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)))
    setTooltip({ node: null, x: 0, y: 0 })
  }

  const handleBackgroundClick = () => {
    setFocusPath((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev))
    setTooltip({ node: null, x: 0, y: 0 })
  }

  const updateTooltip = (event, node) => {
    const rect = containerRef.current?.getBoundingClientRect()
    setTooltip({
      node,
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    })
  }

  return (
    <div ref={containerRef} style={{ width, height, position: "relative", background: "#f3f4f6" }}>

      {/* Top header bar */}
      <div style={{
        position: "absolute",
        top: 8,
        left: 12,
        right: 12,
        height: TOP_UI_HEIGHT - 14,
        zIndex: 10,
        pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(248,250,252,0.96), rgba(241,245,249,0.9))",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 12,
      }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div style={{
            position: "absolute",
            left: 14,
            top: 10,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(15,23,42,0.82)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
          }}>
            Physical Sciences
          </div>

          <div style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: 10,
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
              letterSpacing: "0.04em",
              opacity: 0.9,
              fontFamily: "system-ui, sans-serif",
            }}>
              {focusPath.length === 0 ? "Categories" : currentNode?.name ?? "Categories"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(15,23,42,0.55)", marginTop: 3 }}>
              {focusPath.length === 0
                ? "Select a category to view subdomains"
                : "Click a subfield to explore its author network"}
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div style={{
          position: "absolute", top: TOP_UI_HEIGHT + 2, left: 16, zIndex: 10,
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, fontFamily: "system-ui, sans-serif",
          background: "rgba(248,250,252,0.96)",
          padding: "4px 8px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
        }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "rgba(15,23,42,0.35)" }}>›</span>}
              <span
                onClick={() => handleBreadcrumbClick(crumb.index)}
                style={{
                  cursor: i < breadcrumbs.length - 1 ? "pointer" : "default",
                  color: i === breadcrumbs.length - 1
                    ? "#0f172a"
                    : "rgba(15,23,42,0.6)",
                  textDecoration: i < breadcrumbs.length - 1 ? "underline" : "none",
                  fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                }}
              >
                {crumb.label.length > 20 ? crumb.label.slice(0, 18) + "…" : crumb.label}
              </span>
            </span>
          ))}
        </div>
      )}

      <svg width={width} height={height} style={{ display: "block" }} onClick={handleBackgroundClick}>
        {circles.map((node, i) => {
          const color = focusPath.length === 0
            ? (categoryColorMap[node.data.name] ?? PALETTE[i % PALETTE.length])
            : (categoryColorMap[focusPath[0]?.name] ?? PALETTE[0])
          const hasChildren = !!originalChildren[node.data.name]?.children?.length
          // Leaf nodes at subfield level are clickable to launch Layer 2
          const isLeaf = !hasChildren && !!originalChildren[node.data.name]?.id
          const isClickable = hasChildren || isLeaf
          const fontSize = Math.min(Math.max(node.r / 3.1, 8), 15)
          const maxChars = Math.max(Math.floor((node.r * 1.75) / (fontSize * 0.56)), 2)
          const initials = node.data.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("")
          const label = maxChars <= 2
            ? initials || node.data.name.slice(0, 1)
            : (node.data.name.length > maxChars
              ? `${node.data.name.slice(0, Math.max(maxChars - 1, 3))}…`
              : node.data.name)

          return (
            <g
              key={node.data.id ?? `${node.data.name}-${i}`}
              transform={`translate(${node.x},${node.y + TOP_UI_HEIGHT})`}
              onClick={(event) => {
                event.stopPropagation()
                handleCircleClick(node)
              }}
              style={{ cursor: isClickable ? "pointer" : "default" }}
              onMouseEnter={(event) => updateTooltip(event, node)}
              onMouseMove={(event) => updateTooltip(event, node)}
              onMouseLeave={() => setTooltip({ node: null, x: 0, y: 0 })}
            >
              <circle
                r={node.r}
                fill={color}
                fillOpacity={0.26}
                stroke={color}
                strokeOpacity={0.9}
                strokeWidth={hasChildren ? 2.5 : isLeaf ? 2 : 1.8}
              />

              <clipPath id={`clip-${i}`}>
                <circle r={Math.max(node.r - 2, 1)} />
              </clipPath>

              {/* Outer ring for nodes that drill down or open Layer 2 */}
              {isClickable && (
                <circle
                  r={node.r + 4}
                  fill="none"
                  stroke={color}
                  strokeOpacity={isLeaf ? 0.85 : 0.55}
                  strokeWidth={isLeaf ? 2 : 1.6}
                  strokeDasharray={isLeaf ? "4 3" : undefined}
                />
              )}

              {node.r > 10 && (
                <g clipPath={`url(#clip-${i})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={node.data.works_count && node.r > 42 ? -7 : 0}
                    fill="#0f172a"
                    fontFamily="system-ui, sans-serif"
                    fontWeight={hasChildren ? 600 : 450}
                    fontSize={fontSize}
                    pointerEvents="none"
                    opacity={0.96}
                  >
                    {label}
                  </text>

                  {node.data.works_count && node.r > 42 && (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y={fontSize * 0.85}
                      fill="rgba(15,23,42,0.78)"
                      fontFamily="system-ui, sans-serif"
                      fontSize={Math.min(fontSize * 0.72, 10)}
                      pointerEvents="none"
                    >
                      {node.data.works_count.toLocaleString()} works
                    </text>
                  )}

                  {/* Small indicator on leaf subfield nodes so user knows they are clickable */}
                  {isLeaf && node.r > 28 && (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y={node.r > 42 ? fontSize * 1.9 : fontSize * 1.1}
                      fill="rgba(15,23,42,0.78)"
                      fontFamily="system-ui, sans-serif"
                      fontSize={Math.min(fontSize * 0.65, 9)}
                      pointerEvents="none"
                      opacity={0.75}
                    >
                      explore →
                    </text>
                  )}
                </g>
              )}
            </g>
          )
        })}
      </svg>

      <Tooltip node={tooltip.node} x={tooltip.x} y={tooltip.y} />
    </div>
  )
}