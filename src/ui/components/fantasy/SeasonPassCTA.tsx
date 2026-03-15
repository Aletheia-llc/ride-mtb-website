// src/ui/components/fantasy/SeasonPassCTA.tsx
import { auth } from '@/lib/auth'
import { hasSeasonPass } from '@/modules/fantasy/queries/getSeasonPass'
import { purchaseSeasonPass } from '@/modules/fantasy/actions/purchaseSeasonPass'

interface Props {
  seriesId: string
  season: number
  seriesSlug: string
}

export async function SeasonPassCTA({ seriesId, season, seriesSlug }: Props) {
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <div className="border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Season Pass</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Drop round protection · Expert picks · Championship League
          </p>
        </div>
        <a
          href="/sign-in"
          className="shrink-0 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Sign in to buy — $29.99
        </a>
      </div>
    )
  }

  const alreadyHasPass = await hasSeasonPass(session.user.id, seriesId, season)

  if (alreadyHasPass) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
        <span className="text-green-600 text-xl">✓</span>
        <div>
          <p className="font-semibold text-sm text-green-800">Season Pass Active</p>
          <p className="text-xs text-green-700">
            Drop round · Expert picks · Championship League — all unlocked.
          </p>
        </div>
      </div>
    )
  }

  const returnUrl = `${process.env.AUTH_URL}/fantasy/${seriesSlug}`

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm">Season Pass</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Drop round protection · Expert picks · Championship League
        </p>
      </div>
      <form action={purchaseSeasonPass} className="shrink-0">
        <input type="hidden" name="seriesId" value={seriesId} />
        <input type="hidden" name="season" value={season} />
        <input type="hidden" name="returnUrl" value={returnUrl} />
        <button
          type="submit"
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Get Season Pass — $29.99
        </button>
      </form>
    </div>
  )
}
