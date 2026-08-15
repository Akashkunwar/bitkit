import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { DEFAULT_MEME, MEME_STYLES, renderMeme, type MemeOptions, type MemeStyle } from '../../lib/meme'

export default function MemeTool() {
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<MemeOptions>({ ...DEFAULT_MEME, top: 'When the build passes', bottom: 'on the first try' })
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) setFile(image)
  })

  // Re-render on any change; a meme is small enough that debouncing is not worth
  // the complexity, but the render is async so stale results are discarded.
  useEffect(() => {
    if (!file) return
    let live = true
    const id = window.setTimeout(() => {
      void renderMeme(file, options)
        .then((result) => {
          if (!live) return
          setBlob(result)
          setUrl((old) => {
            if (old) URL.revokeObjectURL(old)
            return URL.createObjectURL(result)
          })
          setError(null)
        })
        .catch((err: unknown) => {
          if (live) setError(err instanceof Error ? err.message : 'Could not render that.')
        })
    }, 120)
    return () => {
      live = false
      window.clearTimeout(id)
    }
  }, [file, options])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
    // Only on unmount; earlier URLs are revoked as they are replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof MemeOptions>(key: K, value: MemeOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }))

  const style = MEME_STYLES.find((s) => s.value === options.style)

  return (
    <ToolLayout title="Meme generator" lede="Top and bottom text over any image, rendered on this device.">
      <DropZone
        accept="image/*"
        label="Drop an image to caption."
        onFiles={(files) => {
          const image = files.find((f) => f.type.startsWith('image/'))
          if (image) setFile(image)
          else setError('That is not an image.')
        }}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      {file ? (
        <>
          <div className="split">
            <label className="field">
              <span>Top text</span>
              <textarea
                className="text-input"
                rows={2}
                value={options.top}
                onChange={(e) => set('top', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Bottom text</span>
              <textarea
                className="text-input"
                rows={2}
                value={options.bottom}
                onChange={(e) => set('bottom', e.target.value)}
              />
            </label>
          </div>

          <Segmented
            label="Style"
            value={options.style}
            options={MEME_STYLES.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(value) => set('style', value as MemeStyle)}
          />
          {style ? <p className="hint">{style.note}</p> : null}

          <div className="split">
            <label className="field">
              <span>Text size — {Math.round(options.fontScale * 100)}%</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={options.fontScale}
                onChange={(e) => set('fontScale', Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Outline — {Math.round(options.strokeScale * 100)}%</span>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.01}
                value={options.strokeScale}
                onChange={(e) => set('strokeScale', Number(e.target.value))}
              />
            </label>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="row">
              <input
                type="checkbox"
                checked={options.uppercase}
                onChange={(e) => set('uppercase', e.target.checked)}
              />
              Uppercase
            </label>
            <label className="field" style={{ minWidth: '8rem' }}>
              <span>Text</span>
              <input
                type="color"
                className="text-input"
                value={options.colour}
                onChange={(e) => set('colour', e.target.value)}
              />
            </label>
            <label className="field" style={{ minWidth: '8rem' }}>
              <span>Outline</span>
              <input
                type="color"
                className="text-input"
                value={options.strokeColour}
                onChange={(e) => set('strokeColour', e.target.value)}
              />
            </label>
          </div>

          {url ? (
            <>
              <div className="preview-frame" style={{ marginTop: '1rem' }}>
                <img src={url} alt="Meme preview" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
              </div>
              <div className="row" style={{ marginTop: '0.9rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => blob && triggerDownload(blob, 'meme.jpg')}
                >
                  Download
                </button>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {blob ? <SendTo from="meme" files={[new File([blob], 'meme.jpg', { type: 'image/jpeg' })]} /> : null}
    </ToolLayout>
  )
}
