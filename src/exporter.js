/**
 * Export the current chart as a standalone HTML file.
 * Also provides a PowerPoint-friendly "clean" version with white background
 * and no fixed panels — just the chart.
 */

import { renderChartHtml } from './renderer.js';

/**
 * Download a standalone HTML file.
 * @param {Object} chart
 * @param {Object} opts  - { filename, pptFriendly, selectedNodeIds }
 */
export function exportHtml(chart, opts = {}) {
  const {
    filename = 'orgchart.html',
    pptFriendly = false,
    selectedNodeIds = null,
  } = opts;

  let exportChart = chart;

  if (pptFriendly) {
    // Override theme to light and strip panel for clean embedding
    exportChart = {
      ...chart,
      meta: { ...chart.meta, theme: 'light' },
    };
  }

  const html = renderChartHtml(exportChart, { standalone: true, selectedNodeIds });
  triggerDownload(html, filename, 'text/html');
}

/**
 * Copy the chart HTML to clipboard (for pasting into emails / reports).
 */
export async function copyHtmlToClipboard(chart, opts = {}) {
  const html = renderChartHtml(chart, { standalone: false, ...opts });
  const fullHtml = typeof html === 'string' ? html : `<style>${html.css}</style>${html.body}`;
  await navigator.clipboard.writeText(fullHtml);
}

/**
 * Export as JSON (for save/reload).
 */
export function exportJson(chart, filename = 'orgchart.json') {
  const json = JSON.stringify(chart, null, 2);
  triggerDownload(json, filename, 'application/json');
}

/**
 * Import from a JSON file.
 */
export async function importJson(file) {
  const text = await file.text();
  return JSON.parse(text);
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
