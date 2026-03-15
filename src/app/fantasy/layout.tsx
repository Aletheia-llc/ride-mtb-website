export default function FantasyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto', padding: '0 1rem' }}>
      {children}
    </div>
  )
}
