import { useState, useEffect } from 'react'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ConceptCard } from '../types/card'
import { getPlugin } from '../engine/pluginRegistry'

// ─── Constants ─────────────────────────────────────────────────────────────────

const PHASES = ['Watch', 'Interact', 'Recall'] as const
type PhaseIndex = 0 | 1 | 2

// Colour shown on the active phase button and the phase strip accent line.
const PHASE_ACCENT = '#8b5cf6'

// ─── Sub-components ────────────────────────────────────────────────────────────

function ExamStars({ weight }: { weight: number }): JSX.Element {
  return (
    <span
      title={`Exam weight ${weight}/5`}
      style={{ color: '#f59e0b', fontSize: '16px', letterSpacing: '1px' }}
    >
      {'★'.repeat(weight)}
      <span style={{ color: '#334155' }}>{'★'.repeat(5 - weight)}</span>
    </span>
  )
}

function PhaseStrip({
  phase,
  onSelect,
}: {
  phase: PhaseIndex
  onSelect: (p: PhaseIndex) => void
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        background: '#0f172a',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid #1e293b',
      }}
    >
      {PHASES.map((label, i) => {
        const active = phase === i
        return (
          <button
            key={label}
            onClick={() => onSelect(i as PhaseIndex)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: '7px',
              padding: '8px 0',
              fontSize: '13px',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              background: active ? PHASE_ACCENT : 'transparent',
              color: active ? '#fff' : '#64748b',
              transition: 'background 0.2s, color 0.2s',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              letterSpacing: active ? '0.02em' : '0',
            }}
          >
            {i + 1}. {label}
          </button>
        )
      })}
    </div>
  )
}

function MustKnowPills({ keywords }: { keywords: string[] }): JSX.Element | null {
  if (keywords.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {keywords.map((kw, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 500,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            fontFamily: 'ui-monospace, "Cascadia Code", monospace',
          }}
        >
          {kw}
        </span>
      ))}
    </div>
  )
}

// ─── Learn page ────────────────────────────────────────────────────────────────

export function Learn(): JSX.Element {
  const navigate = useNavigate()
  const [card, setCard]   = useState<ConceptCard | null>(null)
  const [phase, setPhase] = useState<PhaseIndex>(0)

  // Load card from sessionStorage once on mount.
  useEffect(() => {
    const stored = sessionStorage.getItem('active_card')
    if (!stored) { navigate('/'); return }
    try {
      setCard(JSON.parse(stored) as ConceptCard)
    } catch {
      navigate('/')
    }
  }, [navigate])

  // Advance phase when any plugin fires the 'plugin:complete' custom event.
  useEffect(() => {
    const handler = () =>
      setPhase(p => (p < 2 ? ((p + 1) as PhaseIndex) : p))
    window.addEventListener('plugin:complete', handler)
    return () => window.removeEventListener('plugin:complete', handler)
  }, [])

  // Nothing to show until the card is loaded.
  if (!card) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080c14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '14px',
        }}
      >
        Loading…
      </div>
    )
  }

  const plugin = getPlugin(card.visual)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080c14',
        padding: '24px 16px 48px',
        boxSizing: 'border-box',
        textAlign: 'left',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Card header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 4px',
                fontSize: '24px',
                fontWeight: 700,
                color: '#f1f5f9',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                letterSpacing: '-0.3px',
                lineHeight: 1.25,
              }}
            >
              {card.name}
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
              {card.subjectMode} · {card.type} · {card.visual}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
            <ExamStars weight={card.examWeight} />
            <span style={{ fontSize: '11px', color: '#334155', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
              exam weight
            </span>
          </div>
        </div>

        {/* ── Phase strip ── */}
        <PhaseStrip phase={phase} onSelect={setPhase} />

        {/* ── Must-know keyword pills ── */}
        <MustKnowPills keywords={card.mustKnow} />

        {/* ── Plugin content ── */}
        <div>
          {phase === 0 && plugin.render(card)}
          {phase === 1 && plugin.interact(card)}
          {phase === 2 && plugin.recall(card)}
        </div>

        {/* ── Footer: back link ── */}
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              fontSize: '13px',
              color: '#475569',
              cursor: 'pointer',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
          >
            ← load a different card
          </button>
        </div>

      </div>
    </div>
  )
}
