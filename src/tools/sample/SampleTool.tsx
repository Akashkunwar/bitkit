import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { randomIpv4, randomObject } from '../../lib/sample'

export default function SampleTool() {
  const [seed, setSeed] = useState(1)
  const { copied, copy } = useCopied()
  const objectText = useMemo(() => JSON.stringify(randomObject(seed), null, 2), [seed])
  const ip = useMemo(() => randomIpv4(seed), [seed])

  return (
    <ToolLayout title="Sample data" lede="A made-up JSON object and a made-up IPv4 address. Nothing is looked up.">
      <button type="button" className="btn btn-primary" onClick={() => setSeed((n) => n + 1)}>
        Another
      </button>
      <div className="split">
        <section className="panel">
          <textarea className="code-area" rows={12} readOnly value={objectText} />
          <button type="button" className="btn" onClick={() => void copy(objectText, 'json')}>
            {copied === 'json' ? 'Copied ✓' : 'Copy JSON'}
          </button>
        </section>
        <aside className="panel">
          <p className="lede">{ip}</p>
          <button type="button" className="btn" onClick={() => void copy(ip, 'ip')}>
            {copied === 'ip' ? 'Copied ✓' : 'Copy IP'}
          </button>
        </aside>
      </div>
    </ToolLayout>
  )
}
