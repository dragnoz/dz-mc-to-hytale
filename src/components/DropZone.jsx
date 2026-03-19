import { useCallback, useState } from 'react'

export default function DropZone({ onFile }) {
  const [dragging, setDragging] = useState(false)

  const handle = useCallback((file) => {
    if (file) onFile(file)
  }, [onFile])

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-950/30' : 'border-gray-700 hover:border-gray-500'}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
      onClick={() => document.getElementById('file-input').click()}
    >
      <p className="text-sm text-gray-400">Drop model file here</p>
      <p className="text-xs text-gray-600 mt-1">.json · .blockymodel</p>
      <input
        id="file-input"
        type="file"
        accept=".json,.blockymodel"
        className="hidden"
        onChange={e => handle(e.target.files[0])}
      />
    </div>
  )
}
