import { initStore } from './store.js';
import { mountEditor } from './editor.js';
import { mountPreview } from './preview.js';

// Boot
initStore();
mountEditor(document.getElementById('editor-panel'));
mountPreview(document.getElementById('preview-pane'));
