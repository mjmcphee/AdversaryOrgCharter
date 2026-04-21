/**
 * Editor panel — renders the left-side editing controls.
 * Mounts into #editor-panel.
 */

import {
  getChart, subscribe, updateMeta, setFieldVisibility,
  addNode, updateNode, deleteNode, moveNode, reorderNode,
  addObjective, updateObjective, deleteObjective,
  toggleNodeSelection, toggleObjectiveFilter, clearObjectiveFilter, getFilterObjectiveIds,
  undo, redo, newChart, loadChart, getSelectedNodeIds,
} from './store.js';
import { exportHtml, exportJson, importJson } from './exporter.js';
import { parseSpreadsheetFile, parseCsvText, generateTemplateBlob } from './importer.js';
import { DEFAULT_FONTS, getChartObjectives } from './model.js';

let _activeNodeId = null;

export function mountEditor(container) {
  container.innerHTML = buildEditorHtml();
  bindEditorEvents(container);
  subscribe(() => refreshEditor(container));
  refreshEditor(container);
}

/**
 * Programmatically open the node editor for a given node id.
 * Called when a right-click edit request arrives via postMessage.
 */
export function focusNodeEditor(nodeId) {
  const container = document.getElementById('editor-panel');
  if (!container) return;
  // Switch to Nodes tab
  container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const nodesTab = container.querySelector('[data-tab="nodes"]');
  if (nodesTab) nodesTab.classList.add('active');
  const nodesPanel = container.querySelector('#tab-nodes');
  if (nodesPanel) nodesPanel.classList.add('active');
  // Open editor for the node
  _activeNodeId = nodeId;
  refreshEditor(container);
}

