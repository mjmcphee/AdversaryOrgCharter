/**
 * Renders a chart data object into an HTML string.
 * Supports three orientations:
 *  - top-down
 *  - left-right
 *  - middle-out
 */

import { buildTree, DEFAULT_OBJECTIVES, DEFAULT_FONTS } from './model.js';

export function renderChartHtml(chart, opts = {}) {
  const { standalone = true, selectedNodeIds = null } = opts;
  const meta = {
    title: chart.meta?.title ?? 'Org Chart',
    subtitle: chart.meta?.subtitle ?? '',
    disclaimer: chart.meta?.disclaimer ?? '',
    theme: chart.meta?.theme ?? 'dark',
    orientation: chart.meta?.orientation ?? 'top-down',
    connectorStyle: chart.meta?.connectorStyle ?? 'orthogonal',
    fontFamily: chart.meta?.fontFamily ?? 'system',
    bgColor: chart.meta?.bgColor ?? '',
    connectorColor: chart.meta?.connectorColor ?? '',
  };

  const fontObj = DEFAULT_FONTS.find(f => f.id === meta.fontFamily) || DEFAULT_FONTS[0];
  const fontFamily = fontObj.family;

  const fv = chart.fieldVisibility || {};
  const nodes = chart.nodes || [];
  const allObjectives = [...DEFAULT_OBJECTIVES, ...(chart.meta?.customObjectives || [])];
  const objectiveMap = new Map(allObjectives.map(o => [o.id, o]));
  const roots = buildTree(nodes);

  const isDark = meta.theme !== 'light';

  const css = `
  :root {
    --bg: ${meta.bgColor || (isDark ? '#0d1117' : '#f6f8fa')};
    --surface: ${isDark ? '#161b22' : '#ffffff'};
    --surface2: ${isDark ? '#1c2330' : '#f0f3f7'};
    --border: ${isDark ? '#30363d' : '#d0d7de'};
    --text: ${isDark ? '#e6edf3' : '#1f2328'};
    --text-muted: ${isDark ? '#8b949e' : '#57606a'};
    --connector: ${meta.connectorColor || (isDark ? '#30363d' : '#d0d7de')};
    --yellow: #e3b341;
    --blue: #58a6ff;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: ${fontFamily};
    font-size: 13px;
    min-height: 100vh;
    padding: 20px;
  }

  h1 {
    text-align: center;
    font-size: 1.3rem;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .subtitle {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.75rem;
    margin-bottom: 6px;
  }

  .disclaimer {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.68rem;
    font-style: italic;
    margin-bottom: 18px;
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
  }

  .chart-wrap { overflow: auto; padding-bottom: 20px; }
  .chart-inner { min-width: 900px; padding: 0 10px; }

  .tree { width: 100%; }

  .node {
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 8px 10px;
    min-width: 140px;
    max-width: 220px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    position: relative;
    flex-shrink: 0;
  }
  .node:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
  .node-wide { min-width: 210px; max-width: 280px; }
  .node.dimmed { opacity: 0.35; }
  .node.selected { outline: 2px solid #58a6ff; outline-offset: 2px; }

  .node-label { font-weight: 700; font-size: 0.8rem; line-height: 1.2; margin-bottom: 3px; }
  .node-sub   { font-size: 0.65rem; color: var(--text-muted); line-height: 1.3; margin-bottom: 2px; }
  .node-aliases { font-size: 0.63rem; color: var(--yellow); line-height: 1.3; margin-bottom: 2px; }
  .node-focus { font-size: 0.65rem; font-style: italic; line-height: 1.3; margin-bottom: 2px; }
  .node-dates { font-size: 0.6rem; color: var(--text-muted); margin-bottom: 2px; }
  .node-badge {
    display: inline-block;
    font-size: 0.6rem;
    padding: 1px 5px;
    border-radius: 10px;
    margin-top: 4px;
    margin-right: 3px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  .overlap-note { font-size: 0.58rem; color: #bc8cff; margin-top: 3px; font-style: italic; }

  .td-forest { display: flex; justify-content: center; align-items: flex-start; gap: 22px; }
  .td-subtree { display: flex; flex-direction: column; align-items: center; }
  .td-node-wrap { display: flex; justify-content: center; }
  .td-parent-stem,
  .td-child-stem {
    width: 2px;
    height: 14px;
    background: var(--connector);
    margin: 0 auto;
    flex-shrink: 0;
  }
  .td-children-row {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 0;
    position: relative;
    width: auto;
  }
  .td-child-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: 0 6px;
  }
  .td-children-row.multi > .td-child-col::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 2px;
    background: var(--connector);
  }
  .td-children-row.multi > .td-child-col:first-child::before { left: 50%; }
  .td-children-row.multi > .td-child-col:last-child::before { right: 50%; }
  .td-children-row.multi > .td-child-col:only-child::before { display: none; }
  .connectors-straight .td-children-row.multi::before { display: none; }
  .connectors-straight .td-children-row.multi > .td-child-col::before { display: none; }

  /* Multi-row children support */
  .td-rows-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
  .td-row-sep {
    width: 2px;
    height: 12px;
    background: var(--connector);
    flex-shrink: 0;
  }

  .lr-forest { display: flex; flex-direction: column; gap: 18px; align-items: flex-start; }
  .lr-subtree { display: flex; align-items: center; gap: 0; }
  .lr-subtree.dir-left { flex-direction: row-reverse; }
  .lr-self { display: flex; align-items: center; }
  .lr-branch { display: flex; align-items: center; }
  .lr-branch.dir-right { margin-left: 12px; }
  .lr-branch.dir-left { margin-right: 12px; }
  .lr-parent-link { width: 18px; height: 2px; background: var(--connector); }
  .lr-children-wrap { position: relative; display: flex; flex-direction: column; gap: 10px; }
  .lr-children-wrap.dir-right { padding-left: 12px; }
  .lr-children-wrap.dir-left { padding-right: 12px; }
  .lr-trunk {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--connector);
  }
  .lr-trunk.dir-right { left: 0; }
  .lr-trunk.dir-left { right: 0; }
  .lr-child-row { display: flex; align-items: center; gap: 0; position: relative; }
  .lr-child-row.dir-left { flex-direction: row-reverse; }
  .lr-elbow { width: 12px; height: 2px; background: var(--connector); }
  .lr-child-tree { display: flex; align-items: center; }
  .connectors-orthogonal .lr-trunk { display: none; }
  .connectors-orthogonal .lr-children-wrap { gap: 0; }
  .connectors-orthogonal .lr-child-row { padding: 5px 0; }
  .connectors-orthogonal .lr-child-row::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--connector);
  }
  .connectors-orthogonal .lr-child-row.dir-right::before { left: 0; }
  .connectors-orthogonal .lr-child-row.dir-left::before { right: 0; }
  .connectors-orthogonal .lr-child-row:first-child::before { top: 50%; }
  .connectors-orthogonal .lr-child-row:last-child::before { bottom: 50%; }
  .connectors-orthogonal .lr-child-row:only-child::before { display: none; }
  .connectors-straight .lr-trunk { display: none; }
  .connectors-straight .lr-parent-link { display: none; }
  .connectors-straight .lr-children-wrap { padding-left: 0; padding-right: 0; gap: 12px; }
  .connectors-straight .lr-child-row .lr-elbow { width: 18px; }

  .mo-layout {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 20px;
    align-items: center;
    width: 100%;
  }
  .mo-center { display: flex; justify-content: center; }
  .mo-side {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .mo-side.left { align-items: flex-end; }
  .mo-side.right { align-items: flex-start; }
  .mo-item { display: flex; align-items: center; }
  .mo-item.left { justify-content: flex-end; }
  .mo-item.right { justify-content: flex-start; }
  .mo-root-link { width: 22px; height: 2px; background: var(--connector); }

  #panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 280px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    z-index: 100;
    display: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  #panel h3 { font-size: 0.9rem; margin-bottom: 6px; }
  #panel .p-associations { font-size: 0.7rem; color: var(--yellow); margin-bottom: 6px; }
  #panel .p-focus   { font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.5; }
  #panel .p-ops     { font-size: 0.7rem; color: var(--text); line-height: 1.6; }
  #panel .p-ops span { display: block; padding-left: 8px; }
  #panel .p-ops span::before { content: "▸ "; color: var(--blue); }
  #panel .p-dates   { font-size: 0.68rem; color: var(--text-muted); margin-top: 6px; }
  #panel .p-notes   { font-size: 0.7rem; margin-top: 8px; line-height: 1.5; }
  #panel-close {
    position: absolute;
    top: 8px;
    right: 10px;
    cursor: pointer;
    font-size: 1rem;
    background: none;
    border: none;
    color: var(--text-muted);
  }

  ${generateObjectiveCSS(allObjectives)}
  `;

  const nodeDataJson = JSON.stringify(
    Object.fromEntries(
      nodes.filter(n => !n.hidden).map(n => [
        n.id,
        {
          name: n.name,
          associations: n.aliases,
          focus: n.focus,
          ops: n.ops,
          dates: n.dates,
          notes: n.notes,
        },
      ])
    )
  );

  let body = '';
  if (meta.title) body += `<h1>${esc(meta.title)}</h1>\n`;
  if (meta.subtitle) body += `<p class="subtitle">${esc(meta.subtitle)}</p>\n`;
  if (meta.disclaimer) body += `<p class="disclaimer">${esc(meta.disclaimer)}</p>\n`;

  const usedObjectiveIds = [...new Set(nodes.filter(n => !n.hidden).flatMap(n => n.objectives || []))];
  body += `<div class="legend" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px;">\n`;
  for (const oid of usedObjectiveIds) {
    const objective = objectiveMap.get(oid);
    if (!objective) continue;
    body += `  <div style="display:flex;align-items:center;gap:5px;font-size:0.72rem;color:var(--text-muted);">\n    <div style="width:10px;height:10px;border-radius:2px;background:${objective.color};flex-shrink:0;"></div>\n    ${esc(objective.label)}\n  </div>\n`;
  }
  body += `</div>\n`;

  body += `<div class="chart-wrap"><div class="chart-inner"><div class="tree layout-${meta.orientation} connectors-${meta.connectorStyle}">\n`;
  body += renderOrientation(roots, meta.orientation, meta.connectorStyle, fv, objectiveMap, selectedNodeIds);
  body += `</div></div></div>\n`;

  body += `
<div id="panel">
  <button id="panel-close" onclick="document.getElementById('panel').style.display='none'">✕</button>
  <h3 id="p-name"></h3>
  <div class="p-associations" id="p-associations"></div>
  <div class="p-focus" id="p-focus"></div>
  <div class="p-ops" id="p-ops"></div>
  <div class="p-dates" id="p-dates"></div>
  <div class="p-notes" id="p-notes"></div>
</div>
`;

  const js = buildPanelJS(nodeDataJson, fv);

  if (standalone) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(meta.title)}</title>
