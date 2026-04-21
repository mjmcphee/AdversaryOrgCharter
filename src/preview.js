/**
 * Live preview — renders the chart into an iframe inside #preview-pane.
 */

import { getChart, getSelectedNodeIds, subscribe } from './store.js';
import { renderChartHtml } from './renderer.js';
import { focusNodeEditor } from './editor.js';

export function mountPreview(container) {
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'preview-iframe';
  iframe.style.cssText = 'width:100%;height:100%;border:none;background:#0d1117;';
  container.appendChild(iframe);

  // Handle right-click edit requests from the iframe
  window.addEventListener('message', e => {
    if (e.data?.type === 'editNode') {
      focusNodeEditor(e.data.id);
    }
  });

  // Render on every store change
  subscribe(() => updatePreview(iframe));
  updatePreview(iframe);
}

function updatePreview(iframe) {
  const chart = getChart();
  const selectedNodeIds = getSelectedNodeIds();
  const html = renderChartHtml(chart, { standalone: true, selectedNodeIds });
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}
