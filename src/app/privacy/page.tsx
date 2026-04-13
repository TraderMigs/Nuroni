import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back</Link>
        </div>

        <div className="mb-8">
          <img src="/logo.png" alt="Nuroni" style={{ height: '40px', width: 'auto', marginBottom: '2rem' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Last updated: April 2026</p>
        </div>

        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9375rem' }} className="space-y-6">

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>1. Overview</h2>
            <p>Nuroni ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data. By using Nuroni, you agree to this policy.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>2. Information We Collect</h2>
            <p><strong style={{ color: 'var(--text-primary)' }}>Account information:</strong> Email address and password (encrypted) when you create an account.</p>
            <p style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Profile data:</strong> Display name, username, height, starting weight, weight unit preference, and distance unit preference.</p>
            <p style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Progress data:</strong> Daily weight entries, step counts, distance logs, and optional notes you choose to record.</p>
            <p style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Goals:</strong> Goal weight, daily step target, and optional target date.</p>
            <p style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Chat messages:</strong> Messages you send in the Fitness Chat feature.</p>
            <p style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Payment information:</strong> Billing is handled by Stripe. We do not store your credit card details. We receive subscription status information from Stripe.</p>
            <p style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Session data:</strong> Authentication tokens stored in cookies to keep you logged in.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>3. How We Use Your Information</h2>
            <p>We use your data solely to operate and improve the Nuroni service — to display your progress, power the chat feature, process your subscription, and communicate with you about your account. We do not use your data for advertising. We do not sell your data to any third party, ever.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>4. Third-Party Services</h2>
            <p>We use the following trusted third-party services to operate Nuroni:</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> — database, authentication, and file storage. Your data is stored on Supabase-managed servers.</li>
              <li style={{ marginTop: '0.25rem' }}><strong style={{ color: 'var(--text-primary)' }}>Stripe</strong> — payment processing for Plus+ subscriptions.</li>
              <li style={{ marginTop: '0.25rem' }}><strong style={{ color: 'var(--text-primary)' }}>Vercel</strong> — hosting and serving the application.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>Each of these services has their own privacy policy. We have selected them for their strong security practices.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>5. Public Profiles</h2>
            <p>If you enable a public profile, your display name, username, and progress statistics will be publicly accessible via your unique link. You can disable this at any time in your Profile settings, which will immediately hide your public page.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, all your personal data including your profile, entries, goals, and chat messages will be permanently deleted within 30 days.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>7. Your Rights</h2>
            <p>You have the right to access, correct, and delete your personal data. You can update your profile information at any time within the app. To request complete data deletion or a copy of your data, contact us at <a href="mailto:nuroniapp@gmail.com" style={{ color: 'var(--accent)' }}>nuroniapp@gmail.com</a>.</p>
            <p style={{ marginTop: '0.75rem' }}><strong style={{ color: 'var(--text-primary)' }}>California residents (CCPA):</strong> You have the right to know what personal data we collect, request deletion, and opt out of sale (we do not sell data). Submit requests to nuroniapp@gmail.com.</p>
            <p style={{ marginTop: '0.75rem' }}><strong style={{ color: 'var(--text-primary)' }}>EU/EEA residents (GDPR):</strong> You have rights of access, rectification, erasure, and data portability. Contact us at nuroniapp@gmail.com to exercise these rights.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>8. Security</h2>
            <p>We implement industry-standard security measures including encrypted connections (HTTPS), encrypted passwords, and row-level security on our database. No method of transmission over the internet is 100% secure, but we take all reasonable steps to protect your information.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>9. Children</h2>
            <p>Nuroni is not intended for use by anyone under the age of 18. We do not knowingly collect data from minors. If we become aware that a minor has created an account, we will delete it promptly.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notice. Continued use of the Service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>11. Contact</h2>
            <p>For privacy questions or data requests, contact us at <a href="mailto:nuroniapp@gmail.com" style={{ color: 'var(--accent)' }}>nuroniapp@gmail.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
