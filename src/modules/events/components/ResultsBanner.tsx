import { Trophy, ExternalLink } from 'lucide-react'

interface ResultsBannerProps {
  resultsUrl: string | null
}

export function ResultsBanner({ resultsUrl }: ResultsBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
      <Trophy className="h-5 w-5 shrink-0 text-green-600" />
      <p className="text-sm font-medium flex-1">Results are posted!</p>
      {resultsUrl && (
        <a
          href={resultsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline shrink-0"
        >
          View results
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}
