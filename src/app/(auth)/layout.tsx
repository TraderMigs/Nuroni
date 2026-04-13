import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Nuroni"
            width={220}
            height={73}
            className="mx-auto"
            priority
            style={{ objectFit: 'contain', width: '220px', height: 'auto' }}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
