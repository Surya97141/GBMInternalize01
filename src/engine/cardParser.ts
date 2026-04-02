import type {
  ConceptCard,
  CardType,
  VisualType,
  ExamWeight,
  VariationCount,
  AnswerType,
  VariationType,
  SubjectMode,
  MemoryLoad,
  AbstractionLevel,
  GoalMode,
  WatchPhase,
  InteractPhase,
  RecallPhase,
  CardVariation,
  ConceptLink,
} from '../types/card'
import { emptyCard } from '../types/card'

// ─── Label regexes ─────────────────────────────────────────────────────────────
//
// All regexes use the `g`, `i`, and `m` flags.  The `m` flag makes `^` match
// the start of each line, so only labels that begin a line are recognised.
// The single capture group (group 1) captures the label name.
//
// ORDER matters inside alternations: longer / more specific alternatives must
// come before shorter ones that share a prefix (e.g. VARIATIONS before
// VARIATION_TYPE before VARIATION N).

/** Matches every top-level field label at the start of a line. */
const TOP_LABEL_RE =
  /^(NAME|TYPE|VISUAL|EXAM[ \t]+WEIGHT|MUST-KNOW|LIKELY-ASKED|TRICKY|FORMULAS|VARIATIONS|CORE[ \t]+LOGIC|WATCH|INTERACT|RECALL|VARIATION_TYPE|VARIATION[ \t]+\d+|REAL_WORLD|SUBJECT_MODE|ABSTRACTION|ANSWER_TYPE|LINKS|GOAL_MODES|MEMORY_LOAD)[ \t]*:/gim

/** Sub-labels inside a WATCH block. */
const WATCH_LABEL_RE =
  /^(INTRO|STEP[ \t]+\d+(?:[ \t]*\|[^:]*)?|SUMMARY)[ \t]*:/gim

/** Sub-labels inside an INTERACT block. */
const INTERACT_LABEL_RE =
  /^(SETUP|PROMPT[ \t]+\d+|EXPECTED[ \t]+\d+|HINT[ \t]+\d+)[ \t]*:/gim

/** Sub-labels inside a RECALL block. */
const RECALL_LABEL_RE =
  /^(QUESTION|ANSWER|KEYWORDS|MISTAKES)[ \t]*:/gim

/** Sub-labels inside a VARIATION N block. */
const VARIATION_LABEL_RE =
  /^(LABEL|QUESTION|ANSWER|TYPE)[ \t]*:/gim

// ─── Generic field extractor ───────────────────────────────────────────────────

/**
 * Scan `text` for every label that `labelRe` matches at the start of a line.
 * `labelRe` must have the `g` + `m` flags and exactly one capture group that
 * captures the label name.
 *
 * Returns a Map whose keys are UPPER-CASED, whitespace-normalised label names
 * and whose values are the trimmed text that follows each label (up to the
 * start of the next label or end of string).
 */
