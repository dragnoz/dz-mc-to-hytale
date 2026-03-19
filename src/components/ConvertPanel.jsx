import { useState } from 'react'
import { convertMcToHytale, serialise } from '../converter/HytaleConverter'

export default function ConvertPanel({ model, modelType }) {
  const [warnings, setWarnings] = useState([])
  const [done, setDone] = useState(false)

  const handleConvert = () => {
    if (modelType !== 'mc') return
    const { model: converted, warnings: w } = convertMcToHytale(model, 'Model')
    setWarnings(w)
    const blob = new Blob([serialise(converted)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model.blockymodel'
    a.click()
    URL.revokeObjectURL(url)
    setDone(true)
  }

  if (modelType === 'hytale') {
    return (
      <div className="text-xs text-gray-400 p-2">
        Viewing Hytale .blockymodel — conversion not needed.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-gray-500">
        {model.elements?.length ?? 0} elements detected
      </div>
      <button
        onClick={handleConvert}
        className="bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3 py-2 transition-colors"
      >
        Convert → .blockymodel
      </button>
      {done && <p className="text-xs text-green-400">Downloaded!</p>}
      {warnings.map((w, i) => (
        <p key={i} className="text-xs text-yellow-400 bg-yellow-950 rounded p-2">{w}</p>
      ))}
    </div>
  )
}