function buildEditorHtml() {
  return `
<div class="editor-inner">

  <div class="toolbar">
    <button id="btn-new" title="New Chart">⬜ New</button>
    <button id="btn-undo" title="Undo (Ctrl+Z)">↩ Undo</button>
    <button id="btn-redo" title="Redo (Ctrl+Y)">↪ Redo</button>
    <span class="sep"></span>
    <button id="btn-import-json" title="Open .json">📂 Open</button>
    <button id="btn-save-json" title="Save as JSON">💾 Save</button>
    <span class="sep"></span>
    <button id="btn-export-html" title="Export HTML">🌐 HTML</button>
    <button id="btn-export-ppt" title="Export light-theme HTML for PPT">📊 PPT</button>
  </div>

  <div class="tabs">
    <button class="tab active" data-tab="formatting">Formatting</button>
    <button class="tab" data-tab="nodes">Nodes</button>
    <button class="tab" data-tab="import">Import</button>
  </div>

  <div class="tab-panel active" id="tab-formatting">
    <label>Title<input id="meta-title" type="text" /></label>
    <label>Subtitle<input id="meta-subtitle" type="text" /></label>
    <label>Disclaimer<textarea id="meta-disclaimer" rows="2"></textarea></label>
    <label>Theme
      <select id="meta-theme">
        <option value="dark">Dark (GitHub style)</option>
        <option value="light">Light (Report / PPT)</option>
      </select>
    </label>
    <label>Orientation
      <select id="meta-orientation">
        <option value="top-down">Top-down</option>
        <option value="left-right">Left-to-right</option>
        <option value="middle-out">Middle-out</option>
      </select>
    </label>
    <label>Connector Style
      <select id="meta-connector-style">
        <option value="orthogonal">Orthogonal</option>
        <option value="straight">Straight</option>
      </select>
    </label>
    <label>Connector Density
      <select id="meta-connector-density">
        <option value="compact">Compact</option>
        <option value="default">Default</option>
        <option value="spacious">Spacious</option>
      </select>
    </label>
    <div class="bg-color-row">
      <label class="bg-color-label">Link Color
        <input type="color" id="meta-connector-color" value="#30363d" />
      </label>
      <button id="btn-reset-connector-color" title="Reset to theme default">↺ Reset</button>
    </div>
    <label>Font
      <select id="meta-font-family"></select>
    </label>
    <div class="bg-color-row">
      <label class="bg-color-label">Background Color
        <input type="color" id="meta-bg-color" value="#0d1117" />
      </label>
      <button id="btn-reset-bg-color" title="Reset to theme default">↺ Reset</button>
    </div>

    <hr />
    <p class="hint">Visible fields on node cards</p>
    <div id="field-toggles"></div>

    <hr />
    <p class="hint">Objectives catalog (all nodes can choose up to 2)</p>
    <button id="btn-add-objective">+ New Objective</button>
    <div id="objective-list"></div>

    <hr />
    <label class="toggle-row">
      <input type="checkbox" id="meta-reveal-all-on-click" />
      Reveal all node details on click in exported HTML
    </label>
    <p class="hint">Applies to the preview/export node detail panel only; node card visibility toggles are unchanged.</p>

    <p class="hint" style="margin-top:6px;">Filter chart by objective</p>
    <div id="objective-filter-bar"></div>
  </div>

  <div class="tab-panel" id="tab-nodes">
    <div class="tree-actions">
      <button id="btn-add-root">+ Root Node</button>
      <button id="btn-add-child" disabled>+ Child</button>
      <button id="btn-delete-node" disabled>🗑 Delete</button>
      <button id="btn-move-up" disabled>↑</button>
      <button id="btn-move-down" disabled>↓</button>
    </div>
    <div id="node-tree-list"></div>
    <div id="node-editor" class="node-editor" style="display:none;"></div>
  </div>

  <div class="tab-panel" id="tab-import">
    <p class="hint">Import nodes from a spreadsheet (.xlsx, .xls, .csv) or Google Sheets CSV export.</p>
    <label class="file-drop" id="import-drop">
      <span>📁 Drop spreadsheet here or click to browse</span>
      <input type="file" id="import-file" accept=".xlsx,.xls,.csv" style="display:none;" />
    </label>
    <p class="hint" style="margin-top:8px;">
      <a href="#" id="download-template">⬇ Download template spreadsheet</a>
    </p>
    <hr />
    <p class="hint">Paste a Google Sheets CSV URL (File → Share → Publish → CSV):</p>
    <div style="display:flex;gap:6px;">
      <input type="url" id="gsheets-url" placeholder="https://docs.google.com/spreadsheets/..." />
      <button id="btn-import-gsheets">Import</button>
    </div>
    <div id="import-status" class="import-status"></div>
  </div>

</div>
`;
}

function refreshEditor(container) {
  const chart = getChart();

  setVal(container, '#meta-title', chart.meta.title);
  setVal(container, '#meta-subtitle', chart.meta.subtitle);
  setVal(container, '#meta-disclaimer', chart.meta.disclaimer);
  setVal(container, '#meta-theme', chart.meta.theme);
  setVal(container, '#meta-orientation', chart.meta.orientation || 'top-down');
  setVal(container, '#meta-connector-style', chart.meta.connectorStyle || 'orthogonal');
  setVal(container, '#meta-connector-density', chart.meta.connectorDensity || 'default');

  // Sync background color picker
  const bgColorInput = container.querySelector('#meta-bg-color');
  if (bgColorInput) {
    const isDark = (chart.meta.theme ?? 'dark') !== 'light';
    bgColorInput.value = chart.meta.bgColor || (isDark ? '#0d1117' : '#f6f8fa');
  }

  const connectorColorInput = container.querySelector('#meta-connector-color');
  if (connectorColorInput) {
    const isDark = (chart.meta.theme ?? 'dark') !== 'light';
    connectorColorInput.value = chart.meta.connectorColor || (isDark ? '#30363d' : '#d0d7de');
  }

  const revealAllOnClick = container.querySelector('#meta-reveal-all-on-click');
  if (revealAllOnClick) revealAllOnClick.checked = Boolean(chart.meta.revealAllOnClick);

  renderFontOptions(container, chart);
  renderFieldToggles(container, chart);
  renderObjectiveList(container, chart);
  renderObjectiveFilterBar(container, chart);
  renderNodeTree(container, chart);

  if (_activeNodeId) {
    const node = chart.nodes.find(n => n.id === _activeNodeId);
    if (node) renderNodeEditor(container, node, chart);
    else { _activeNodeId = null; hideNodeEditor(container); }
  }

  const hasActive = !!_activeNodeId;
  container.querySelector('#btn-add-child').disabled = !hasActive;
  container.querySelector('#btn-delete-node').disabled = !hasActive;
  container.querySelector('#btn-move-up').disabled = !hasActive;
  container.querySelector('#btn-move-down').disabled = !hasActive;
}

