import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back</Link>
        </div>

        <div className="mb-8">
          <img src="/logo.png" alt="Nuroni" style={{ height: '40px', width: 'auto', marginBottom: '2rem' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Last updated: April 2026</p>
        </div>

        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9375rem' }} className="space-y-6">

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>1. Acceptance of Terms</h2>
            <p>By creating an account or using Nuroni ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms constitute a binding legal agreement between you and Nuroni.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>2. Age Requirement</h2>
            <p>You must be at least 18 years of age to use Nuroni. By creating an account, you represent and warrant that you are 18 years of age or older. We reserve the right to terminate accounts found to belong to minors.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>3. Not Medical Advice</h2>
            <p>Nuroni is a personal progress tracking tool only. Nothing in the Service constitutes medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before beginning any weight loss program or making changes to your diet or exercise routine. Nuroni is not responsible for any health outcomes related to your use of the Service.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>4. Subscriptions and Billing</h2>
            <p>Nuroni offers a free tier and a paid Plus+ subscription. The Plus+ subscription is billed monthly and automatically renews until cancelled. You are responsible for cancelling your subscription before the next billing cycle to avoid charges. Cancellations take effect at the end of the current billing period.</p>
            <p style={{ marginTop: '0.75rem' }}><strong style={{ color: 'var(--text-primary)' }}>No Refunds.</strong> All payments are final and non-refundable. We do not offer refunds or credits for partial months, downgrades, or unused subscription periods. This applies to all transactions processed through Nuroni.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>5. User Conduct</h2>
            <p>You agree not to use the Service to post content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable. In the Fitness Chat feature, you agree not to post external links, contact information, or promotional content for external products or services. Nuroni reserves the right to remove content and terminate accounts that violate these standards at our sole discretion, without notice or refund.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>6. User-Generated Content</h2>
            <p>You retain ownership of content you post. By posting content in the Service, you grant Nuroni a non-exclusive license to display that content within the Service. You are solely responsible for all content you post. Nuroni does not endorse or verify any user-generated content.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>7. Public Profiles</h2>
            <p>If you enable a public profile, your progress data including display name, weight stats, and history will be visible to anyone with your public link. You can disable your public profile at any time in your Profile settings.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>8. Service Availability</h2>
            <p>We strive to maintain availability of the Service but do not guarantee uninterrupted access. The Service may be unavailable due to maintenance, technical issues, or circumstances beyond our control. Nuroni is not liable for any loss resulting from service interruptions.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>9. Pricing Changes</h2>
            <p>We reserve the right to modify pricing at any time. We will provide reasonable notice of price changes via email or in-app notification. Continued use of the Service after a price change constitutes acceptance of the new pricing.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>10. Termination</h2>
            <p>You may delete your account at any time through the Account Settings page. We reserve the right to suspend or terminate your account for violations of these Terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Nuroni shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability to you for any claim shall not exceed the amount you paid to us in the three months preceding the claim.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>12. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of New York, United States. Any disputes shall be resolved in the courts of New York. If you are located outside the United States, you agree to comply with all applicable local laws.</p>
          </section>

          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.75rem' }}>13. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:nuroniapp@gmail.com" style={{ color: 'var(--accent)' }}>nuroniapp@gmail.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
