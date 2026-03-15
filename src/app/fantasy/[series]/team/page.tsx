export default async function TeamSelectionPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold mb-6">Build Your Team</h1>
      <p className="text-[var(--color-text-muted)] text-sm">
        Select an open event from the{' '}
        <a href={`/fantasy/${series}`} className="text-green-600 underline">series hub</a>
        {' '}to build your team.
      </p>
    </div>
  )
}