const FIELD_LABELS = {
  subheading: 'Sub-heading',
  aliases: 'Associations',
  focus: 'Focus / Description',
  ops: 'Operations (bullets)',
  dates: 'Dates',
  objectives: 'Objectives',
  overlapNote: 'Overlap / Warning Notes',
};

function renderFontOptions(container, chart) {
  const sel = container.querySelector('#meta-font-family');
  if (!sel) return;
  sel.innerHTML = DEFAULT_FONTS.map(f => `<option value="${f.id}">${escHtml(f.label)}</option>`).join('');
  setVal(container, '#meta-font-family', chart.meta.fontFamily || 'system');
}

function renderFieldToggles(container, chart) {
  const el = container.querySelector('#field-toggles');
  el.innerHTML = Object.entries(FIELD_LABELS).map(([field, label]) => `
    <label class="toggle-row">
      <input type="checkbox" data-field="${field}" ${chart.fieldVisibility[field] ? 'checked' : ''} />
      ${label}
    </label>
  `).join('');
  el.querySelectorAll('input[data-field]').forEach(cb => {
    cb.addEventListener('change', () => setFieldVisibility(cb.dataset.field, cb.checked));
  });
}

function getAllObjectives(chart) {
  return getChartObjectives(chart.meta);
}

function renderObjectiveList(container, chart) {
  const el = container.querySelector('#objective-list');
  if (!el) return;
  const objectives = getAllObjectives(chart);
  const canDelete = objectives.length > 1;
  el.innerHTML = objectives.map(obj => `
    <div class="badge-item" data-objective-id="${obj.id}">
      <span class="mini-badge" style="background:${obj.bg};color:${obj.color};">${escHtml(obj.label)}</span>
      <input class="objective-label-input badge-label-input" type="text" value="${escAttr(obj.label)}" data-id="${obj.id}" />
      <input class="objective-color-input badge-color-input" type="color" value="${obj.color}" data-id="${obj.id}" title="Text color" />
      <button class="objective-delete badge-delete" data-id="${obj.id}" title="Delete objective" ${canDelete ? '' : 'disabled'}>✕</button>
    </div>
  `).join('');

  el.querySelectorAll('.objective-label-input').forEach(input => {
    input.addEventListener('change', () => {
      const label = input.value.trim();
      if (!label) {
        input.value = input.defaultValue;
        return;
      }
      updateObjective(input.dataset.id, { label });
    });
  });
  el.querySelectorAll('.objective-color-input').forEach(input => {
    input.addEventListener('change', () => {
      const hex = input.value;
      updateObjective(input.dataset.id, { color: hex, bg: hexToRgba(hex, 0.25) });
    });
  });
  el.querySelectorAll('.objective-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (confirm('Delete this objective from the catalog? Nodes using it will be reassigned.')) {
        deleteObjective(btn.dataset.id);
      }
    });
  });
}

