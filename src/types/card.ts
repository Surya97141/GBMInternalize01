// ============================================================
// ConceptCard — source-of-truth type for the Concept Engine
// All fields map 1-to-1 to the ===CARD=== block format.
// ============================================================

// ── Discriminated union types ────────────────────────────────

/** Structural classification of knowledge captured by the card. */
export type CardType =
  | 'PROCESS'       // step-by-step procedure or algorithm
  | 'CONCEPT'       // definition / abstract idea
  | 'RELATIONSHIP'  // how two or more things relate
  | 'CODE'          // code-level mechanics (data structures, complexity)
  | 'COMPARISON'    // side-by-side contrast of two+ things
  | 'PROOF'         // mathematical / logical argument

/** The interactive visual metaphor used to teach the card. */
export type VisualType =
  | 'SIMULATOR'   // step-through simulation
  | 'SCENARIO'    // branching story / decision tree
  | 'STRUCTURE'   // static structural diagram (trees, graphs)
  | 'TRACER'      // code / algorithm trace step-by-step
  | 'ARENA'       // competitive / adversarial interaction
  | 'BUILDER'     // drag-and-drop / assembly
  | 'DIAGRAM'     // annotated static diagram
  | 'EQUATION'    // formula manipulation
  | 'TIMELINE'    // chronological / ordering
  | 'ARGUMENT'    // claim → evidence → counter
  | 'INTERPRET'   // interpret a graph / output / reading
  | 'ANALOGY'     // map abstract concept onto familiar domain

/** Relative importance on the target exam (1 = low, 5 = critical). */
export type ExamWeight = 1 | 2 | 3 | 4 | 5

/** Number of variations declared in the card (1–8). */
export type VariationCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** The expected form of a learner's answer during Recall. */
export type AnswerType =
  | 'EXACT'         // single unambiguous value or term
  | 'REASONING'     // explanation / multi-step justification
  | 'INTERPRETIVE'  // open-ended interpretation
  | 'SYMBOLIC'      // mathematical / code expression

/** How variations relate to the base card. */
export type VariationType =
  | 'PARAM_CHANGE'    // same concept, different numbers / values
  | 'EDGE_CASE'       // boundary / degenerate condition
  | 'REVERSE'         // work backwards from output to input
  | 'CONTEXT_SHIFT'   // same idea applied in a new domain
  | 'MISCONCEPTION'   // deliberately surfaces a common error

/** High-level subject area for theming and filtering. */
export type SubjectMode =
  | 'CS'        // Computer Science
  | 'MATH'      // Mathematics
  | 'SCIENCE'   // Natural Sciences
  | 'HISTORY'   // History / Social Studies
  | 'LANGUAGE'  // Language / Literature
  | 'BUSINESS'  // Business / Economics
  | 'MEDICINE'  // Medicine / Biology
  | 'LAW'       // Law / Policy
  | 'GENERAL'   // Uncategorised

/** Cognitive load when this card is first encountered (1 = simple, 5 = heavy). */
export type MemoryLoad = 1 | 2 | 3 | 4 | 5

/** Abstraction level of the concept (1 = concrete, 5 = highly abstract). */
export type AbstractionLevel = 1 | 2 | 3 | 4 | 5

/** Which learning goal modes this card is relevant for. */
export type GoalMode =
  | 'EXAM_PREP'
  | 'DEEP_UNDERSTANDING'
  | 'QUICK_REVIEW'
  | 'INTERVIEW_PREP'
  | 'TEACH_BACK'

// ── Phase content ────────────────────────────────────────────

/** A single named step inside a Watch phase sequence. */
export interface WatchStep {
  /** Short display label shown above the step. */
  label: string
  /** Full instructional prose for this step. */
  content: string
}

/** Structured content for the Watch phase (passive introduction). */
export interface WatchPhase {
  /** Introductory narrative / hook sentence. */
  intro: string
  /** Ordered steps that walk through the concept. */
  steps: WatchStep[]
  /** Optional summary shown at the end of Watch. */
  summary?: string
}

/** A single interactive prompt/action inside the Interact phase. */
export interface InteractPrompt {
  /** What the learner is asked to do. */
  instruction: string
  /** Expected outcome or model answer for this prompt. */
  expectedOutcome?: string
  /** Hint shown if the learner is stuck. */
  hint?: string
}

/** Structured content for the Interact phase. */
export interface InteractPhase {
  /** Brief context sentence before the first prompt. */
  setup: string
  /** Ordered sequence of interactive prompts. */
  prompts: InteractPrompt[]
}

