// src/modules/bikes/components/garage/DuplicateBikeButton.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports -- client component, direct module import is intentional
import { duplicateBike } from '@/modules/bikes/actions/garage-actions'

export function DuplicateBikeButton({ bikeId }: { bikeId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDuplicate = () => {
    if (!confirm('Duplicate this bike and all its components?')) return
    startTransition(async () => {
      const { bikeId: newId } = await duplicateBike(bikeId)
      router.push(`/bikes/garage/${newId}`)
    })
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
    >
      <Copy className="h-4 w-4" />
      {isPending ? 'Duplicating…' : 'Duplicate'}
    </button>
  )
}