function renderObjectiveFilterBar(container, chart) {
  const el = container.querySelector('#objective-filter-bar');
  if (!el) return;
  const active = getFilterObjectiveIds();
  const allObjectives = getAllObjectives(chart);
  el.innerHTML = allObjectives.map(o => `
    <span class="filter-badge ${active.has(o.id) ? 'filter-active' : ''}"
          data-id="${o.id}"
          style="background:${active.has(o.id) ? o.color : o.bg};color:${active.has(o.id) ? '#fff' : o.color};">
      ${escHtml(o.label)}
    </span>
  `).join('');
  if (active.size > 0) {
    el.innerHTML += `<button id="clear-objective-filter">✕ Clear filter</button>`;
    container.querySelector('#clear-objective-filter')?.addEventListener('click', clearObjectiveFilter);
  }
  el.querySelectorAll('.filter-badge').forEach(span => {
    span.addEventListener('click', () => toggleObjectiveFilter(span.dataset.id));
  });
}

function renderNodeTree(container, chart) {
  const el = container.querySelector('#node-tree-list');
  const roots = flatTreeOrder(chart.nodes);
  el.innerHTML = roots.map(({ node, depth }) => `
    <div class="tree-row ${node.id === _activeNodeId ? 'active' : ''} ${node.hidden ? 'dimmed' : ''}"
         data-id="${node.id}" style="padding-left:${8 + depth * 16}px;">
      <span class="tree-row-icon">${node.children?.length ? '▾' : '·'}</span>
      <span class="tree-row-name">${escHtml(node.name)}</span>
      ${node.hidden ? '<span class="badge-hidden">hidden</span>' : ''}
    </div>
  `).join('');

  el.querySelectorAll('.tree-row').forEach(row => {
    row.addEventListener('click', () => {
      _activeNodeId = row.dataset.id;
      const node = chart.nodes.find(n => n.id === _activeNodeId);
      renderNodeEditor(container, node, chart);
      refreshEditor(container);
    });
  });
}

function flatTreeOrder(nodes) {
  const map = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));
  const roots = [];
  for (const n of map.values()) {
    if (!n.parentId || !map.has(n.parentId)) roots.push(n);
    else map.get(n.parentId).children.push(n);
  }
  const result = [];
  const walk = (node, depth) => {
    result.push({ node, depth });
    (node.children || []).sort((a, b) => a.order - b.order).forEach(c => walk(c, depth + 1));
  };
  roots.sort((a, b) => a.order - b.order).forEach(r => walk(r, 0));
  return result;
}

