export default function Tooltip({ node, x, y }) {
  if (!node) return null
  const worksCount = node.data.works_count ?? node.data.value ?? node.value ?? 0
  const childCount = node.data.child_count ?? 0

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: x + 14,
        top: y - 16,
        background: "rgba(20,20,30,0.92)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12,
        boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
        minWidth: 220,
        maxWidth: 320,
        padding: "12px 14px",
        lineHeight: 1.5,
        color: "#fff",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.35, marginBottom: 8, wordBreak: "break-word" }}>
        {node.data.name}
      </div>

      <div style={{ display: "grid", rowGap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
          <span style={{ opacity: 0.72 }}>Works</span>
          <span style={{ fontWeight: 600 }}>{worksCount.toLocaleString()}</span>
        </div>

        {childCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ opacity: 0.72 }}>Subareas</span>
            <span style={{ fontWeight: 600 }}>{childCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}