<style>${css}</style>
</head>
<body>
${body}
<script>${js}<\/script>
</body>
</html>`;
  }

  return { css, body, js };
}

function renderOrientation(roots, orientation, connectorStyle, fv, objectiveMap, selectedNodeIds) {
  if (orientation === 'left-right') {
    return renderLeftRightForest(roots, connectorStyle, fv, objectiveMap, selectedNodeIds, 'right');
  }
  if (orientation === 'middle-out') {
    return renderMiddleOut(roots, connectorStyle, fv, objectiveMap, selectedNodeIds);
  }
  return renderTopDownForest(roots, connectorStyle, fv, objectiveMap, selectedNodeIds);
}

function renderTopDownForest(roots, connectorStyle, fv, objectiveMap, selectedNodeIds) {
  if (!roots.length) return '';
  if (roots.length === 1) {
    return renderTopDownSubtree(roots[0], connectorStyle, fv, objectiveMap, selectedNodeIds);
  }

  return `<div class="td-forest">${roots
    .map(r => renderTopDownSubtree(r, connectorStyle, fv, objectiveMap, selectedNodeIds))
    .join('')}</div>`;
}

function renderTopDownSubtree(node, connectorStyle, fv, objectiveMap, selectedNodeIds) {
  let html = '<div class="td-subtree">';
  html += `<div class="td-node-wrap">${renderNodeCard(node, fv, objectiveMap, selectedNodeIds)}</div>`;

  const children = node.children || [];
  if (children.length) {
    // Partition children into rows at rowBreakBefore boundaries
    const rows = [];
    let currentRow = [];
    for (const child of children) {
      if (child.rowBreakBefore && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      currentRow.push(child);
    }
    if (currentRow.length) rows.push(currentRow);

    html += '<div class="td-parent-stem"></div>';

    if (rows.length === 1) {
      // Original single-row rendering
      const row = rows[0];
      const multi = row.length > 1;
      html += `<div class="td-children-row${multi ? ' multi' : ''}">`;
      for (const child of row) {
        html += '<div class="td-child-col">';
        html += '<div class="td-child-stem"></div>';
        html += renderTopDownSubtree(child, connectorStyle, fv, objectiveMap, selectedNodeIds);
        html += '</div>';
      }
      html += '</div>';
    } else {
      // Multiple rows
      html += '<div class="td-rows-wrap">';
      for (let ri = 0; ri < rows.length; ri++) {
        if (ri > 0) html += '<div class="td-row-sep"></div>';
        const row = rows[ri];
        const multi = row.length > 1;
        html += `<div class="td-children-row${multi ? ' multi' : ''}">`;
        for (const child of row) {
          html += '<div class="td-child-col">';
          html += '<div class="td-child-stem"></div>';
          html += renderTopDownSubtree(child, connectorStyle, fv, objectiveMap, selectedNodeIds);
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}

function renderLeftRightForest(roots, connectorStyle, fv, objectiveMap, selectedNodeIds, dir) {
  if (!roots.length) return '';
  return `<div class="lr-forest">${roots
    .map(r => renderLeftRightSubtree(r, connectorStyle, fv, objectiveMap, selectedNodeIds, dir))
    .join('')}</div>`;
}

function renderLeftRightSubtree(node, connectorStyle, fv, objectiveMap, selectedNodeIds, dir) {
  const children = node.children || [];

  let html = `<div class="lr-subtree dir-${dir}">`;
  html += `<div class="lr-self">${renderNodeCard(node, fv, objectiveMap, selectedNodeIds)}</div>`;

  if (children.length) {
    html += `<div class="lr-branch dir-${dir}">`;

    if (connectorStyle === 'orthogonal') {
      html += '<div class="lr-parent-link"></div>';
      html += `<div class="lr-children-wrap dir-${dir}">`;
      html += `<div class="lr-trunk dir-${dir}"></div>`;
      for (const child of children) {
        html += `<div class="lr-child-row dir-${dir}">`;
        html += '<div class="lr-elbow"></div>';
        html += `<div class="lr-child-tree">${renderLeftRightSubtree(
          child,
          connectorStyle,
          fv,
          objectiveMap,
          selectedNodeIds,
          dir
        )}</div>`;
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += `<div class="lr-children-wrap dir-${dir}">`;
      for (const child of children) {
        html += `<div class="lr-child-row dir-${dir}">`;
        html += '<div class="lr-elbow"></div>';
        html += `<div class="lr-child-tree">${renderLeftRightSubtree(
          child,
          connectorStyle,
          fv,
          objectiveMap,
          selectedNodeIds,
          dir
        )}</div>`;
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
  }

  html += '</div>';
  return html;
}

function renderMiddleOut(roots, connectorStyle, fv, objectiveMap, selectedNodeIds) {
  if (!roots.length) return '';
  if (roots.length > 1) {
    return renderTopDownForest(roots, connectorStyle, fv, objectiveMap, selectedNodeIds);
  }

  const root = roots[0];
  const children = root.children || [];
  if (!children.length) {
    return renderTopDownForest(roots, connectorStyle, fv, objectiveMap, selectedNodeIds);
  }

  const half = Math.ceil(children.length / 2);
  const left = children.slice(0, half).reverse();
  const right = children.slice(half);

  let html = '<div class="mo-layout">';

  html += '<div class="mo-side left">';
  for (const child of left) {
    html += '<div class="mo-item left">';
    html += renderLeftRightSubtree(child, connectorStyle, fv, objectiveMap, selectedNodeIds, 'left');
    html += '<div class="mo-root-link"></div>';
    html += '</div>';
  }
  html += '</div>';

  html += `<div class="mo-center">${renderNodeCard(root, fv, objectiveMap, selectedNodeIds)}</div>`;

  html += '<div class="mo-side right">';
  for (const child of right) {
    html += '<div class="mo-item right">';
    html += '<div class="mo-root-link"></div>';
    html += renderLeftRightSubtree(child, connectorStyle, fv, objectiveMap, selectedNodeIds, 'right');
    html += '</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

function renderNodeCard(node, fv, objectiveMap, selectedNodeIds) {
  const objectiveIds = (node.objectives || []).filter(id => objectiveMap.has(id));
  const primaryId = objectiveIds[0] || 'default';
  const primary = objectiveMap.get(primaryId) || objectiveMap.get('default');

  const colorStyle = `color:${primary.color};`;
  const borderStyle = `border-color:${primary.color};${node.dashed ? 'border-style:dashed;border-width:2px;' : ''}`;
  const wideClass = node.wide ? ' node-wide' : '';

  const isDimmed = selectedNodeIds && selectedNodeIds.size > 0 && !selectedNodeIds.has(node.id);
  const isSelected = selectedNodeIds && selectedNodeIds.has(node.id);
  const dimClass = isDimmed ? ' dimmed' : '';
  const selClass = isSelected ? ' selected' : '';

  let inner = `<div class="node-label" style="${colorStyle}">${esc(node.name)}</div>\n`;

  if (fv.subheading && node.subheading)
    inner += `<div class="node-sub">${esc(node.subheading)}</div>\n`;
  if (fv.aliases && node.aliases)
    inner += `<div class="node-aliases">${esc(node.aliases)}</div>\n`;
  if (fv.focus && node.focus)
    inner += `<div class="node-focus">${esc(node.focus)}</div>\n`;
  if (fv.dates && node.dates)
    inner += `<div class="node-dates">📅 ${esc(node.dates)}</div>\n`;

  if (fv.objectives) {
    for (const oid of objectiveIds) {
      const obj = objectiveMap.get(oid);
      if (obj) {
        inner += `<span class="node-badge" style="background:${obj.bg};color:${obj.color};">${esc(obj.label.toUpperCase())}</span>\n`;
      }
    }
  }

  if (fv.overlapNote && node.overlapNote)
    inner += `<div class="overlap-note">${esc(node.overlapNote)}</div>\n`;

  return `<div class="node objective-${primary.id}${wideClass}${dimClass}${selClass}" style="${borderStyle}" onclick="showPanel('${node.id}')" oncontextmenu="event.preventDefault();sendEditRequest('${node.id}')">\n${inner}</div>\n`;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateObjectiveCSS(objectives) {
  return objectives.map(o => `
  .objective-${o.id} { border-color: ${o.color}; }
  .objective-${o.id} .node-label { color: ${o.color}; }
  `).join('');
}

function buildPanelJS(nodeDataJson, fv) {
  return `
