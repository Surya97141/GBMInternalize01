import { useState, useEffect } from 'react'
import type { JSX, CSSProperties } from 'react'
import type { ConceptCard, WatchStep } from '../../types/card'

// ─── Style helpers ─────────────────────────────────────────────────────────────

function actionBtn(variant: 'blue' | 'green'): CSSProperties {
  return {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    background: variant === 'blue' ? '#3b82f6' : '#10b981',
    color: '#fff',
    alignSelf: 'flex-start',
  }
}

// ─── Animated step card ────────────────────────────────────────────────────────

interface StepCardProps {
  step: WatchStep
  stepIndex: number
}

function StepCard({ step, stepIndex }: StepCardProps): JSX.Element {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            background: '#3b82f6',
            color: '#fff',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {stepIndex + 1}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#7dd3fc',
            textTransform: 'uppercase',
          }}
        >
          {step.label}
        </span>
      </div>

      <p
        style={{
          fontSize: '14px',
          color: '#cbd5e1',
          lineHeight: 1.75,
          margin: 0,
          fontFamily: 'ui-monospace, "Cascadia Code", monospace',
          paddingLeft: '28px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {step.content}
      </p>
    </div>
  )
}

// ─── TracerWatch ───────────────────────────────────────────────────────────────

export function TracerWatch({ card }: { card: ConceptCard }): JSX.Element {
  const { steps, intro, summary } = card.watch
  const [revealedCount, setRevealedCount] = useState(0)
  const allRevealed = steps.length === 0 || revealedCount >= steps.length

  const advance = () => setRevealedCount(c => Math.min(c + 1, steps.length))

  const emitComplete = () =>
    window.dispatchEvent(
      new CustomEvent('plugin:complete', { detail: { phase: 'watch' } }),
    )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '28px 24px',
        background: '#0f172a',
        borderRadius: '12px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        color: '#e2e8f0',
      }}
    >
      {/* Intro sentence */}
      <p
        style={{
          fontSize: '15px',
          color: '#94a3b8',
          fontStyle: 'italic',
          lineHeight: 1.65,
          borderLeft: '3px solid #3b82f6',
          paddingLeft: '12px',
          margin: 0,
        }}
      >
        {intro || card.coreLogic}
      </p>

      {/* Steps revealed one at a time */}
      {steps.slice(0, revealedCount).map((step, i) => (
        <StepCard key={i} step={step} stepIndex={i} />
      ))}

      {/* Next step / progress counter */}
      {!allRevealed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={actionBtn('blue')} onClick={advance}>
            {revealedCount === 0 ? 'Start →' : 'Next step →'}
          </button>
          <span style={{ fontSize: '12px', color: '#475569' }}>
            {revealedCount} / {steps.length}
          </span>
        </div>
      )}

      {/* Summary — shown when all steps are revealed */}
      {allRevealed && summary && (
        <div
          style={{
            background: '#134e4a',
            border: '1px solid #14b8a6',
            borderRadius: '8px',
            padding: '14px 18px',
            fontSize: '14px',
            color: '#99f6e4',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px', color: '#2dd4bf' }}>
            Summary
          </strong>
          {summary}
        </div>
      )}

      {/* Continue button unlocked when all steps revealed */}
      {allRevealed && (
        <button style={actionBtn('green')} onClick={emitComplete}>
          Continue to Interact →
        </button>
      )}
    </div>
  )
}