function renderNodeEditor(container, node, chart) {
  const el = container.querySelector('#node-editor');
  el.style.display = 'block';

  const parentOptions = chart.nodes
    .filter(n => n.id !== node.id)
    .map(n => `<option value="${n.id}" ${n.id === node.parentId ? 'selected' : ''}>${escHtml(n.name)}</option>`)
    .join('');

  const allObjectives = getAllObjectives(chart);
  const selectedObjectives = new Set(node.objectives || []);

  const objectiveChecks = allObjectives.map(o => `
    <label class="badge-check">
      <input type="checkbox" data-objective="${o.id}" ${selectedObjectives.has(o.id) ? 'checked' : ''} />
      <span class="mini-badge" style="background:${o.bg};color:${o.color};">${escHtml(o.label)}</span>
    </label>
  `).join('');

  el.innerHTML = `
    <div class="node-editor-header">
      <strong>Edit Node</strong>
      <button class="btn-close-editor">✕</button>
    </div>
    <label>Name *<input class="ne" id="ne-name" type="text" value="${escAttr(node.name)}" /></label>
    <label>Subheading<input class="ne" id="ne-subheading" type="text" value="${escAttr(node.subheading)}" /></label>
    <label>Associations (comma-sep)<input class="ne" id="ne-aliases" type="text" value="${escAttr(node.aliases)}" /></label>
    <label>Focus / Description<textarea class="ne" id="ne-focus" rows="3">${escHtml(node.focus)}</textarea></label>
    <label>Operations (one per line)<textarea class="ne" id="ne-ops" rows="4">${(node.ops || []).join('\n')}</textarea></label>
    <label>Dates<input class="ne" id="ne-dates" type="text" value="${escAttr(node.dates)}" /></label>
    <label>Parent Node
      <select class="ne" id="ne-parent">
        <option value="">— None (root) —</option>
        ${parentOptions}
      </select>
    </label>
    <label>Overlap / Warning Note<input class="ne" id="ne-overlap" type="text" value="${escAttr(node.overlapNote)}" /></label>
    <label>Detail Panel Notes<textarea class="ne" id="ne-notes" rows="3">${escHtml(node.notes)}</textarea></label>
    <div class="ne-row">
      <label class="inline"><input type="checkbox" id="ne-wide" ${node.wide ? 'checked' : ''} /> Wide card</label>
      <label class="inline"><input type="checkbox" id="ne-dashed" ${node.dashed ? 'checked' : ''} /> Dashed border</label>
      <label class="inline"><input type="checkbox" id="ne-hidden" ${node.hidden ? 'checked' : ''} /> Hidden</label>
    </div>
    ${node.parentId ? `<div class="ne-row">
      <label class="inline"><input type="checkbox" id="ne-row-break" ${node.rowBreakBefore ? 'checked' : ''} /> Start new row (top-down layout)</label>
    </div>` : ''}
    <div class="ne-badges-label">Objectives (choose up to 2)</div>
    <div class="ne-badges">${objectiveChecks}</div>
    <div class="ne-actions">
      <button id="ne-save">✔ Apply</button>
      <button id="ne-select-toggle">☐ Toggle Select</button>
    </div>
  `;

  el.querySelectorAll('input[data-objective]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const checked = [...el.querySelectorAll('input[data-objective]:checked')];
      if (checked.length > 2) {
        checkbox.checked = false;
        alert('Each node can have a maximum of 2 objectives.');
      }
    });
  });

  el.querySelector('#ne-save').addEventListener('click', () => {
    const ops = el.querySelector('#ne-ops').value.split('\n').map(s => s.trim()).filter(Boolean);
    const newParentId = el.querySelector('#ne-parent').value || null;
    const selected = [...el.querySelectorAll('input[data-objective]:checked')].map(i => i.dataset.objective).slice(0, 2);
    const fallbackObjectiveId = allObjectives[0]?.id || 'default';
    updateNode(node.id, {
      name: el.querySelector('#ne-name').value,
      subheading: el.querySelector('#ne-subheading').value,
      aliases: el.querySelector('#ne-aliases').value,
      focus: el.querySelector('#ne-focus').value,
      ops,
      dates: el.querySelector('#ne-dates').value,
      objectives: selected.length ? selected : [fallbackObjectiveId],
      overlapNote: el.querySelector('#ne-overlap').value,
      notes: el.querySelector('#ne-notes').value,
      wide: el.querySelector('#ne-wide').checked,
      dashed: el.querySelector('#ne-dashed').checked,
      hidden: el.querySelector('#ne-hidden').checked,
      rowBreakBefore: el.querySelector('#ne-row-break')?.checked ?? false,
    });
    if (newParentId !== node.parentId) moveNode(node.id, newParentId);
  });

  el.querySelector('#ne-select-toggle').addEventListener('click', () => toggleNodeSelection(node.id));
  el.querySelector('.btn-close-editor').addEventListener('click', () => {
    _activeNodeId = null;
    hideNodeEditor(container);
  });
}

function hideNodeEditor(container) {
  container.querySelector('#node-editor').style.display = 'none';
}

