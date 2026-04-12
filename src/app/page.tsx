import Image from 'next/image'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="landing-root">

      {/* Ambient background glow */}
      <div className="landing-glow-1" />
      <div className="landing-glow-2" />

      {/* Nav */}
      <nav className="landing-nav">
        <Image src="/logo.png" alt="Nuroni" width={120} height={80} style={{ objectFit: 'contain', height: '38px', width: 'auto' }} priority />
        <div className="landing-nav-links">
          <Link href="/login" className="landing-nav-link">Sign in</Link>
          <Link href="/signup" className="landing-cta-sm">Start free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          Simple progress tracking
        </div>

        <h1 className="landing-h1">
          Track less.<br />
          <span className="landing-h1-accent">Show real progress.</span>
        </h1>

        <p className="landing-sub">
          Log your weight and steps in seconds. Share a beautiful live progress page with anyone. No noise. No bloat.
        </p>

        <div className="landing-actions">
          <Link href="/signup" className="landing-cta-primary">
            Start your journey
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <Link href="/login" className="landing-cta-ghost">
            Sign in
          </Link>
        </div>

        <p className="landing-free-note">Free to start · No credit card</p>
      </section>

      {/* Feature strip */}
      <section className="landing-features">
        {[
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            ),
            title: 'Daily logging',
            desc: 'Weight + steps in under 10 seconds.'
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            ),
            title: 'Public share page',
            desc: 'One link. Your live progress. Always current.'
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            ),
            title: 'Goal tracking',
            desc: 'Set targets. Watch the bar move.'
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            ),
            title: 'Install as app',
            desc: 'Works on iPhone, Android, and desktop.'
          },
        ].map((f, i) => (
          <div key={i} className="landing-feature-card">
            <div className="landing-feature-icon">{f.icon}</div>
            <div>
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Social proof / CTA bottom */}
      <section className="landing-bottom-cta">
        <p className="landing-bottom-text">
          Built for real journeys. Designed to be shared.
        </p>
        <Link href="/signup" className="landing-cta-primary">
          Start your journey — it&apos;s free
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Image src="/logo.png" alt="Nuroni" width={80} height={54} style={{ objectFit: 'contain', height: '24px', width: 'auto', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Nuroni · Track less. Show real progress.
        </p>
      </footer>

      <style>{`
        .landing-root {
          min-height: 100vh;
          background: var(--bg);
          overflow-x: hidden;
          position: relative;
        }

        /* Ambient glows */
        .landing-glow-1 {
          position: fixed;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .landing-glow-2 {
          position: fixed;
          bottom: 0;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(45,212,191,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Nav */
        .landing-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          max-width: 860px;
          margin: 0 auto;
        }
        .landing-nav-links {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .landing-nav-link {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.15s;
        }
        .landing-nav-link:hover { color: var(--text-primary); }

        .landing-cta-sm {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0D1117;
          background: var(--accent);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
        }
        .landing-cta-sm:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        /* Hero */
        .landing-hero {
          position: relative;
          z-index: 1;
          max-width: 680px;
          margin: 0 auto;
          padding: 4rem 1.5rem 3rem;
          text-align: center;
          animation: fadeUp 0.6s ease-out both;
        }

        .landing-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--accent-text);
          background: var(--accent-subtle);
          border: 1px solid rgba(45,212,191,0.25);
          padding: 0.35rem 0.875rem;
          border-radius: 9999px;
          margin-bottom: 1.75rem;
          letter-spacing: 0.02em;
        }
        .landing-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: var(--accent);
          animation: pulse 2s ease-in-out infinite;
        }

        .landing-h1 {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-primary);
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }
        .landing-h1-accent {
          color: var(--accent);
        }

        .landing-sub {
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          color: var(--text-secondary);
          line-height: 1.65;
          max-width: 480px;
          margin: 0 auto 2rem;
        }

        .landing-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .landing-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          background: var(--accent);
          color: #0D1117;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 12px;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 4px 20px rgba(45,212,191,0.3);
        }
        .landing-cta-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(45,212,191,0.4);
        }

        .landing-cta-ghost {
          display: inline-flex;
          align-items: center;
          padding: 0.875rem 1.5rem;
          background: var(--bg-input);
          color: var(--text-primary);
          font-weight: 500;
          font-size: 1rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
        }
        .landing-cta-ghost:hover {
          background: var(--border);
          transform: translateY(-2px);
        }

        .landing-free-note {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        /* Features */
        .landing-features {
          position: relative;
          z-index: 1;
          max-width: 860px;
          margin: 1rem auto 0;
          padding: 0 1.5rem 3rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.875rem;
          animation: fadeUp 0.6s ease-out 0.15s both;
        }
        @media (min-width: 640px) {
          .landing-features { grid-template-columns: repeat(4, 1fr); }
        }

        .landing-feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .landing-feature-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .landing-feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--accent-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }

        .landing-feature-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .landing-feature-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Bottom CTA */
        .landing-bottom-cta {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 2.5rem 1.5rem 3rem;
          animation: fadeUp 0.6s ease-out 0.3s both;
        }
        .landing-bottom-text {
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
          font-family: var(--font-display);
        }

        /* Footer */
        .landing-footer {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          border-top: 1px solid var(--border);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
