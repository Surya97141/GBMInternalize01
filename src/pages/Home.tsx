import { useState } from 'react'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseCard } from '../engine/cardParser'
import { validateCard } from '../engine/cardParser'

// ─── Home page ─────────────────────────────────────────────────────────────────
//
// Presents a full-height textarea where the learner pastes a raw ===CARD===
// block.  On submit, the card is parsed, validated, and — if clean — stored in
// sessionStorage before navigating to /learn.

const PLACEHOLDER = `===CARD===
NAME: Lambda Expressions
TYPE: CONCEPT
VISUAL: TRACER
EXAM WEIGHT: 4
MUST-KNOW: anonymous function, functional interface, effectively final
LIKELY-ASKED: What is a lambda expression?
TRICKY: variables must be effectively final
FORMULAS: (params) -> body
VARIATIONS: 1
CORE LOGIC: A lambda is an anonymous function that implements a single-method interface.
WATCH:
INTRO: Lambdas let you write concise anonymous functions inline.
STEP 1 | Syntax: Write (param) -> expression to implement a functional interface.
SUMMARY: Lambdas enable functional-style programming in Java 8+.
INTERACT:
SETUP: Complete the lambda task below.
PROMPT 1: Write a lambda that doubles an integer.
EXPECTED 1: n -> n * 2
HINT 1: The return type is inferred from the functional interface.
RECALL:
QUESTION: What constraint applies to variables captured by a lambda?
ANSWER: They must be effectively final — assigned once, never reassigned.
KEYWORDS: effectively final, captured
VARIATION 1:
LABEL: Comparator Lambda
QUESTION: Write a lambda to sort strings by length.
ANSWER: (a, b) -> a.length() - b.length()
TYPE: PARAM_CHANGE
REAL_WORLD: Sorting collections, stream pipelines, event listeners
SUBJECT_MODE: CS
ABSTRACTION: 3
ANSWER_TYPE: SYMBOLIC
VARIATION_TYPE: PARAM_CHANGE
LINKS: Functional Interfaces (REQUIRES)
GOAL_MODES: EXAM_PREP, INTERVIEW_PREP
MEMORY_LOAD: 3
===CARD===`

export function Home(): JSX.Element {
  const navigate = useNavigate()
  const [raw, setRaw]       = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const handleLoad = () => {
    if (!raw.trim()) {
      setErrors(['Paste a ===CARD=== block above before loading.'])
      return
    }
    const card = parseCard(raw)
    const errs = validateCard(card)
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    sessionStorage.setItem('active_card', JSON.stringify(card))
    navigate('/learn')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleLoad()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080c14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        textAlign: 'left',
      }}
    >
      <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div>
          <h1
            style={{
              margin: '0 0 6px',
              fontSize: '28px',
              fontWeight: 700,
              color: '#f1f5f9',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              letterSpacing: '-0.5px',
            }}
          >
            Concept Engine
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            Paste a <code style={{ fontFamily: 'ui-monospace, monospace', background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#7dd3fc', fontSize: '13px' }}>===CARD===</code> block to start learning. <kbd style={{ fontSize: '11px', color: '#475569' }}>Ctrl+Enter</kbd> to load.
          </p>
        </div>

        {/* Textarea */}
        <textarea
          value={raw}
          onChange={e => { setRaw(e.target.value); if (errors.length) setErrors([]) }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          rows={22}
          spellCheck={false}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0f172a',
            border: `1px solid ${errors.length ? '#7f1d1d' : '#1e293b'}`,
            borderRadius: '10px',
            padding: '16px',
            fontSize: '13px',
            lineHeight: 1.7,
            color: '#e2e8f0',
            fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = errors.length ? '#ef4444' : '#334155' }}
          onBlur={e => { e.currentTarget.style.borderColor = errors.length ? '#7f1d1d' : '#1e293b' }}
        />

        {/* Error list */}
        {errors.length > 0 && (
          <ul
            style={{
              margin: 0,
              padding: '12px 16px',
              listStyle: 'none',
              background: '#1c0a0a',
              border: '1px solid #7f1d1d',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {errors.map((err, i) => (
              <li key={i} style={{ fontSize: '13px', color: '#fca5a5', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                ✗ {err}
              </li>
            ))}
          </ul>
        )}

        {/* Load button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleLoad}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              background: '#8b5cf6',
              color: '#fff',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#8b5cf6' }}
          >
            Load card →
          </button>
          <span style={{ fontSize: '12px', color: '#334155', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            parseCard → validateCard → /learn
          </span>
        </div>

      </div>
    </div>
  )
}
