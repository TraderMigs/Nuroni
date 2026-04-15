'use client'

import { useState } from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  Gym: '#2dd4bf',
  Walk: '#60a5fa',
  Meal: '#f59e0b',
  Other: '#a78bfa',
}

interface Photo {
  id: string
  photo_url: string
  category: string
  created_at: string
}

export default function ProofGrid({ photos }: { photos: Photo[] }) {
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState<string | null>(null)

  return (
    <>
      <div className="card p-4">
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', padding: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Proof of the Day
              </h2>
              {photos.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                  {photos.length}
                </span>
              )}
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 animate-fade-in">
            {photos.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No proof yet — start posting!
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative cursor-pointer"
                    style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}
                    onClick={() => setFullscreen(photo.photo_url)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.category}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Category badge overlay */}
                    <div style={{ position: 'absolute', bottom: 4, left: 4 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: 4,
                          background: `${CATEGORY_COLORS[photo.category] || '#888'}cc`,
                          color: '#fff',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {photo.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setFullscreen(null)}
        >
          <button
            onClick={() => setFullscreen(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img
            src={fullscreen}
            alt="Proof"
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
