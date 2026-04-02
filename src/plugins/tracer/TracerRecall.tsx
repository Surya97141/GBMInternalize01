import { useState } from 'react'
import type { JSX, CSSProperties } from 'react'
import type { ConceptCard } from '../../types/card'
import type { EvalResult } from '../../types/plugin'

// ─── Style helpers ─────────────────────────────────────────────────────────────

function chipStyle(color: 'green' | 'amber' | 'red'): CSSProperties {
  const palette = {
    green: { bg: '#064e3b', border: '#166534', text: '#86efac' },
    amber: { bg: '#451a03', border: '#92400e', text: '#fcd34d' },
    red:   { bg: '#450a0a', border: '#991b1b', text: '#fca5a5' },
  } as const
  const c = palette[color]
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
  }
}

function scoreColor(score: number): string {
  if (score >= 0.7) return '#10b981'
  if (score >= 0.4) return '#f59e0b'
  return '#ef4444'
}

// ─── Chip list section ─────────────────────────────────────────────────────────

interface ChipListProps {
  items: string[]
  color: 'green' | 'amber' | 'red'
  label: string
}

function ChipList({ items, color, label }: ChipListProps): JSX.Element | null {
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#475569',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item, i) => (
          <span key={i} style={chipStyle(color)}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── TracerRecall ──────────────────────────────────────────────────────────────

export interface TracerRecallProps {
  card: ConceptCard
  onEvaluate: (answer: string, card: ConceptCard) => Promise<EvalResult>
}

export function TracerRecall({ card, onEvaluate }: TracerRecallProps): JSX.Element {
  const [answer, setAnswer]   = useState('')
  const [result, setResult]   = useState<EvalResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const canCheck = answer.trim().length > 0 && !loading && result === null

  const check = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await onEvaluate(answer.trim(), card)
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  const retry = () => {
    setAnswer('')
    setResult(null)
    setError(null)
  }

  const pct = result ? Math.round(result.reasoningScore * 100) : 0

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
      {/* Question box */}
      <div
        style={{
          background: '#1e293b',
          borderRadius: '8px',
          borderLeft: '4px solid #f59e0b',
          padding: '16px 20px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#f59e0b',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          Recall
        </span>
        <p
          style={{
            margin: 0,
            fontSize: '16px',
            color: '#f1f5f9',
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {card.recall.question}
        </p>
      </div>

      {/* Answer input — hidden after a result is received */}
      {result === null && (
        <>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer from memory…"
            rows={4}
            style={{
              background: '#1e293b',
              border: `1px solid ${focused ? '#f59e0b' : '#334155'}`,
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '14px',
              color: '#e2e8f0',
              lineHeight: 1.7,
              fontFamily: 'ui-monospace, "Cascadia Code", monospace',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
              width: '100%',
              boxSizing: 'border-box',
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={check}
              disabled={!canCheck}
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                background: canCheck ? '#f59e0b' : '#334155',
                color: canCheck ? '#000' : '#64748b',
                cursor: canCheck ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {loading ? 'Checking…' : 'Check answer'}
            </button>
            {loading && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>Asking Claude…</span>
            )}
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>{error}</p>
          )}
        </>
      )}

      {/* Evaluation result */}
      {result !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Score bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: result.correct
                    ? '#10b981'
                    : result.partialUnderstanding
                    ? '#f59e0b'
                    : '#ef4444',
                }}
              >
                {result.correct
                  ? '✓ Correct'
                  : result.partialUnderstanding
                  ? '~ Partial understanding'
                  : '✗ Needs more work'}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: scoreColor(result.reasoningScore),
                }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                background: '#1e293b',
                borderRadius: '9999px',
                height: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  width: `${pct}%`,
                  background: scoreColor(result.reasoningScore),
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>

          {/* Chip grids */}
          <ChipList items={result.correctElements} color="green" label="Got right" />
          <ChipList items={result.missingElements}  color="amber" label="Missing" />
          <ChipList items={result.misconceptions}   color="red"   label="Misconceptions" />

          {/* Hint */}
          {result.nextHint && (
            <div
              style={{
                background: '#1c1f2e',
                border: '1px solid #3730a3',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#a5b4fc',
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px', color: '#818cf8' }}>
                💡 Hint
              </strong>
              {result.nextHint}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={retry}
              style={{
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 500,
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {result.correct && (
              <button
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#10b981',
                  color: '#fff',
                  cursor: 'pointer',
                }}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('plugin:complete', { detail: { phase: 'recall' } }),
                  )
                }
              >
                Complete →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
