import { useState } from "react"
import { useAuthorNetwork } from "../hooks/useAuthorNetwork.js"
import AuthorNetwork from "./AuthorNetwork.jsx"
import AuthorScatter from "./AuthorScatter.jsx"

const MAX_VISIBLE_AUTHORS = 100
const TABS = [
  { key: "network", label: "Institution author network" },
  { key: "scatter", label: "Author influence" },
]

export default function AuthorExplorer({
  subfieldId,
  subfieldName,
  fieldName,
  domainName,
  field,
  onBack,
  onBackToField,
  width,
  height,
}) {
  // Keep tab state and visible author count here.
  const [activeTab, setActiveTab] = useState("network")
  const [visibleN, setVisibleN] = useState(50)
  const { nodes, edges, stats, loading, error } = useAuthorNetwork(subfieldId)
  const visibleMax = Math.min(MAX_VISIBLE_AUTHORS, nodes.length)
  const minVisible = visibleMax ? Math.min(5, visibleMax) : 5
  const visibleNClamped = visibleMax
    ? Math.min(Math.max(visibleN, minVisible), visibleMax)
    : visibleN
  const hasInsufficientData = !loading && !error && nodes.length < 3
  const canShowCharts = !loading && !error && nodes.length >= 3

  // Jump back to the selected field if available.
  const handleFieldClick = () => field && onBackToField && onBackToField(field)

  const summaryItems = [
    { label: "Authors", value: stats.authorCount },
    { label: "Institutions", value: stats.institutionCount },
  ]

  return (
    <div
      style={{
        width,
        height,
        background: "#f3f4f6",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <span
          onClick={onBack}
          style={{ color: "rgba(15,23,42,0.6)", cursor: "pointer", textDecoration: "underline" }}
        >
          {domainName || "Domain"}
        </span>
        <span style={{ color: "rgba(15,23,42,0.3)" }}>›</span>
        <span
          onClick={handleFieldClick}
          style={{ color: "rgba(15,23,42,0.6)", cursor: "pointer", textDecoration: "underline" }}
        >
          {fieldName || "Field"}
        </span>
        <span style={{ color: "rgba(15,23,42,0.3)" }}>›</span>
        <span style={{ color: "#0f172a", fontWeight: 600 }}>{subfieldName}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          {summaryItems.map((s) => (
            <div
              key={s.label}
              style={{
                background: "#eef2f7",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 999,
                padding: "3px 8px",
                fontSize: 10,
                color: "rgba(15,23,42,0.72)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                {loading ? "—" : s.value}
              </span>
              <span style={{ marginLeft: 5 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 14px",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          flexShrink: 0,
          background: "#f3f4f6",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #2563eb"
                  : "2px solid transparent",
              color: activeTab === tab.key ? "#0f172a" : "rgba(15,23,42,0.5)",
              cursor: "pointer",
              fontWeight: activeTab === tab.key ? 600 : 400,
              transition: "color .15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(15,23,42,0.55)",
              fontSize: 14,
            }}
          >
            Fetching authors from OpenAlex…
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#EF4444",
              fontSize: 14,
            }}
          >
            {error.message}
          </div>
        )}

        {hasInsufficientData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(15,23,42,0.6)",
              fontSize: 14,
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            Not enough co-authorship data for this subfield.
            <br />
            Try a larger subfield from the overview.
          </div>
        )}

        {canShowCharts && (
          <>
            {activeTab === "network" && (
              <AuthorNetwork
                nodes={nodes}
                edges={edges}
                visibleN={visibleNClamped}
                onVisibleNChange={setVisibleN}
                visibleMax={visibleMax}
              />
            )}
            {activeTab === "scatter" && (
              <AuthorScatter
                nodes={nodes}
                visibleN={visibleNClamped}
                onVisibleNChange={setVisibleN}
                visibleMax={visibleMax}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
