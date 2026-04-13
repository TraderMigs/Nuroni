export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Nuroni"
            style={{ width: '200px', height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
