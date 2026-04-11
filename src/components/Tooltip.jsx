export default function Tooltip({ node, x, y }) {
  if (!node) return null
  const worksCount = node.data.works_count ?? node.data.value ?? node.value
// we were here 8 48
  return (
    <div
      className="absolute pointer-events-none z-50 rounded-lg px-3 py-2 text-sm text-white shadow-xl"
      style={{
        left: x + 12,
        top: y - 10,
        background: "rgba(20,20,30,0.92)",
        border: "1px solid rgba(255,255,255,0.15)",
        maxWidth: 200,
      }}
    >
      <div className="font-semibold">{node.data.name}</div>
      {worksCount && (
        <div className="opacity-60 text-xs mt-0.5">
          {worksCount.toLocaleString()} works
        </div>
      )}
    </div>
  )
}