function extractFieldMap(text: string, labelRe: RegExp): Map<string, string> {
  // Clone to avoid mutating the module-level lastIndex
  const re = new RegExp(labelRe.source, labelRe.flags)

  const positions: Array<{ key: string; start: number; valueStart: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    positions.push({
      // Normalise whitespace; uppercase for consistent lookup
      key: m[1].replace(/[ \t]+/g, ' ').toUpperCase(),
      start: m.index,
      valueStart: m.index + m[0].length,
    })
  }

  const map = new Map<string, string>()
  for (let i = 0; i < positions.length; i++) {
    const { key, valueStart } = positions[i]
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length
    map.set(key, text.slice(valueStart, end).trim())
  }
  return map
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

/** Convert a display name into a URL-safe slug used as the card's `id`. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Split a comma-separated string, trim each part, strip surrounding quotes,
 * and drop empties.  Returns [] for blank input or the literal string "NONE".
 */
function parseCSV(raw: string): string[] {
  if (!raw || raw.toUpperCase() === 'NONE') return []
  return raw
    .split(',')
    .map(s => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

/**
 * Convert an ALL-CAPS string to Title Case for display labels.
 * "CLOSURE CAPTURE" → "Closure Capture"
 */
function toTitleCase(s: string): string {
  return s.replace(/\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

// ─── Type guards ───────────────────────────────────────────────────────────────

const CARD_TYPE_VALUES: readonly string[] = [
  'PROCESS', 'CONCEPT', 'RELATIONSHIP', 'CODE', 'COMPARISON', 'PROOF',
]
const VISUAL_TYPE_VALUES: readonly string[] = [
  'SIMULATOR', 'SCENARIO', 'STRUCTURE', 'TRACER', 'ARENA',
  'BUILDER', 'DIAGRAM', 'EQUATION', 'TIMELINE', 'ARGUMENT', 'INTERPRET', 'ANALOGY',
]
const ANSWER_TYPE_VALUES: readonly string[] = [
  'EXACT', 'REASONING', 'INTERPRETIVE', 'SYMBOLIC',
]
const VARIATION_TYPE_VALUES: readonly string[] = [
  'PARAM_CHANGE', 'EDGE_CASE', 'REVERSE', 'CONTEXT_SHIFT', 'MISCONCEPTION',
]
const SUBJECT_MODE_VALUES: readonly string[] = [
  'CS', 'MATH', 'SCIENCE', 'HISTORY', 'LANGUAGE', 'BUSINESS', 'MEDICINE', 'LAW', 'GENERAL',
]
const GOAL_MODE_VALUES: readonly string[] = [
  'EXAM_PREP', 'DEEP_UNDERSTANDING', 'QUICK_REVIEW', 'INTERVIEW_PREP', 'TEACH_BACK',
]

function isCardType(s: string): s is CardType         { return CARD_TYPE_VALUES.includes(s) }
function isVisualType(s: string): s is VisualType     { return VISUAL_TYPE_VALUES.includes(s) }
function isAnswerType(s: string): s is AnswerType     { return ANSWER_TYPE_VALUES.includes(s) }
function isVariationType(s: string): s is VariationType { return VARIATION_TYPE_VALUES.includes(s) }
function isSubjectMode(s: string): s is SubjectMode   { return SUBJECT_MODE_VALUES.includes(s) }
function isGoalMode(s: string): s is GoalMode         { return GOAL_MODE_VALUES.includes(s) }

// ─── Sub-parsers ───────────────────────────────────────────────────────────────

/**
 * Parse the text that follows a top-level WATCH: label.
 *
 * Expected sub-format:
 *   INTRO: introductory sentence
 *   STEP 1 | Label Text: step content (may span multiple lines)
 *   STEP 2 | Label Text: step content
 *   SUMMARY: optional closing sentence        ← optional
 *
 * If no INTRO: sub-label is found the entire raw text is used as `intro`
 * (supports plain single-line cards).
 */
function parseWatchPhase(raw: string): WatchPhase {
  if (!raw.trim()) return { intro: '', steps: [] }

  const fields = extractFieldMap(raw, WATCH_LABEL_RE)

  const stepEntries: Array<{ index: number; label: string; content: string }> = []

  for (const [key, value] of fields) {
    // Key examples after normalisation: "STEP 1", "STEP 1 | SYNTAX"
    const m = key.match(/^STEP\s+(\d+)(?:\s*\|\s*(.+))?$/)
    if (m) {
      stepEntries.push({
        index: parseInt(m[1], 10),
        // Preserve a readable label; toTitleCase recovers capitalisation lost
        // when the key was uppercased during extraction.
        label: m[2] ? toTitleCase(m[2].trim()) : `Step ${m[1]}`,
        content: value,
      })
    }
  }

  stepEntries.sort((a, b) => a.index - b.index)

  const summary = fields.get('SUMMARY')

  return {
    intro: fields.get('INTRO') ?? raw.trim(),
    steps: stepEntries.map(({ label, content }) => ({ label, content })),
    ...(summary ? { summary } : {}),
  }
}

/**
 * Parse the text that follows a top-level INTERACT: label.
 *
 * Expected sub-format:
 *   SETUP: context sentence
 *   PROMPT 1: what the learner must do
 *   EXPECTED 1: model outcome          ← optional
 *   HINT 1: hint if stuck              ← optional
 *   PROMPT 2: ...
 */
function parseInteractPhase(raw: string): InteractPhase {
  if (!raw.trim()) return { setup: '', prompts: [] }

  const fields = extractFieldMap(raw, INTERACT_LABEL_RE)

  const setup = fields.get('SETUP') ?? ''

  // Build prompts indexed by their number
  const promptMap = new Map<number, { instruction: string; expectedOutcome?: string; hint?: string }>()

  const ensurePrompt = (idx: number) => {
    if (!promptMap.has(idx)) promptMap.set(idx, { instruction: '' })
    return promptMap.get(idx)!
  }

  for (const [key, value] of fields) {
    const pm = key.match(/^PROMPT\s+(\d+)$/)
    if (pm) { ensurePrompt(parseInt(pm[1], 10)).instruction = value; continue }

    const em = key.match(/^EXPECTED\s+(\d+)$/)
    if (em) { ensurePrompt(parseInt(em[1], 10)).expectedOutcome = value; continue }

    const hm = key.match(/^HINT\s+(\d+)$/)
    if (hm) { ensurePrompt(parseInt(hm[1], 10)).hint = value }
  }

  const prompts: InteractPhase['prompts'] = [...promptMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, p]) => p)

  return { setup, prompts }
}

/**
 * Parse the text that follows a top-level RECALL: label.
 *
 * Expected sub-format:
 *   QUESTION: the retrieval question
 *   ANSWER: model answer for LLM evaluation
 *   KEYWORDS: kw1, kw2, kw3          ← optional
 *   MISTAKES: "wrong answer 1", "wrong answer 2"  ← optional
 *
 * If no QUESTION: sub-label is found, the entire raw text is used as
 * `question` (supports terse single-line cards).
 */
function parseRecallPhase(raw: string): RecallPhase {
  if (!raw.trim()) return { question: '', modelAnswer: '' }

  const fields = extractFieldMap(raw, RECALL_LABEL_RE)

  const question    = fields.get('QUESTION') ?? raw.trim()
  const modelAnswer = fields.get('ANSWER')   ?? ''

  const kwRaw       = fields.get('KEYWORDS')
  const mistakesRaw = fields.get('MISTAKES')

  const requiredKeywords = kwRaw       ? parseCSV(kwRaw)       : undefined
  const commonMistakes   = mistakesRaw ? parseCSV(mistakesRaw) : undefined

  return {
    question,
    modelAnswer,
    ...(requiredKeywords?.length ? { requiredKeywords } : {}),
    ...(commonMistakes?.length   ? { commonMistakes }   : {}),
  }
}

/**
 * Parse the text that follows a VARIATION N: label.
 *
 * Expected sub-format:
 *   LABEL: short description of what's different
 *   QUESTION: modified recall question
 *   ANSWER: model answer
 *   TYPE: PARAM_CHANGE | EDGE_CASE | REVERSE | CONTEXT_SHIFT | MISCONCEPTION
 *
 * `defaultVT` is used when TYPE is absent or unrecognised (inherited from the
 * card's top-level VARIATION_TYPE field).
 */
function parseVariation(
  index: number,
  raw: string,
  defaultVT: VariationType,
): CardVariation {
  const fields = extractFieldMap(raw, VARIATION_LABEL_RE)

  const label       = fields.get('LABEL')    ?? `Variation ${index}`
  const question    = fields.get('QUESTION') ?? raw.trim()
  const modelAnswer = fields.get('ANSWER')   ?? ''
  const typeRaw     = (fields.get('TYPE') ?? '').toUpperCase()

  return {
    index,
    label,
    question,
    modelAnswer,
    variationType: isVariationType(typeRaw) ? typeRaw : defaultVT,
  }
}

/**
 * Parse the LINKS field value into ConceptLink objects.
 *
 * Supported formats (mixed in one string is fine):
 *   "Functional Interfaces (REQUIRES), Method References (LEADS_TO)"
 *   "Functional Interfaces, Method References"  ← defaults to REQUIRES
 *
 * Valid relation tokens: REQUIRES | LEADS_TO | CONTRAST | EXAMPLE_OF
 */
function parseLinks(raw: string): ConceptLink[] {
  if (!raw || raw.toUpperCase() === 'NONE') return []

  const VALID_RELATIONS = new Set<ConceptLink['relation']>([
    'REQUIRES', 'LEADS_TO', 'CONTRAST', 'EXAMPLE_OF',
  ])

  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map((part): ConceptLink => {
      const m = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
      if (m) {
        const rel = m[2].trim().toUpperCase() as ConceptLink['relation']
        return {
          cardName: m[1].trim(),
          relation: VALID_RELATIONS.has(rel) ? rel : 'REQUIRES',
        }
      }
      return { cardName: part, relation: 'REQUIRES' }
    })
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse a single raw ===CARD=== block into a ConceptCard.
 *
 * The ===CARD=== delimiters are optional — you can pass just the body text.
 * Any field that is absent or unrecognised falls back to the safe defaults
 * provided by `emptyCard()`.
 */
export function parseCard(raw: string): ConceptCard {
  const card = emptyCard()
  card.rawSource = raw.trim()

  // Strip leading/trailing delimiters so the body starts cleanly
  const body = raw
    .replace(/^===CARD===\s*/i, '')
    .replace(/\s*===CARD===$/i, '')
    .trim()

  const fields = extractFieldMap(body, TOP_LABEL_RE)
  const get = (key: string): string => fields.get(key) ?? ''

  // ── Identity ──────────────────────────────────────────────
  const name = get('NAME')
  if (name) {
    card.name = name
    card.id   = toSlug(name)
  }

  // ── Type / Visual ─────────────────────────────────────────
  const type = get('TYPE').toUpperCase()
  if (isCardType(type)) card.type = type

  const visual = get('VISUAL').toUpperCase()
  if (isVisualType(visual)) card.visual = visual

  // ── Exam metadata ─────────────────────────────────────────
  const ew = parseInt(get('EXAM WEIGHT'), 10)
  if (ew >= 1 && ew <= 5) card.examWeight = ew as ExamWeight

  card.mustKnow    = parseCSV(get('MUST-KNOW'))
  card.likelyAsked = parseCSV(get('LIKELY-ASKED'))
  card.tricky      = parseCSV(get('TRICKY'))

  // ── Formulas ──────────────────────────────────────────────
  const formulasRaw = get('FORMULAS')
  card.formulas = formulasRaw && formulasRaw.toUpperCase() !== 'NONE'
    ? parseCSV(formulasRaw)
    : []

  // ── Variations count ──────────────────────────────────────
  const vc = parseInt(get('VARIATIONS'), 10)
  if (vc >= 1 && vc <= 8) card.variationCount = vc as VariationCount

  // ── Core content ──────────────────────────────────────────
  card.coreLogic = get('CORE LOGIC')

  // ── Phase content ─────────────────────────────────────────
  card.watch    = parseWatchPhase(get('WATCH'))
  card.interact = parseInteractPhase(get('INTERACT'))
  card.recall   = parseRecallPhase(get('RECALL'))

  // ── VARIATION_TYPE must be resolved before parsing VARIATION N blocks
  //    so we can use it as the per-variation fallback.
  const vt = get('VARIATION_TYPE').toUpperCase()
  if (isVariationType(vt)) card.variationType = vt

  // ── Variation objects ─────────────────────────────────────
  card.variations = []
  for (let i = 1; i <= card.variationCount; i++) {
    const vRaw = get(`VARIATION ${i}`)
    if (vRaw) card.variations.push(parseVariation(i, vRaw, card.variationType))
  }

  // ── Context & connections ─────────────────────────────────
  card.realWorld = get('REAL_WORLD')

  const sm = get('SUBJECT_MODE').toUpperCase()
  if (isSubjectMode(sm)) card.subjectMode = sm

  const abs = parseInt(get('ABSTRACTION'), 10)
  if (abs >= 1 && abs <= 5) card.abstraction = abs as AbstractionLevel

  const at = get('ANSWER_TYPE').toUpperCase()
  if (isAnswerType(at)) card.answerType = at

  card.links = parseLinks(get('LINKS'))

  card.goalModes = parseCSV(get('GOAL_MODES'))
    .map(s => s.toUpperCase() as GoalMode)
    .filter(isGoalMode)

  const ml = parseInt(get('MEMORY_LOAD'), 10)
  if (ml >= 1 && ml <= 5) card.memoryLoad = ml as MemoryLoad

  return card
}

/**
 * Parse a string that contains one or more ===CARD=== blocks.
 *
 * Cards are delimited by the literal token `===CARD===`.  A single card
 * without delimiters is also accepted (the whole string is treated as one
 * block).
 */
export function parseCards(raw: string): ConceptCard[] {
  return raw
    .split(/===CARD===/i)
    .map(chunk => chunk.trim())
    .filter(chunk => /^NAME[ \t]*:/im.test(chunk)) // drop empty / header chunks
    .map(chunk => parseCard(chunk))
}

// ─── Validation ────────────────────────────────────────────────────────────────

const REQUIRED: Array<{ label: string; test: (c: ConceptCard) => boolean }> = [
  { label: 'name',                               test: c => c.name.length > 0 },
  { label: 'id',                                 test: c => c.id.length > 0 },
  { label: 'type (valid CardType)',              test: c => CARD_TYPE_VALUES.includes(c.type) },
  { label: 'visual (valid VisualType)',          test: c => VISUAL_TYPE_VALUES.includes(c.visual) },
  { label: 'coreLogic',                          test: c => c.coreLogic.length > 0 },
  { label: 'recall.question',                    test: c => c.recall.question.length > 0 },
  { label: 'recall.modelAnswer',                 test: c => c.recall.modelAnswer.length > 0 },
  {
    label: 'variations.length must equal variationCount',
    test: c => c.variations.length === c.variationCount,
  },
]

/**
 * Return an array of human-readable error messages for every required field
 * that is missing or invalid.  An empty array means the card is valid.
 */
export function validateCard(card: ConceptCard): string[] {
  return REQUIRED
    .filter(({ test }) => !test(card))
    .map(({ label }) => `Missing or invalid: ${label}`)
}

// ─── Example / smoke test ──────────────────────────────────────────────────────
//
// Paste the block below into a browser console or a quick Node script to
// verify round-trip correctness.
//
// import { parseCard, validateCard } from './cardParser'
//
// const RAW = `
// ===CARD===
// NAME: Lambda Expressions
// TYPE: CONCEPT
// VISUAL: TRACER
// EXAM WEIGHT: 4
// MUST-KNOW: anonymous function, functional interface, effectively final
// LIKELY-ASKED: What is a lambda expression?, When would you use a lambda?
// TRICKY: variables must be effectively final, lambdas are not serializable by default
// FORMULAS: (params) -> body, () -> expr
// VARIATIONS: 2
// CORE LOGIC: A lambda is an anonymous function that implements a single-method
// (functional) interface. Any outer variable it closes over must be effectively
// final — assigned exactly once and never reassigned.
// WATCH:
// INTRO: Lambda expressions let you pass behaviour as data without a full anonymous class.
// STEP 1 | Syntax: Write (param) -> expression to implement a functional interface inline.
// STEP 2 | Capture: Any outer variable referenced inside the lambda must be effectively final.
// SUMMARY: Lambdas enable concise functional-style programming in Java 8+.
// INTERACT:
// SETUP: Complete each lambda task in your head, then reveal the answer.
// PROMPT 1: Write a lambda that doubles an integer.
// EXPECTED 1: n -> n * 2
// HINT 1: The return type is inferred from the target functional interface.
// PROMPT 2: Why does the compiler reject this: int x = 0; Runnable r = () -> x++;
// EXPECTED 2: x is not effectively final — it is incremented after assignment.
// RECALL:
// QUESTION: What constraint applies to variables captured inside a lambda?
// ANSWER: They must be effectively final — assigned once and never reassigned afterwards.
// KEYWORDS: effectively final, captured, reassigned
// MISTAKES: "they must be declared final", "there are no constraints on captured variables"
// VARIATION 1:
// LABEL: Comparator Lambda
// QUESTION: Write a lambda to sort strings by length (shortest first).
// ANSWER: (a, b) -> a.length() - b.length()
// TYPE: PARAM_CHANGE
// VARIATION 2:
// LABEL: No-Arg Supplier
// QUESTION: Write a Supplier<String> lambda that always returns "hello".
// ANSWER: () -> "hello"
// TYPE: PARAM_CHANGE
// REAL_WORLD: Sorting collections, stream pipelines, event listeners, CompletableFuture callbacks
// SUBJECT_MODE: CS
// ABSTRACTION: 3
// ANSWER_TYPE: SYMBOLIC
// VARIATION_TYPE: PARAM_CHANGE
// LINKS: Functional Interfaces (REQUIRES), Method References (LEADS_TO)
// GOAL_MODES: EXAM_PREP, INTERVIEW_PREP
// MEMORY_LOAD: 3
// ===CARD===
// `
//
// const card = parseCard(RAW)
// console.assert(card.id               === 'lambda-expressions')
// console.assert(card.type             === 'CONCEPT')
// console.assert(card.visual           === 'TRACER')
// console.assert(card.examWeight       === 4)
// console.assert(card.mustKnow.length  === 3)
// console.assert(card.formulas.length  === 2)
// console.assert(card.variationCount   === 2)
// console.assert(card.variations.length === 2)
// console.assert(card.variations[0].label === 'Comparator Lambda')
// console.assert(card.variations[1].variationType === 'PARAM_CHANGE')
// console.assert(card.watch.steps.length === 2)
// console.assert(card.watch.steps[0].label === 'Syntax')
// console.assert(card.interact.prompts.length === 2)
// console.assert(card.interact.prompts[0].expectedOutcome === 'n -> n * 2')
// console.assert(card.recall.requiredKeywords?.includes('effectively final'))
// console.assert(card.links[0].cardName === 'Functional Interfaces')
// console.assert(card.links[0].relation === 'REQUIRES')
// console.assert(card.links[1].relation === 'LEADS_TO')
// console.assert(card.goalModes.includes('EXAM_PREP'))
// console.assert(validateCard(card).length === 0, 'card should be valid')
// console.log('All assertions passed ✓')
