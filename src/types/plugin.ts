import type { JSX } from 'react'
import type { ConceptCard, VisualType } from './card'

// ─── Evaluation result ─────────────────────────────────────────────────────────

/**
 * Structured result returned by VisualiserPlugin.evaluate().
 * The LLM adapter populates this; the UI reads it to render FeedbackBox.
 */
export interface EvalResult {
  /** Whether the learner's answer meets the acceptance threshold. */
  correct: boolean
  /** True when the answer shows partial understanding but is incomplete. */
  partialUnderstanding: boolean
  /** Key elements the learner got right (shown as green chips). */
  correctElements: string[]
  /** Key elements absent from the learner's answer (shown as amber chips). */
  missingElements: string[]
  /** Faulty beliefs detected in the answer (shown as red chips). */
  misconceptions: string[]
  /**
   * Overall reasoning quality, 0–1.
   * 0 = completely wrong, 0.5 = partial, 1 = exemplary.
   */
  reasoningScore: number
  /** The most helpful next hint to show if the learner wants to retry. */
  nextHint: string
}

/** An EvalResult that represents a pending / not-yet-evaluated state. */
export const EMPTY_EVAL_RESULT: EvalResult = {
  correct: false,
  partialUnderstanding: false,
  correctElements: [],
  missingElements: [],
  misconceptions: [],
  reasoningScore: 0,
  nextHint: '',
}

// ─── Plugin interface ──────────────────────────────────────────────────────────

/**
 * Contract every visualiser plugin must satisfy.
 *
 * Phase flow:  render → interact → recall → evaluate
 *
 * Each phase method receives the full ConceptCard so plugins can read any
 * field they need (formulas, coreLogic, watch steps, etc.) without prop
 * drilling.  The host (Learn page) controls which phase is active; it just
 * calls the right method and mounts the returned element.
 */
export interface VisualiserPlugin {
  /**
   * Phase 1 — Watch.
   * Passive introduction: animate / narrate the concept.
   */
  render(card: ConceptCard): JSX.Element

  /**
   * Phase 2 — Interact.
   * Guided interaction: the learner manipulates the visualisation.
   */
  interact(card: ConceptCard): JSX.Element

  /**
   * Phase 3 — Recall.
   * Retrieval practice: the learner answers from memory.
   */
  recall(card: ConceptCard): JSX.Element

  /**
   * Phase 4 — Evaluate.
   * Score the learner's free-text answer against the card's model answer.
   * Plugins delegate to the active LLM adapter; the interface is async to
   * accommodate both local heuristics and remote API calls.
   */
  evaluate(answer: string, card: ConceptCard): Promise<EvalResult>
}

// ─── Registry interface ────────────────────────────────────────────────────────

/**
 * Minimal interface consumed by hooks and pages that need to look up plugins
 * without importing the concrete PluginRegistry class.
 */
export interface IPluginRegistry {
  get(type: VisualType): VisualiserPlugin
  has(type: VisualType): boolean
  getRegistered(): VisualType[]
}
