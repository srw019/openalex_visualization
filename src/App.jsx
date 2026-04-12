// we were here 8 48
import { useEffect, useRef, useState } from "react"
import CirclePack from "./components/CirclePack.jsx"
import AuthorExplorer from "./components/AuthorExplorer.jsx"
import { useOpenAlex } from "./hooks/useOpenAlex.js"

export default function App() {
  const { data, loading, error } = useOpenAlex()
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 1200, height: 800 })
  // selectedSubfield can be:
  // null = show Layer 1 (CirclePack root)
  // { type: 'field', field: {...} } = show CirclePack focused on a field
  // { type: 'subfield', subfieldId, subfieldName, fieldName, domainName, field } = show Layer 2 (AuthorExplorer)
  const [selectedSubfield, setSelectedSubfield] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const handleSubfieldSelect = (subfieldData) => {
    // Store the parent field info so we can navigate back to it
    setSelectedSubfield({
      type: 'subfield',
      subfieldId: subfieldData.subfieldId,
      subfieldName: subfieldData.subfieldName,
      fieldName: subfieldData.fieldName,
      domainName: subfieldData.domainName,
      field: subfieldData.field, // the full field object
    })
  }

  const handleBackToField = (fieldObject) => {
    // Navigate to CirclePack focused on a specific field
    setSelectedSubfield({
      type: 'field',
      field: fieldObject,
    })
  }

  const handleBackToLayer1 = () => {
    setSelectedSubfield(null)
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="px-8 py-4 border-b border-black/10">
        <h1 className="text-xl font-semibold tracking-wide" style={{ paddingLeft: "15px" }}>
          Research Explorer
        </h1>

      </header>

      <main
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0, position: "relative" }}
      >
        {loading && (
          <div className="flex items-center justify-center h-full text-black/45">
            Loading OpenAlex data…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-red-400">
            Error: {error.message}
          </div>
        )}
        {data && !selectedSubfield && (
          <>
            <CirclePack
              data={data}
              width={dims.width}
              height={dims.height}
              onSubfieldSelect={handleSubfieldSelect}
              initialFocusPath={[]}
            />
            <div
              style={{
                position: "absolute",
                right: 14,
                bottom: 10,
                zIndex: 20,
                fontSize: 11,
                color: "rgba(15,23,42,0.62)",
                background: "rgba(248,250,252,0.8)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "4px 8px",
              }}
            >
              Data source: {" "}
              <a
                href="https://openalex.org"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb", textDecoration: "underline" }}
              >
                OpenAlex
              </a>
            </div>
          </>
        )}
        {data && selectedSubfield?.type === 'field' && (
          <CirclePack
            data={data}
            width={dims.width}
            height={dims.height}
            onSubfieldSelect={handleSubfieldSelect}
            initialFocusPath={[selectedSubfield.field]}
          />
        )}
        {selectedSubfield?.type === 'subfield' && (
          <AuthorExplorer
            subfieldId={selectedSubfield.subfieldId}
            subfieldName={selectedSubfield.subfieldName}
            fieldName={selectedSubfield.fieldName}
            domainName={selectedSubfield.domainName}
            field={selectedSubfield.field}
            onBack={handleBackToLayer1}
            onBackToField={handleBackToField}
            width={dims.width}
            height={dims.height}
          />
        )}
      </main>
    </div>
  )
}