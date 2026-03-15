import Link from 'next/link'

export default function ApplicationSubmittedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mb-4 text-5xl">🎉</div>
      <h1 className="mb-3 text-2xl font-bold text-[var(--color-text)]">Application Submitted!</h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Thanks for applying to coach on Ride MTB. Our team reviews applications within 3–5 business days. We&apos;ll email you with the decision.
      </p>
      <Link href="/coaching" className="inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)]">
        Browse Coaches
      </Link>
    </div>
  )
}
