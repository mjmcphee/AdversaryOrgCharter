/**
 * Reactive store — thin pub/sub wrapper around the chart state.
 * Keeps undo history and notifies subscribers on every mutation.
 */

import { createChart, createNode, getChartObjectives } from './model.js';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'orgchart_autosave';
const MAX_UNDO = 50;

let _chart = null;
let _history = [];
let _historyPos = -1;
let _selectedNodeIds = new Set();
let _filterObjectiveIds = new Set();
const _listeners = new Set();

// ── Bootstrap ─────────────────────────────────────────────────────────────

export function initStore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      _chart = JSON.parse(saved);
      _chart = _normalizeChart(_chart);
    } catch {
      _chart = createChart();
    }
  } else {
    _chart = createChart();
  }
  _pushHistory();
  return _chart;
}

export function getChart() { return _chart; }
export function getSelectedNodeIds() { return _selectedNodeIds; }
export function getFilterObjectiveIds() { return _filterObjectiveIds; }

// ── Subscriptions ─────────────────────────────────────────────────────────

export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify() {
  _autosave();
  _listeners.forEach(fn => fn(_chart, _selectedNodeIds, _filterObjectiveIds));
}

function _autosave() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_chart)); } catch {}
}

// ── History ───────────────────────────────────────────────────────────────

function _pushHistory() {
  // Truncate forward history
  _history = _history.slice(0, _historyPos + 1);
  _history.push(JSON.stringify(_chart));
  if (_history.length > MAX_UNDO) _history.shift();
  _historyPos = _history.length - 1;
}

export function undo() {
  if (_historyPos <= 0) return;
  _historyPos--;
  _chart = JSON.parse(_history[_historyPos]);
  _notify();
}

export function redo() {
  if (_historyPos >= _history.length - 1) return;
  _historyPos++;
  _chart = JSON.parse(_history[_historyPos]);
  _notify();
}

// ── Mutation helpers ──────────────────────────────────────────────────────

function _mutate(fn) {
  fn(_chart);
  _pushHistory();
  _notify();
}

// Chart meta
export function updateMeta(patch) {
  _mutate(c => { c.meta = { ...c.meta, ...patch }; });
}

// Field visibility
export function setFieldVisibility(field, visible) {
  _mutate(c => { c.fieldVisibility[field] = visible; });
}

// Nodes
export function addNode(parentId = null) {
  const siblings = _chart.nodes.filter(n => n.parentId === parentId);
  const order = siblings.length;
  const node = createNode({ parentId, order });
  _mutate(c => { c.nodes.push(node); });
  return node.id;
}

export function updateNode(id, patch) {
  _mutate(c => {
    const idx = c.nodes.findIndex(n => n.id === id);
    if (idx !== -1) c.nodes[idx] = { ...c.nodes[idx], ...patch };
  });
}

export function deleteNode(id) {
  // Also delete all descendants
  const toDelete = new Set();
  const collect = (pid) => {
    toDelete.add(pid);
    _chart.nodes.filter(n => n.parentId === pid).forEach(n => collect(n.id));
  };
  collect(id);
  _mutate(c => {
    c.nodes = c.nodes.filter(n => !toDelete.has(n.id));
  });
  _selectedNodeIds.delete(id);
  _notify();
}

export function moveNode(id, newParentId) {
  if (id === newParentId) return;
  // Prevent cycles
  let cur = newParentId;
  while (cur) {
    if (cur === id) return; // would create cycle
    cur = _chart.nodes.find(n => n.id === cur)?.parentId ?? null;
  }
  const siblings = _chart.nodes.filter(n => n.parentId === newParentId);
  _mutate(c => {
    const idx = c.nodes.findIndex(n => n.id === id);
    if (idx !== -1) {
      c.nodes[idx].parentId = newParentId;
      c.nodes[idx].order = siblings.length;
    }
  });
}

