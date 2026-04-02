import React from 'react'
import type { ConceptCard, VisualType } from '../types/card'
import type { EvalResult, IPluginRegistry, VisualiserPlugin } from '../types/plugin'
import { EMPTY_EVAL_RESULT } from '../types/plugin'

// ─── Placeholder styles ────────────────────────────────────────────────────────
//
// Inline styles keep the placeholder self-contained — no CSS module needed
// while individual plugins are being built.

const PHASE_COLORS: Record<string, string> = {
  watch:    '#3b82f6', // blue-500
  interact: '#8b5cf6', // violet-500
  recall:   '#f59e0b', // amber-500
}

const containerStyle: React.CSSProperties = {
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '12px',
  padding:        '40px 24px',
  minHeight:      '280px',
  borderRadius:   '12px',
  border:         '2px dashed #475569',
  background:     '#0f172a',
  color:          '#94a3b8',
  fontFamily:     'ui-monospace, "Cascadia Code", monospace',
  textAlign:      'center',
}

const badgeStyle = (phase: string): React.CSSProperties => ({
  display:      'inline-block',
  padding:      '2px 10px',
  borderRadius: '9999px',
  fontSize:     '11px',
  fontWeight:   700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background:   PHASE_COLORS[phase] ?? '#64748b',
  color:        '#fff',
})

const titleStyle: React.CSSProperties = {
  fontSize:   '18px',
  fontWeight: 600,
  color:      '#e2e8f0',
  margin:     0,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color:    '#64748b',
  margin:   0,
}

const typeTagStyle: React.CSSProperties = {
  padding:      '4px 12px',
  borderRadius: '6px',
  fontSize:     '12px',
  fontWeight:   500,
  background:   '#1e293b',
  color:        '#7dd3fc',
  border:       '1px solid #334155',
  letterSpacing: '0.05em',
}

// ─── Placeholder component ─────────────────────────────────────────────────────

interface PlaceholderProps {
  card:  ConceptCard
  phase: 'watch' | 'interact' | 'recall'
}

/**
 * A fully working React element rendered for every plugin that has not yet
 * been built.  Shows the card name, VisualType, and active phase so it's
 * instantly clear which plugin is missing.
 */
function PlaceholderView({ card, phase }: PlaceholderProps): React.JSX.Element {
  return React.createElement(
    'div',
    { style: containerStyle },

    // Phase badge
    React.createElement('span', { style: badgeStyle(phase) }, phase),

    // "Plugin not yet built" headline
    React.createElement(
      'p',
      { style: titleStyle },
      'Plugin not yet built',
    ),

    // Card name
    React.createElement(
      'p',
      { style: { ...subtitleStyle, color: '#cbd5e1', fontSize: '15px' } },
      card.name || '(unnamed card)',
    ),

    // VisualType tag
    React.createElement('span', { style: typeTagStyle }, card.visual),

    // Instruction copy
    React.createElement(
      'p',
      { style: subtitleStyle },
      `Implement src/plugins/${card.visual.toLowerCase()}/index.tsx to replace this.`,
    ),
  )
}

// ─── Placeholder plugin ────────────────────────────────────────────────────────

/**
 * Implements VisualiserPlugin for every visual type that has not been built
 * yet.  All phase methods return a real React element so the app never
 * crashes on an unregistered type.
 *
 * evaluate() returns a neutral EvalResult — score 0, no feedback — to
 * prevent the LLM adapter from being called before a real plugin exists.
 */
export const PlaceholderPlugin: VisualiserPlugin = {
  render(card: ConceptCard) {
    return React.createElement(PlaceholderView, { card, phase: 'watch' })
  },

  interact(card: ConceptCard) {
    return React.createElement(PlaceholderView, { card, phase: 'interact' })
  },

  recall(card: ConceptCard) {
    return React.createElement(PlaceholderView, { card, phase: 'recall' })
  },

  async evaluate(_answer: string, _card: ConceptCard): Promise<EvalResult> {
    return {
      ...EMPTY_EVAL_RESULT,
      nextHint: 'This plugin has not been built yet.',
    }
  },
}

// ─── Registry class ────────────────────────────────────────────────────────────

/**
 * Maps VisualType strings to VisualiserPlugin implementations.
 *
 * Usage:
 *   const registry = new PluginRegistry()
 *   registry.register('TRACER', TracerPlugin)
 *   const plugin = registry.get(card.visual)
 *   return plugin.render(card)
 */
export class PluginRegistry implements IPluginRegistry {
  private readonly _map = new Map<VisualType, VisualiserPlugin>()

  /**
   * Register a plugin for the given VisualType.
   * Calling this a second time with the same type overwrites the previous
   * registration — useful for hot-swapping during development.
   */
  register(type: VisualType, plugin: VisualiserPlugin): void {
    this._map.set(type, plugin)
  }

  /**
   * Retrieve the plugin for `type`.
   * Falls back to PlaceholderPlugin if no plugin has been registered,
   * so callers never need to handle undefined.
   */
  get(type: VisualType): VisualiserPlugin {
    return this._map.get(type) ?? PlaceholderPlugin
  }

  /** Returns true when a real (non-placeholder) plugin is registered. */
  has(type: VisualType): boolean {
    return this._map.has(type)
  }

  /** Returns every VisualType that has been explicitly registered. */
  getRegistered(): VisualType[] {
    return [...this._map.keys()]
  }
}

// ─── Default registry singleton ───────────────────────────────────────────────

/**
 * Application-wide singleton.  All 12 VisualType values are pre-seeded with
 * PlaceholderPlugin so `getPlugin(type)` always returns a working component.
 *
 * Replace individual entries as real plugins are built:
 *   import { DEFAULT_REGISTRY } from '../engine/pluginRegistry'
 *   import { TracerPlugin }     from '../plugins/tracer'
 *   DEFAULT_REGISTRY.register('TRACER', TracerPlugin)
 */
export const DEFAULT_REGISTRY = new PluginRegistry()

const ALL_VISUAL_TYPES: VisualType[] = [
  'SIMULATOR',
  'SCENARIO',
  'STRUCTURE',
  'TRACER',
  'ARENA',
  'BUILDER',
  'DIAGRAM',
  'EQUATION',
  'TIMELINE',
  'ARGUMENT',
  'INTERPRET',
  'ANALOGY',
]

for (const vt of ALL_VISUAL_TYPES) {
  DEFAULT_REGISTRY.register(vt, PlaceholderPlugin)
}

// ─── Convenience export ────────────────────────────────────────────────────────

/**
 * Shorthand for `DEFAULT_REGISTRY.get(type)`.
 *
 * Use this in components that just want the plugin without caring about the
 * registry instance:
 *
 *   const plugin = getPlugin(card.visual)
 *   return plugin.render(card)
 */
export function getPlugin(type: VisualType): VisualiserPlugin {
  return DEFAULT_REGISTRY.get(type)
}
