'use client'

import { useState } from 'react'

type ImportSource = 'bikereg' | 'usac'

interface ImportResult {
  imported: number
  skipped: number
  errors: number
  message?: string
}

export function ImportManager() {
  const [source, setSource] = useState<ImportSource>('bikereg')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRunImport() {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Import failed with status ${res.status}`)
        return
      }
      const data: ImportResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Run Import</h2>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="source" className="text-xs font-medium text-[var(--color-text-muted)]">
              Source
            </label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value as ImportSource)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="bikereg">BikeReg</option>
              <option value="usac">USAC</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleRunImport}
            disabled={running}
            className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run Import'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Import Complete</h3>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Imported</dt>
              <dd className="mt-1 text-2xl font-bold text-green-600">{result.imported}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Skipped</dt>
              <dd className="mt-1 text-2xl font-bold text-[var(--color-text-muted)]">{result.skipped}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)]">Errors</dt>
              <dd className="mt-1 text-2xl font-bold text-red-500">{result.errors}</dd>
            </div>
          </dl>
          {result.message && (
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">{result.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
