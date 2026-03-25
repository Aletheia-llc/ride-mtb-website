import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Ride MTB',
}

const LAST_UPDATED = 'March 25, 2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Privacy Policy</h1>
      <p className="mb-10 text-sm text-[var(--color-dim)]">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none text-[var(--color-text-muted)] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--color-text)] [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">

        <p>
          Ride MTB (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to
          protecting your privacy. This Privacy Policy explains how we collect, use, and share
          information about you when you use our platform at ride-mtb.vercel.app and related
          services (collectively, the &ldquo;Service&rdquo;).
        </p>

        <h2>Information We Collect</h2>
        <p>We collect information you provide directly to us, including:</p>
        <ul>
          <li>Account information (name, email address, password)</li>
          <li>Profile information (location, riding style, skill level, bike garage)</li>
          <li>Marketplace listings (photos, descriptions, pricing)</li>
          <li>Forum posts, comments, and messages</li>
          <li>Course progress and quiz responses</li>
          <li>Payment information (processed securely by Stripe — we do not store card numbers)</li>
        </ul>
        <p>We also automatically collect certain information when you use the Service:</p>
        <ul>
          <li>Log data (IP address, browser type, pages visited, time spent)</li>
          <li>Device information (hardware model, operating system)</li>
          <li>Usage data (features used, content viewed, links clicked)</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Process marketplace transactions and send related notices</li>
          <li>Send you technical notices, updates, and support messages</li>
          <li>Personalize your feed and course recommendations</li>
          <li>Track XP, achievements, and learning progress</li>
          <li>Detect and prevent fraud, spam, and abuse</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share your information in the following
          circumstances:
        </p>
        <ul>
          <li>
            <strong>With other users:</strong> Your public profile, forum posts, listings, and
            reviews are visible to other users of the Service.
          </li>
          <li>
            <strong>Service providers:</strong> We share information with third-party vendors who
            help us operate the Service (e.g., Vercel for hosting, Supabase for database, Stripe
            for payments).
          </li>
          <li>
            <strong>Legal requirements:</strong> We may disclose information if required by law or
            in response to valid legal process.
          </li>
          <li>
            <strong>Business transfers:</strong> In connection with a merger, acquisition, or sale
            of assets.
          </li>
        </ul>

        <h2>Marketplace Transactions</h2>
        <p>
          When you buy or sell on our marketplace, certain information is shared with the other
          party (e.g., your username, general location, and transaction details). Payment processing
          is handled by Stripe. We do not store full payment card numbers.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies and similar technologies to authenticate your session, remember your
          preferences, and analyze how the Service is used. You can control cookies through your
          browser settings, though disabling cookies may affect some functionality.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide
          the Service. You may request deletion of your account and associated data by contacting
          us.
        </p>

        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have rights regarding your personal information,
          including the right to access, correct, or delete your data. To exercise these rights,
          contact us at the address below.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to children under 13. We do not knowingly collect personal
          information from children under 13. If you believe we have collected such information,
          please contact us immediately.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by posting a notice on the Service or sending you an email. Your continued use of
          the Service after the effective date of a revised policy constitutes your acceptance of
          the changes.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{' '}
          <a
            href="mailto:privacy@ride-mtb.com"
            className="text-[var(--color-primary)] hover:underline"
          >
            privacy@ride-mtb.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
