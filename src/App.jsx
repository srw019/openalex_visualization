import { useEffect, useRef, useState } from "react"
import CirclePack from "./components/CirclePack.jsx"
import AuthorExplorer from "./components/AuthorExplorer.jsx"
import { useOpenAlex } from "./hooks/useOpenAlex.js"

export default function App() {
  const { data, loading, error } = useOpenAlex()
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 1200, height: 800 })
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
    setSelectedSubfield({
      type: 'subfield',
      subfieldId: subfieldData.subfieldId,
      subfieldName: subfieldData.subfieldName,
      fieldName: subfieldData.fieldName,
      domainName: subfieldData.domainName,
      field: subfieldData.field,
    })
  }

  const handleBackToField = (fieldObject) => {
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
          <CirclePack
            data={data}
            width={dims.width}
            height={dims.height}
            onSubfieldSelect={handleSubfieldSelect}
            initialFocusPath={[]}
          />
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