const _NODES = ${nodeDataJson};
const _FV = ${JSON.stringify(fv)};

function showPanel(id) {
  const n = _NODES[id];
  if (!n) return;
  document.getElementById('p-name').textContent = n.name || '';
  const assocEl = document.getElementById('p-associations');
  assocEl.textContent = n.associations || '';
  assocEl.style.display = (_FV.aliases && n.associations) ? '' : 'none';
  const focusEl = document.getElementById('p-focus');
  focusEl.textContent = n.focus || '';
  focusEl.style.display = (_FV.focus && n.focus) ? '' : 'none';
  const opsEl = document.getElementById('p-ops');
  if (_FV.ops && n.ops && n.ops.length) {
    opsEl.innerHTML = n.ops.map(o => '<span>' + o.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</span>').join('');
    opsEl.style.display = '';
  } else {
    opsEl.style.display = 'none';
  }
  const datesEl = document.getElementById('p-dates');
  datesEl.textContent = n.dates ? '📅 ' + n.dates : '';
  datesEl.style.display = (_FV.dates && n.dates) ? '' : 'none';
  const notesEl = document.getElementById('p-notes');
  notesEl.textContent = n.notes || '';
  notesEl.style.display = n.notes ? '' : 'none';
  document.getElementById('panel').style.display = 'block';
}

document.addEventListener('click', function(e) {
  const panel = document.getElementById('panel');
  if (panel && panel.style.display !== 'none' && !panel.contains(e.target) && !e.target.closest('.node')) {
    panel.style.display = 'none';
  }
});

function sendEditRequest(id) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'editNode', id }, '*');
  }
}
`;
}