export function reorderNode(id, direction) {
  // direction: 'up' | 'down'
  const node = _chart.nodes.find(n => n.id === id);
  if (!node) return;
  const siblings = _chart.nodes
    .filter(n => n.parentId === node.parentId)
    .sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex(n => n.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;
  _mutate(c => {
    const a = c.nodes.find(n => n.id === siblings[idx].id);
    const b = c.nodes.find(n => n.id === siblings[swapIdx].id);
    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;
  });
}

// Custom Objectives
export function addObjective(label, color = '#58a6ff') {
  const id = uuidv4();
  const bg = hexToRgba(color, 0.25);
  const obj = { id, label, color, bg };
  _mutate(c => {
    if (!Array.isArray(c.meta.objectives)) c.meta.objectives = getChartObjectives(c.meta);
    c.meta.objectives.push(obj);
  });
  return id;
}

export function updateObjective(id, patch) {
  _mutate(c => {
    if (!Array.isArray(c.meta.objectives)) c.meta.objectives = getChartObjectives(c.meta);
    const idx = c.meta.objectives.findIndex(o => o.id === id);
    if (idx !== -1) c.meta.objectives[idx] = { ...c.meta.objectives[idx], ...patch };
  });
}

export function deleteObjective(id) {
  _mutate(c => {
    if (!Array.isArray(c.meta.objectives)) c.meta.objectives = getChartObjectives(c.meta);
    if (c.meta.objectives.length <= 1) return;

    const hadObjective = c.meta.objectives.some(o => o.id === id);
    if (!hadObjective) return;

    c.meta.objectives = c.meta.objectives.filter(o => o.id !== id);
    const fallbackObjectiveId = c.meta.objectives[0]?.id || 'default';
    c.nodes.forEach(n => {
      n.objectives = (n.objectives || []).filter(oid => oid !== id);
      if (!n.objectives.length) n.objectives = [fallbackObjectiveId];
    });

    if (_filterObjectiveIds.has(id)) {
      _filterObjectiveIds.delete(id);
      _applyObjectiveFilter();
    }
  });
}

// Selection / filter
export function toggleNodeSelection(id) {
  if (_selectedNodeIds.has(id)) _selectedNodeIds.delete(id);
  else _selectedNodeIds.add(id);
  _notify();
}

export function clearSelection() {
  _selectedNodeIds = new Set();
  _notify();
}

export function toggleObjectiveFilter(id) {
  if (_filterObjectiveIds.has(id)) _filterObjectiveIds.delete(id);
  else _filterObjectiveIds.add(id);
  // Apply: hide/show nodes based on filter
  _applyObjectiveFilter();
  _notify();
}

function _applyObjectiveFilter() {
  if (_filterObjectiveIds.size === 0) {
    // Show all
    _chart.nodes.forEach(n => { if (n._hiddenByFilter) { n.hidden = false; delete n._hiddenByFilter; } });
    return;
  }
  _chart.nodes.forEach(n => {
    const matches = (n.objectives || []).some(o => _filterObjectiveIds.has(o));
    if (!matches) {
      if (!n.hidden) { n.hidden = true; n._hiddenByFilter = true; }
    } else {
      if (n._hiddenByFilter) { n.hidden = false; delete n._hiddenByFilter; }
    }
  });
}

export function clearObjectiveFilter() {
  _filterObjectiveIds = new Set();
  _applyObjectiveFilter();
  _notify();
}

// Load a full chart (from import)
export function loadChart(chart) {
  _chart = _normalizeChart(chart);
  _selectedNodeIds = new Set();
  _filterObjectiveIds = new Set();
  _pushHistory();
  _notify();
}

// Reset to blank
export function newChart() {
  _chart = createChart();
  _selectedNodeIds = new Set();
  _filterObjectiveIds = new Set();
  _pushHistory();
  _notify();
}

function _normalizeChart(chart) {
  if (!chart || typeof chart !== 'object') return createChart();
  chart.meta = chart.meta || {};
  chart.meta.title = chart.meta.title ?? 'Org Chart';
  chart.meta.subtitle = chart.meta.subtitle ?? '';
  chart.meta.disclaimer = chart.meta.disclaimer ?? '';
  chart.meta.theme = chart.meta.theme ?? 'dark';
  chart.meta.orientation = chart.meta.orientation ?? 'top-down';
  chart.meta.connectorStyle = chart.meta.connectorStyle ?? 'orthogonal';
  chart.meta.connectorDensity = chart.meta.connectorDensity ?? 'default';
  chart.meta.connectorColor = chart.meta.connectorColor ?? '';
  chart.meta.revealAllOnClick = Boolean(chart.meta.revealAllOnClick);
  chart.meta.customObjectives = chart.meta.customObjectives ?? [];
  chart.meta.objectives = getChartObjectives(chart.meta);
  chart.meta.fontFamily = chart.meta.fontFamily ?? 'system';
  chart.fieldVisibility = chart.fieldVisibility || {};
  if (typeof chart.fieldVisibility.objectives !== 'boolean') {
    chart.fieldVisibility.objectives = chart.fieldVisibility.badges ?? true;
  }
  const objectiveIds = new Set((chart.meta.objectives || []).map(o => o.id));
  const fallbackObjectiveId = chart.meta.objectives[0]?.id || 'default';

  chart.nodes = (chart.nodes || []).map(n => {
    const primary = n.tier || 'default';
    const secondary = Array.isArray(n.badges) ? n.badges : [];
    const legacyObjectives = Array.isArray(n.objectives) ? n.objectives : [];
    const merged = [...legacyObjectives, primary, ...secondary].filter(Boolean);
    const deduped = [...new Set(merged)]
      .filter(id => objectiveIds.has(id))
      .slice(0, 2);
    return {
      ...n,
      objectives: deduped.length ? deduped : [fallbackObjectiveId],
    };
  });
  return chart;
}

function hexToRgba(hex, alpha) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return 'rgba(88,166,255,0.25)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
