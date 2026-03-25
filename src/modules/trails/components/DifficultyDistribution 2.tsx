import { getDifficultyLabel } from "../lib/difficulty";

interface DifficultyDistributionProps {
  distribution: Record<number, number>; // difficulty level → count
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#86efac",
  3: "#3b82f6",
  4: "#f59e0b",
  5: "#ef4444",
};

export function DifficultyDistribution({ distribution }: DifficultyDistributionProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const sorted = Object.entries(distribution)
    .map(([level, count]) => ({ level: Number(level), count }))
    .sort((a, b) => a.level - b.level)
    .filter((d) => d.count > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {sorted.map(({ level, count }) => (
          <div
            key={level}
            style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: DIFFICULTY_COLORS[level] ?? "#94a3b8",
            }}
            title={`${getDifficultyLabel(level)}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
        {sorted.map(({ level, count }) => (
          <span key={level} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: DIFFICULTY_COLORS[level] ?? "#94a3b8" }}
            />
            {getDifficultyLabel(level)} ({count})
          </span>
        ))}
      </div>
    </div>
  );
}
