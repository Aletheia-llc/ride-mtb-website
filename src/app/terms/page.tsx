import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Ride MTB',
}

const LAST_UPDATED = 'March 25, 2026'

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Terms of Service</h1>
      <p className="mb-10 text-sm text-[var(--color-dim)]">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none text-[var(--color-text-muted)] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--color-text)] [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">

        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Ride MTB
          (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) at ride-mtb.vercel.app and
          related services (the &ldquo;Service&rdquo;). By using the Service, you agree to be bound
          by these Terms.
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be at least 13 years old to use the Service. By creating an account, you
          represent that you are at least 13 years old and that you have the legal capacity to enter
          into these Terms.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account and password. You agree
          to immediately notify us of any unauthorized use of your account. We are not liable for
          any loss or damage arising from your failure to protect your account credentials.
        </p>

        <h2>Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Post false, misleading, or fraudulent content</li>
          <li>Harass, threaten, or intimidate other users</li>
          <li>Sell stolen, counterfeit, or prohibited items</li>
          <li>Spam, phish, or distribute malware</li>
          <li>Scrape or harvest data without our written permission</li>
          <li>Violate any applicable law or regulation</li>
          <li>Interfere with the proper functioning of the Service</li>
          <li>Create multiple accounts to evade bans or restrictions</li>
        </ul>

        <h2>Marketplace Rules</h2>
        <p>
          The Ride MTB marketplace connects individual buyers and sellers of mountain bike
          equipment. By listing an item, you represent that:
        </p>
        <ul>
          <li>You own the item and have the right to sell it</li>
          <li>The item description and photos are accurate and not misleading</li>
          <li>You will complete the transaction in good faith if a buyer is found</li>
          <li>The item is legal to sell in your jurisdiction</li>
        </ul>
        <p>
          We are not a party to transactions between buyers and sellers and are not responsible for
          the quality, safety, or legality of items listed. All sales are between the buyer and
          seller directly.
        </p>

        <h2>Payments</h2>
        <p>
          Payment processing for marketplace transactions is provided by Stripe. By completing a
          purchase, you agree to Stripe&apos;s terms of service. We charge a platform fee on each
          transaction, which is disclosed at checkout. All fees are non-refundable except as
          required by law.
        </p>

        <h2>User Content</h2>
        <p>
          You retain ownership of content you post on the Service. By posting content, you grant us
          a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and
          distribute your content in connection with operating the Service. You represent that you
          have the right to grant this license.
        </p>
        <p>
          We may remove content that violates these Terms or our community guidelines, at our sole
          discretion.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by Ride MTB
          and are protected by copyright, trademark, and other intellectual property laws. You may
          not copy, modify, or distribute our proprietary materials without our written permission.
        </p>

        <h2>Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
          WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
          OR FREE OF VIRUSES.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, RIDE MTB SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
          GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF YOUR ACCESS TO OR USE OF (OR
          INABILITY TO ACCESS OR USE) THE SERVICE.
        </p>

        <h2>Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Ride MTB and its officers, directors, employees,
          and agents from any claims, damages, losses, liabilities, and expenses (including
          attorneys&apos; fees) arising out of your use of the Service, your content, or your
          violation of these Terms.
        </p>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate your account at any time for violations of these Terms or for
          any other reason at our sole discretion. You may delete your account at any time from
          your account settings. Upon termination, these Terms remain in effect for any prior use of
          the Service.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms are governed by the laws of the United States, without regard to conflict of
          law principles. Any disputes arising under these Terms shall be resolved in the federal or
          state courts located in the United States.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will provide notice of material changes
          by posting an update on the Service. Your continued use of the Service after the effective
          date constitutes your acceptance of the updated Terms.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us at{' '}
          <a
            href="mailto:legal@ride-mtb.com"
            className="text-[var(--color-primary)] hover:underline"
          >
            legal@ride-mtb.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
