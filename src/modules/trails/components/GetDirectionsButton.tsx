"use client";

interface GetDirectionsButtonProps {
  lat: number;
  lng: number;
  label?: string;
}

export function GetDirectionsButton({ lat, lng, label = "Get Directions" }: GetDirectionsButtonProps) {
  function handleClick() {
    const isApple = /iPad|iPhone|iPod|Mac/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const url = isApple
      ? `https://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/30 hover:text-[var(--color-text)]"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {label}
    </button>
  );
}
