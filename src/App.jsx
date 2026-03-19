import { useState, useCallback } from 'react'
import DropZone from './components/DropZone'
import ModelViewer from './viewer/ModelViewer'
import ConvertPanel from './components/ConvertPanel'
import { parseMcJson, parseBlockymodel } from './parser/mcParser'
import './index.css'

export default function App() {
  const [model, setModel] = useState(null)
  const [modelType, setModelType] = useState(null) // 'mc' | 'hytale'
  const [error, setError] = useState(null)

  const handleFile = useCallback((file) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        if (file.name.endsWith('.blockymodel')) {
          setModel(parseBlockymodel(text))
          setModelType('hytale')
        } else {
          setModel(parseMcJson(text))
          setModelType('mc')
        }
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsText(file)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight">DZ MC → Hytale</h1>
        <span className="text-xs text-gray-500">block model converter</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-gray-800 flex flex-col gap-4 p-4">
          <DropZone onFile={handleFile} />
          {error && (
            <div className="text-xs text-red-400 bg-red-950 rounded p-2">{error}</div>
          )}
          {model && (
            <ConvertPanel model={model} modelType={modelType} />
          )}
        </aside>

        <main className="flex-1">
          {model
            ? <ModelViewer model={model} modelType={modelType} />
            : (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                Drop a .json or .blockymodel file to preview
              </div>
            )
          }
        </main>
      </div>
    </div>
  )
}