/** Structured content for the Recall phase (retrieval practice). */
export interface RecallPhase {
  /** The primary question the learner must answer from memory. */
  question: string
  /** Model answer used by the LLM evaluator. */
  modelAnswer: string
  /** Keywords that must appear in a passing answer. */
  requiredKeywords?: string[]
  /** Common wrong answers the evaluator should flag. */
  commonMistakes?: string[]
}

// ── Variation ────────────────────────────────────────────────

/** One declared variation of the base card. */
export interface CardVariation {
  /** 1-indexed ordinal matching VARIATION 1, VARIATION 2, … */
  index: number
  /** Brief label describing what's different about this variation. */
  label: string
  /** Modified Recall question for this variation. */
  question: string
  /** Model answer for this variation. */
  modelAnswer: string
  /** Which variation pattern this uses. */
  variationType: VariationType
}

// ── Links ────────────────────────────────────────────────────

/** A prerequisite or follow-on card reference. */
export interface ConceptLink {
  /** NAME / slug of the linked card. */
  cardName: string
  /** Nature of the relationship. */
  relation: 'REQUIRES' | 'LEADS_TO' | 'CONTRAST' | 'EXAMPLE_OF'
}

// ── Primary interface ────────────────────────────────────────

export interface ConceptCard {
  // ── Identity
  /** Unique slug derived from the NAME field. */
  id: string
  /** Human-readable card name (matches NAME field verbatim). */
  name: string
  /** Structural type of knowledge. */
  type: CardType

  // ── Visual / Plugin routing
  /** Which visualiser plugin renders this card. */
  visual: VisualType

  // ── Exam metadata
  /** Relative importance on the target exam (1–5). */
  examWeight: ExamWeight
  /** Things the learner absolutely must know. */
  mustKnow: string[]
  /** Questions very likely to appear on the exam. */
  likelyAsked: string[]
  /** Common errors / misconceptions to watch for. */
  tricky: string[]

  // ── Formulas
  /** LaTeX or plain-text formula strings (empty array = none). */
  formulas: string[]

  // ── Variations
  /** Number of variations declared in the card. */
  variationCount: VariationCount
  /** Parsed variation objects (length must equal variationCount). */
  variations: CardVariation[]

  // ── Core content
  /** The essential insight in 1–2 sentences. */
  coreLogic: string

  // ── Phase content
  watch: WatchPhase
  interact: InteractPhase
  recall: RecallPhase

  // ── Context & connections
  /** Real-world application of this concept. */
  realWorld: string
  /** Subject area for theming and filtering. */
  subjectMode: SubjectMode
  /** Abstraction level (1 = concrete, 5 = abstract). */
  abstraction: AbstractionLevel
  /** Expected form of the recall answer. */
  answerType: AnswerType
  /** How variations relate to the base card. */
  variationType: VariationType
  /** Links to prerequisite / follow-on cards. */
  links: ConceptLink[]
  /** Which learning goal modes this card supports. */
  goalModes: GoalMode[]
  /** Cognitive load estimate (1–5). */
  memoryLoad: MemoryLoad

  // ── Runtime metadata (not in raw card text)
  /** ISO timestamp when this card was first imported. */
  createdAt: string
  /** ISO timestamp of the most recent edit. */
  updatedAt: string
  /** Raw ===CARD=== source text, preserved for re-parsing. */
  rawSource?: string
}

// ── Factory ──────────────────────────────────────────────────

/**
 * Returns a fully-typed empty ConceptCard with safe defaults.
 * Use as a starting point when parsing cards to avoid missing-property errors.
 */
export function emptyCard(): ConceptCard {
  const now = new Date().toISOString()
  return {
    id: '',
    name: '',
    type: 'CONCEPT',
    visual: 'DIAGRAM',
    examWeight: 3,
    mustKnow: [],
    likelyAsked: [],
    tricky: [],
    formulas: [],
    variationCount: 1,
    variations: [],
    coreLogic: '',
    watch: {
      intro: '',
      steps: [],
    },
    interact: {
      setup: '',
      prompts: [],
    },
    recall: {
      question: '',
      modelAnswer: '',
    },
    realWorld: '',
    subjectMode: 'GENERAL',
    abstraction: 3,
    answerType: 'REASONING',
    variationType: 'PARAM_CHANGE',
    links: [],
    goalModes: [],
    memoryLoad: 3,
    createdAt: now,
    updatedAt: now,
  }
}
