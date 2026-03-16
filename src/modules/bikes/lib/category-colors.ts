export const CATEGORY_COLORS: Record<number, { bg: string; text: string; border: string; tab: string; tabText: string }> = {
  1: { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa', border: '#60a5fa', tab: '#60a5fa', tabText: '#fff' },
  3: { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: '#34d399', tab: '#34d399', tabText: '#fff' },
  5: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', border: '#a78bfa', tab: '#a78bfa', tabText: '#fff' },
  7: { bg: 'rgba(249,115,22,0.12)',  text: '#f97316', border: '#f97316', tab: '#f97316', tabText: '#fff' },
  9: { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', border: '#ef4444', tab: '#ef4444', tabText: '#fff' },
}

export const CATEGORY_LABELS: Record<number, string> = {
  1: 'Gravel',
  3: 'XC',
  5: 'Trail',
  7: 'Enduro',
  9: 'Downhill',
}
