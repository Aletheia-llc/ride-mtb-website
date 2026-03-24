// src/modules/bikes/components/garage/ExportImportSection.tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports -- client component, direct module import is intentional
import { exportBike, importBike } from '@/modules/bikes/actions/garage-actions'

export function ExportImportSection({ bikeId }: { bikeId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [exporting, startExport] = useTransition()
  const [importing, startImport] = useTransition()

  const handleExport = () => {
    startExport(async () => {
      try {
        const data = await exportBike(bikeId)
        const json = JSON.stringify(data, null, 2)
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `bike-export-${bikeId}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // export failure — silently ignore (rare, e.g. auth expired)
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      startImport(async () => {
        try {
          const { bikeId: newId } = await importBike(text)
          router.push(`/bikes/garage/${newId}`)
        } catch (err) {
          setImportError(err instanceof Error ? err.message : 'Import failed. Check the file format.')
        }
      })
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-selected
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Export / Import</h2>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        Export your bike and components as JSON, or import a previously exported file.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export JSON'}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importing…' : 'Import JSON'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
      {importError && (
        <p className="mt-2 text-sm text-red-500">{importError}</p>
      )}
    </div>
  )
}
