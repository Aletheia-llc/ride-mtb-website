import Link from "next/link";
import { getDifficultyColor, getDifficultyLabel } from "../lib/difficulty";

interface TrailCardProps {
  trail: {
    id: string;
    name: string;
    slug: string;
    trailType: string;
    physicalDifficulty: number;
    technicalDifficulty: number;
    distance: number | null;
    elevationGain: number | null;
    status: string;
    averageRating: number | null;
    _count: { reviews: number };
  };
  systemSlug: string;
}

export function TrailCard({ trail, systemSlug }: TrailCardProps) {
  const color = getDifficultyColor(trail.physicalDifficulty, trail.technicalDifficulty);
  const label = getDifficultyLabel(trail.physicalDifficulty);

  return (
    <Link
      href={`/trails/explore/${systemSlug}/${trail.slug}`}
      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[var(--color-text)]">{trail.name}</h3>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
          {trail.trailType}
        </span>
        {trail.status !== "open" && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            {trail.status}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
        {trail.distance != null && (
          <span>{trail.distance.toFixed(1)} mi</span>
        )}
        {trail.elevationGain != null && (
          <span>+{trail.elevationGain.toLocaleString()} ft</span>
        )}
        {trail.averageRating != null && (
          <span>★ {Number(trail.averageRating).toFixed(1)}</span>
        )}
        {trail._count.reviews > 0 && (
          <span>{trail._count.reviews} reviews</span>
        )}
      </div>
    </Link>
  );
}
