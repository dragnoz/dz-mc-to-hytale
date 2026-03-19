import { useState } from 'react'
import { convertMcToHytale, serialise } from '../converter/HytaleConverter'
import { runPreFlightCheck } from '../converter/validator'
import { takeInventorySnapshot } from '../converter/iconMaker'

export default function ConvertPanel({ model, modelType, sceneRef }) {
  const [result, setResult] = useState(null) // { errors, warnings, nodeCount }
  const [done, setDone] = useState(false)

  if (modelType === 'hytale') {
    return (
      <div className="text-xs text-gray-400 p-2">
        Viewing Hytale .blockymodel — no conversion needed.
      </div>
    )
  }

  const handleConvert = () => {
    const { model: converted, warnings: convWarn } = convertMcToHytale(model, 'Model')
    const check = runPreFlightCheck(converted.nodes)
    setResult({ ...check, warnings: [...(check.warnings ?? []), ...convWarn] })

    if (check.valid) {
      const blob = new Blob([serialise(converted)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'model.blockymodel'
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    }
  }

  const handleIcon = () => {
    const three = sceneRef?.current
    if (!three) return
    takeInventorySnapshot(three.renderer, three.scene, three.camera)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-gray-500">
        {model.elements?.length ?? 0} elements · {model.groups?.length ? `${model.groups.length} groups` : 'no groups'}
      </div>

      <button
        onClick={handleConvert}
        className="bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3 py-2 transition-colors"
      >
        Convert → .blockymodel
      </button>

      <button
        onClick={handleIcon}
        className="bg-gray-700 hover:bg-gray-600 text-white text-sm rounded px-3 py-2 transition-colors"
      >
        Export icon (64×64 PNG)
      </button>

      {done && <p className="text-xs text-green-400">Downloaded!</p>}

      {result && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500">{result.nodeCount} nodes total</p>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400 bg-red-950 rounded p-2">{e}</p>
          ))}
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-400 bg-yellow-950 rounded p-2">{w}</p>
          ))}
          {result.valid && result.errors.length === 0 && (
            <p className="text-xs text-green-400">Pre-flight passed ✓</p>
          )}
        </div>
      )}
    </div>
  )
}
