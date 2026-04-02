import { useState } from 'react'
import type { JSX, CSSProperties } from 'react'
import type { ConceptCard, InteractPrompt } from '../../types/card'

// ─── Style helpers ─────────────────────────────────────────────────────────────

function revealBtnStyle(revealed: boolean): CSSProperties {
  return {
    border: `1px solid ${revealed ? '#10b981' : '#475569'}`,
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: revealed ? 'default' : 'pointer',
    background: revealed ? '#064e3b' : '#1e293b',
    color: revealed ? '#6ee7b7' : '#94a3b8',
    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
  }
}

// ─── Single prompt card ────────────────────────────────────────────────────────

interface PromptCardProps {
  prompt: InteractPrompt
  index: number
  revealed: boolean
  onReveal: () => void
}

function PromptCard({ prompt, index, revealed, onReveal }: PromptCardProps): JSX.Element {
  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '8px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: `1px solid ${revealed ? '#166534' : 'transparent'}`,
        transition: 'border-color 0.25s',
      }}
    >
      {/* Instruction row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span
          style={{
            background: '#8b5cf6',
            color: '#fff',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {index + 1}
        </span>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, color: '#e2e8f0' }}>
          {prompt.instruction}
        </p>
      </div>

      {/* Hint — shown before reveal */}
      {prompt.hint && !revealed && (
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#64748b',
            fontStyle: 'italic',
            paddingLeft: '30px',
          }}
        >
          💡 {prompt.hint}
        </p>
      )}

      {/* Reveal button */}
      <div style={{ paddingLeft: '30px' }}>
        <button
          style={revealBtnStyle(revealed)}
          onClick={revealed ? undefined : onReveal}
          disabled={revealed}
        >
          {revealed ? '✓ Answer revealed' : 'Reveal answer'}
        </button>
      </div>

      {/* Answer — shown after reveal */}
      {revealed && prompt.expectedOutcome && (
        <div
          style={{
            background: '#0f2a1d',
            border: '1px solid #166534',
            borderRadius: '6px',
            padding: '10px 14px',
            marginLeft: '30px',
            fontFamily: 'ui-monospace, "Cascadia Code", monospace',
            fontSize: '13px',
            color: '#86efac',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {prompt.expectedOutcome}
        </div>
      )}
    </div>
  )
}

// ─── TracerInteract ────────────────────────────────────────────────────────────

export function TracerInteract({ card }: { card: ConceptCard }): JSX.Element {
  const { setup, prompts } = card.interact
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const allViewed = prompts.length === 0 || revealed.size >= prompts.length

  const revealPrompt = (i: number) =>
    setRevealed(prev => new Set([...prev, i]))

  const emitComplete = () =>
    window.dispatchEvent(
      new CustomEvent('plugin:complete', { detail: { phase: 'interact' } }),
    )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '28px 24px',
        background: '#0f172a',
        borderRadius: '12px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        color: '#e2e8f0',
      }}
    >
      {/* Setup header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            color: '#94a3b8',
            lineHeight: 1.6,
            borderLeft: '3px solid #8b5cf6',
            paddingLeft: '12px',
          }}
        >
          {setup}
        </p>
        <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
          {revealed.size} / {prompts.length} revealed
        </span>
      </div>

      {/* Prompt cards */}
      {prompts.map((prompt, i) => (
        <PromptCard
          key={i}
          prompt={prompt}
          index={i}
          revealed={revealed.has(i)}
          onReveal={() => revealPrompt(i)}
        />
      ))}

      {/* Continue — unlocked when all prompts viewed */}
      {allViewed && (
        <button
          style={{
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            background: '#10b981',
            color: '#fff',
            alignSelf: 'flex-start',
          }}
          onClick={emitComplete}
        >
          Continue to Recall →
        </button>
      )}
    </div>
  )
}
