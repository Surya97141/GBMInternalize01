import type { ConceptCard } from '../../types/card'
import type { EvalResult, VisualiserPlugin } from '../../types/plugin'
import { TracerWatch } from './TracerWatch'
import { TracerInteract } from './TracerInteract'
import { TracerRecall } from './TracerRecall'

// ─── Anthropic response shape ──────────────────────────────────────────────────

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>
}

// ─── Fallback evaluator (no API key / network error) ──────────────────────────

function fallbackEval(answer: string, card: ConceptCard): EvalResult {
  const lower    = answer.toLowerCase()
  const keywords = card.recall.requiredKeywords ?? []
  const matched  = keywords.filter(kw => lower.includes(kw.toLowerCase()))
  const missing  = keywords.filter(kw => !lower.includes(kw.toLowerCase()))
  const score    =
    keywords.length > 0
      ? matched.length / keywords.length
      : answer.trim().length > 30
      ? 0.5
      : 0.1

  return {
    correct:              score >= 0.8,
    partialUnderstanding: score >= 0.4 && score < 0.8,
    correctElements:      matched,
    missingElements:      missing,
    misconceptions:       [],
    reasoningScore:       score,
    nextHint:
      missing.length > 0
        ? `Try to include: ${missing.slice(0, 2).join(', ')}`
        : 'Expand your answer with more detail.',
  }
}

// ─── Anthropic evaluator ──────────────────────────────────────────────────────

async function evaluateWithAnthropic(
  answer: string,
  card: ConceptCard,
): Promise<EvalResult> {
  const apiKey = (import.meta.env.VITE_ANTHROPIC_KEY as string | undefined) ?? ''
  if (!apiKey) return fallbackEval(answer, card)

  const strict =
    card.answerType === 'EXACT' ||
    card.subjectMode === 'MATH' ||
    (card.subjectMode === 'CS' && card.answerType !== 'REASONING')

  const system = [
    'You are an expert tutor evaluating a student\'s answer.',
    strict
      ? 'Be strict: award partial credit only when the core insight is correct.'
      : 'Be generous: reward correct reasoning even when wording differs from the model answer.',
    '',
    'Return ONLY valid JSON with no markdown fences and no explanation:',
    '{',
    '  "correct": boolean,',
    '  "partialUnderstanding": boolean,',
    '  "correctElements": string[],',
    '  "missingElements": string[],',
    '  "misconceptions": string[],',
    '  "reasoningScore": number,',
    '  "nextHint": string',
    '}',
    '',
    'reasoningScore is 0–1.',
    'Each element in correctElements / missingElements / misconceptions is a short phrase (≤8 words).',
  ].join('\n')

  const user = [
    `SUBJECT: ${card.subjectMode}`,
    `CONCEPT: ${card.name}`,
    `CORE LOGIC: ${card.coreLogic}`,
    `MODEL ANSWER: ${card.recall.modelAnswer}`,
    `REQUIRED KEYWORDS: ${(card.recall.requiredKeywords ?? []).join(', ') || 'none'}`,
    `COMMON MISTAKES: ${(card.recall.commonMistakes ?? []).join('; ') || 'none'}`,
    '',
    `STUDENT ANSWER: ${answer}`,
  ].join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })

    if (!response.ok) return fallbackEval(answer, card)

    const data = (await response.json()) as AnthropicResponse
    const text = data.content.find(c => c.type === 'text')?.text ?? ''
    const parsed = JSON.parse(text) as Partial<EvalResult>

    return {
      correct:              Boolean(parsed.correct),
      partialUnderstanding: Boolean(parsed.partialUnderstanding),
      correctElements:      Array.isArray(parsed.correctElements) ? parsed.correctElements : [],
      missingElements:      Array.isArray(parsed.missingElements)  ? parsed.missingElements  : [],
      misconceptions:       Array.isArray(parsed.misconceptions)   ? parsed.misconceptions   : [],
      reasoningScore:       typeof parsed.reasoningScore === 'number'
                              ? Math.max(0, Math.min(1, parsed.reasoningScore))
                              : 0,
      nextHint:             typeof parsed.nextHint === 'string' ? parsed.nextHint : '',
    }
  } catch {
    return fallbackEval(answer, card)
  }
}

// ─── TracerPlugin ─────────────────────────────────────────────────────────────

export const TracerPlugin: VisualiserPlugin = {
  render(card: ConceptCard) {
    return <TracerWatch card={card} />
  },

  interact(card: ConceptCard) {
    return <TracerInteract card={card} />
  },

  recall(card: ConceptCard) {
    return <TracerRecall card={card} onEvaluate={evaluateWithAnthropic} />
  },

  evaluate: evaluateWithAnthropic,
}