function bindEditorEvents(container) {
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      container.querySelector(`#tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  const bindMeta = (sel, field) => {
    const el = container.querySelector(sel);
    if (!el) return;
    el.addEventListener('input', () => updateMeta({ [field]: el.value }));
  };
  bindMeta('#meta-title', 'title');
  bindMeta('#meta-subtitle', 'subtitle');
  bindMeta('#meta-disclaimer', 'disclaimer');

  container.querySelector('#meta-theme')?.addEventListener('change', e => updateMeta({ theme: e.target.value }));
  container.querySelector('#meta-orientation')?.addEventListener('change', e => updateMeta({ orientation: e.target.value }));
  container.querySelector('#meta-connector-style')?.addEventListener('change', e => updateMeta({ connectorStyle: e.target.value }));
  container.querySelector('#meta-connector-density')?.addEventListener('change', e => updateMeta({ connectorDensity: e.target.value }));
  container.querySelector('#meta-font-family')?.addEventListener('change', e => updateMeta({ fontFamily: e.target.value }));

  container.querySelector('#meta-bg-color')?.addEventListener('input', e => updateMeta({ bgColor: e.target.value }));
  container.querySelector('#btn-reset-bg-color')?.addEventListener('click', () => updateMeta({ bgColor: '' }));
  container.querySelector('#meta-connector-color')?.addEventListener('input', e => updateMeta({ connectorColor: e.target.value }));
  container.querySelector('#btn-reset-connector-color')?.addEventListener('click', () => updateMeta({ connectorColor: '' }));
  container.querySelector('#meta-reveal-all-on-click')?.addEventListener('change', e => updateMeta({ revealAllOnClick: e.target.checked }));

  container.querySelector('#btn-undo')?.addEventListener('click', undo);
  container.querySelector('#btn-redo')?.addEventListener('click', redo);
  container.querySelector('#btn-new')?.addEventListener('click', () => {
    if (confirm('Start a new blank chart? Unsaved changes will be lost.')) newChart();
  });
  container.querySelector('#btn-save-json')?.addEventListener('click', () => exportJson(getChart()));
  container.querySelector('#btn-import-json')?.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.addEventListener('change', async () => {
      if (!inp.files[0]) return;
      const chart = await importJson(inp.files[0]);
      loadChart(chart);
    });
    inp.click();
  });
  container.querySelector('#btn-export-html')?.addEventListener('click', () =>
    exportHtml(getChart(), { filename: 'orgchart.html', selectedNodeIds: getSelectedNodeIds() })
  );
  container.querySelector('#btn-export-ppt')?.addEventListener('click', () =>
    exportHtml(getChart(), { filename: 'orgchart-ppt.html', pptFriendly: true })
  );

  container.querySelector('#btn-add-root')?.addEventListener('click', () => {
    const id = addNode(null);
    _activeNodeId = id;
  });
  container.querySelector('#btn-add-child')?.addEventListener('click', () => {
    if (!_activeNodeId) return;
    const id = addNode(_activeNodeId);
    _activeNodeId = id;
  });
  container.querySelector('#btn-delete-node')?.addEventListener('click', () => {
    if (!_activeNodeId) return;
    if (confirm('Delete this node and all its descendants?')) {
      deleteNode(_activeNodeId);
      _activeNodeId = null;
    }
  });
  container.querySelector('#btn-move-up')?.addEventListener('click', () => {
    if (_activeNodeId) reorderNode(_activeNodeId, 'up');
  });
  container.querySelector('#btn-move-down')?.addEventListener('click', () => {
    if (_activeNodeId) reorderNode(_activeNodeId, 'down');
  });

  container.querySelector('#btn-add-objective')?.addEventListener('click', () => {
    const label = prompt('New objective label:', 'Custom Objective');
    if (label) addObjective(label, '#58a6ff');
  });

  const fileInput = container.querySelector('#import-file');
  container.querySelector('#import-drop')?.addEventListener('click', () => fileInput?.click());
  container.querySelector('#import-drop')?.addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
  container.querySelector('#import-drop')?.addEventListener('dragleave', e => e.currentTarget.classList.remove('dragover'));
  container.querySelector('#import-drop')?.addEventListener('drop', async e => {
    e.preventDefault(); e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) await handleImport(file, container);
  });
  fileInput?.addEventListener('change', async () => {
    if (fileInput.files[0]) await handleImport(fileInput.files[0], container);
  });

  container.querySelector('#download-template')?.addEventListener('click', (e) => {
    e.preventDefault();
    const blob = generateTemplateBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orgchart-template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  container.querySelector('#btn-import-gsheets')?.addEventListener('click', async () => {
    const url = container.querySelector('#gsheets-url')?.value?.trim();
    if (!url) return;
    await handleGSheetsImport(url, container);
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

function mergeObjectives(existing, incoming) {
  const merged = [...(existing || [])];
  const byId = new Map(merged.map(o => [o.id, o]));
  const byLabel = new Map(merged.map(o => [o.label.toLowerCase(), o]));
  const remap = new Map();

  for (const obj of incoming || []) {
    const labelKey = (obj.label || '').toLowerCase();
    if (byId.has(obj.id)) {
      remap.set(obj.id, obj.id);
      continue;
    }
    if (byLabel.has(labelKey)) {
      remap.set(obj.id, byLabel.get(labelKey).id);
      continue;
    }
    merged.push(obj);
    byId.set(obj.id, obj);
    byLabel.set(labelKey, obj);
    remap.set(obj.id, obj.id);
  }

  return { merged, remap };
}

function normalizeNodeObjectives(nodes, remap = new Map()) {
  const chart = getChart();
  const fallbackObjectiveId = getAllObjectives(chart)[0]?.id || 'default';
  return (nodes || []).map(n => {
    const objectives = [...new Set((n.objectives || []).map(id => remap.get(id) || id))].slice(0, 2);
    return { ...n, objectives: objectives.length ? objectives : [fallbackObjectiveId] };
  });
}

async function handleImport(file, container) {
  const statusEl = container.querySelector('#import-status');
  try {
    statusEl.textContent = 'Importing...';
    statusEl.className = 'import-status';
    const { nodes, objectives } = await parseSpreadsheetFile(file);
    const chart = getChart();
    const choice = confirm(
      `Found ${nodes.length} nodes and ${objectives.length} objective definitions.\n\n` +
      `OK = Replace nodes\nCancel = Merge/append nodes`
    );

    const { merged, remap } = mergeObjectives(getAllObjectives(chart), objectives || []);
    const normalizedIncoming = normalizeNodeObjectives(nodes, remap);

    if (choice) {
      loadChart({
        ...chart,
        nodes: normalizedIncoming,
        meta: { ...chart.meta, objectives: merged },
      });
    } else {
      loadChart({
        ...chart,
        nodes: [...chart.nodes, ...normalizedIncoming],
        meta: { ...chart.meta, objectives: merged },
      });
    }

    statusEl.textContent = `✔ Imported ${nodes.length} nodes successfully.`;
    statusEl.className = 'import-status success';
  } catch (err) {
    statusEl.textContent = `✖ Import failed: ${err.message}`;
    statusEl.className = 'import-status error';
  }
}

async function handleGSheetsImport(url, container) {
  const statusEl = container.querySelector('#import-status');
  try {
    statusEl.textContent = 'Fetching...';
    statusEl.className = 'import-status';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const { nodes, objectives } = parseCsvText(text);
    const chart = getChart();
    const { merged, remap } = mergeObjectives(getAllObjectives(chart), objectives || []);
    loadChart({
      ...chart,
      nodes: normalizeNodeObjectives(nodes, remap),
      meta: { ...chart.meta, objectives: merged },
    });
    statusEl.textContent = `✔ Imported ${nodes.length} nodes from Google Sheets.`;
    statusEl.className = 'import-status success';
  } catch (err) {
    statusEl.textContent = `✖ Import failed: ${err.message}`;
    statusEl.className = 'import-status error';
  }
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}
function setVal(container, sel, val) {
  const el = container.querySelector(sel);
  if (el && el.value !== val) el.value = val ?? '';
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
