/**
 * Data model for OrgChart Builder
 *
 * A "chart" contains:
 *   - meta: title, subtitle, disclaimer, theme, orientation, connectorStyle, objectives
 *   - fieldVisibility: which node fields are shown globally
 *   - objective catalog: stored in meta.objectives
 *   - nodes: flat list of NodeRecord objects
 *
 * NodeRecord:
 *   id           – uuid
 *   parentId     – uuid | null (root if null)
 *   order        – integer for sibling ordering
 *   name         – string (required)
 *   subheading   – string
 *   aliases      – string (comma-separated)
 *   focus        – string
 *   ops          – string[] (bullet list items)
 *   dates        – string
 *   objectives   – string[] (up to 2 objective ids)
 *   notes        – string (detail panel only)
 *   wide         – boolean (wider card)
 *   dashed       – boolean (dashed border)
 *   overlapNote  – string
 *   hidden       – boolean (exclude from render)
 */

import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_FIELD_VISIBILITY = {
  subheading: true,
  aliases: true,
  focus: true,
  ops: true,
  dates: true,
  objectives: true,
  overlapNote: true,
};

export const DEFAULT_FONTS = [
  { id: 'system', label: 'System Default', family: 'Segoe UI, system-ui, -apple-system, sans-serif' },
  { id: 'georgia', label: 'Georgia (Serif)', family: 'Georgia, serif' },
  { id: 'courier', label: 'Courier (Monospace)', family: '"Courier New", monospace' },
  { id: 'arial', label: 'Arial (Sans)', family: 'Arial, sans-serif' },
  { id: 'tahoma', label: 'Tahoma (Clean)', family: 'Tahoma, sans-serif' },
  { id: 'verdana', label: 'Verdana (Readable)', family: 'Verdana, sans-serif' },
];

// Default objectives (primary categorization for nodes)
export const DEFAULT_OBJECTIVES = [
  { id: 'default',   label: 'Default',          color: '#8b949e', bg: 'rgba(139,148,158,0.25)' },
  { id: 'gov',       label: 'Government',        color: '#f85149', bg: 'rgba(248,81,73,0.25)' },
  { id: 'bureau',    label: 'Bureau',            color: '#f0883e', bg: 'rgba(240,136,62,0.25)' },
  { id: 'primary',   label: 'Primary / Lab',     color: '#e3b341', bg: 'rgba(227,179,65,0.25)' },
  { id: 'espionage', label: 'Espionage',         color: '#58a6ff', bg: 'rgba(88,166,255,0.25)' },
  { id: 'financial', label: 'Financial',         color: '#3fb950', bg: 'rgba(63,185,80,0.25)' },
  { id: 'hybrid',    label: 'Hybrid',            color: '#bc8cff', bg: 'rgba(188,140,255,0.25)' },
  { id: 'destruct',  label: 'Destructive',       color: '#f85149', bg: 'rgba(248,81,73,0.25)' },
  { id: 'itworker',  label: 'IT Worker',         color: '#56d3b2', bg: 'rgba(86,211,178,0.25)' },
  { id: '5th',       label: '5th Bureau',        color: '#ff7eb6', bg: 'rgba(255,126,182,0.25)' },
  { id: 'custom1',   label: 'Custom 1',          color: '#39d353', bg: 'rgba(57,211,83,0.25)' },
  { id: 'custom2',   label: 'Custom 2',          color: '#a5d6ff', bg: 'rgba(165,214,255,0.25)' },
];

// Keep DEFAULT_THEMES as alias for backward compatibility
export const DEFAULT_THEMES = DEFAULT_OBJECTIVES;

export function getChartObjectives(meta = {}) {
  const objectives = Array.isArray(meta.objectives) && meta.objectives.length
    ? meta.objectives
    : [...DEFAULT_OBJECTIVES, ...(meta.customObjectives || [])];

  if (!objectives.length) return DEFAULT_OBJECTIVES.map(o => ({ ...o }));
  return objectives.map(o => ({ ...o }));
}

export function createNode(overrides = {}) {
  return {
    id: uuidv4(),
    parentId: null,
    order: 0,
    name: 'New Node',
    subheading: '',
    aliases: '',
    focus: '',
    ops: [],
    dates: '',
    objectives: ['default'],
    notes: '',
    wide: false,
    dashed: false,
    overlapNote: '',
    hidden: false,
    rowBreakBefore: false, // Start a new row of siblings in top-down layout
    ...overrides,
  };
}

export function createChart(overrides = {}) {
  const rootId = uuidv4();
  return {
    meta: {
      title: 'Org Chart',
      subtitle: '',
      disclaimer: '',
      theme: 'dark', // 'dark' | 'light'
      orientation: 'top-down', // 'top-down' | 'left-right' | 'middle-out'
      connectorStyle: 'orthogonal', // 'orthogonal' | 'straight'
      connectorDensity: 'default', // 'compact' | 'default' | 'spacious'
      objectives: DEFAULT_OBJECTIVES.map(o => ({ ...o })), // Editable objective catalog
      customObjectives: [], // Backward compatibility with older saved charts
      fontFamily: 'system', // Font choice id
      bgColor: '', // Custom canvas background color (overrides theme default)
      connectorColor: '', // Custom link color (overrides theme default)
      revealAllOnClick: false, // Show all node fields in click panel, even hidden ones
    },
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
    nodes: [
      {
        id: rootId,
        parentId: null,
        order: 0,
        name: 'Root Organization',
        subheading: '',
        aliases: '',
        focus: '',
        ops: [],
        dates: '',
        objectives: ['gov'],
        notes: '',
        wide: true,
        dashed: false,
        overlapNote: '',
        hidden: false,
      },
    ],
    ...overrides,
  };
}

/** Build a parent→children map from flat node list */
export function buildTree(nodes) {
  const map = new Map();
  for (const n of nodes) {
    if (!n.hidden) map.set(n.id, { ...n, children: [] });
  }
  const roots = [];
  for (const n of map.values()) {
    if (!n.parentId || !map.has(n.parentId)) {
      roots.push(n);
    } else {
      map.get(n.parentId).children.push(n);
    }
  }
  // sort siblings by order
  const sortChildren = (node) => {
    node.children.sort((a, b) => a.order - b.order);
    node.children.forEach(sortChildren);
  };
  roots.sort((a, b) => a.order - b.order);
  roots.forEach(sortChildren);
  return roots;
}
