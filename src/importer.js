/**
 * Spreadsheet import — supports .xlsx, .xls, .csv, and Google Sheets CSV export.
 *
 * Expected columns (case-insensitive, order-independent):
 *   id           – optional; will be generated if absent
 *   parent_id    – id of parent node (blank = root)
 *   order        – integer for sibling order (default 0)
 *   name         – REQUIRED
 *   subheading
 *   associations – comma-separated
 *   focus
 *   ops          – pipe-separated (|) bullet items
 *   dates
 *   objective    – primary objective id/label
 *   objective_2  – optional secondary objective id/label
 *   objectives   – optional pipe-separated objectives (max 2 used)
 *   tier         – legacy alias for objective
 *   badges       – legacy alias for secondary objectives
 *   notes
 *   wide         – TRUE / FALSE
 *   dashed       – TRUE / FALSE
 *   overlap_note
 *   hidden       – TRUE / FALSE
 */

import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const COL_MAP = {
  id: 'id',
  parent_id: 'parentId',
  parentid: 'parentId',
  order: 'order',
  name: 'name',
  subheading: 'subheading',
  sub: 'subheading',
  associations: 'aliases',
  association: 'aliases',
  aliases: 'aliases',
  alias: 'aliases',
  focus: 'focus',
  ops: 'ops',
  operations: 'ops',
  dates: 'dates',
  date: 'dates',
  objective: 'objective1',
  objective_1: 'objective1',
  objective1: 'objective1',
  primary_objective: 'objective1',
  primary: 'objective1',
  objective_2: 'objective2',
  objective2: 'objective2',
  secondary_objective: 'objective2',
  objectives: 'objectives',
  tier: 'tier',
  theme: 'tier',
  badges: 'badges',
  badge: 'badges',
  notes: 'notes',
  note: 'notes',
  wide: 'wide',
  dashed: 'dashed',
  overlap_note: 'overlapNote',
  overlapnote: 'overlapNote',
  hidden: 'hidden',
};

/**
 * Parse a File object (from <input type="file">) into an array of raw row objects.
 */
export async function parseSpreadsheetFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rowsToNodes(rows);
}

/**
 * Parse a CSV text string.
 */
export function parseCsvText(csvText) {
  const wb = XLSX.read(csvText, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rowsToNodes(rows);
}

function normalizeKey(k) {
  return String(k).toLowerCase().trim().replace(/\s+/g, '_');
}

function boolVal(v) {
  if (typeof v === 'boolean') return v;
  return String(v).trim().toLowerCase() === 'true' || v === '1' || v === 1;
}

function rowsToNodes(rows) {
  if (!rows.length) throw new Error('Spreadsheet appears to be empty.');

  // Remap column headers
  const nodes = [];
  const objectiveLabelsNeeded = new Set();

  for (const row of rows) {
    const node = {
      id: '',
      parentId: null,
      order: 0,
      name: '',
      subheading: '',
      aliases: '',
      focus: '',
      ops: [],
      dates: '',
      objectives: [],
      notes: '',
      wide: false,
      dashed: false,
      overlapNote: '',
      hidden: false,
    };

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const key = normalizeKey(rawKey);
      const field = COL_MAP[key];
      if (!field) continue;
      const val = String(rawVal ?? '').trim();

      switch (field) {
        case 'id':        node.id = val; break;
        case 'parentId':  node.parentId = val || null; break;
        case 'order':     node.order = parseInt(val, 10) || 0; break;
        case 'name':      node.name = val; break;
        case 'subheading': node.subheading = val; break;
        case 'aliases':   node.aliases = val; break;
        case 'focus':     node.focus = val; break;
        case 'ops':
          node.ops = val ? val.split('|').map(s => s.trim()).filter(Boolean) : [];
          break;
        case 'dates':     node.dates = val; break;
        case 'objective1':
          if (val) {
            node.objectives = [val];
            objectiveLabelsNeeded.add(val);
          }
          break;
        case 'objective2':
          if (val) {
            node.objectives.push(val);
            objectiveLabelsNeeded.add(val);
          }
          break;
        case 'objectives':
          if (val) {
            const labels = val.split('|').map(s => s.trim()).filter(Boolean);
            node.objectives = labels.slice(0, 2);
            node.objectives.forEach(l => objectiveLabelsNeeded.add(l));
          }
          break;
        case 'tier':
          if (!node.objectives.length && val) {
            node.objectives = [val];
            objectiveLabelsNeeded.add(val);
          }
          break;
        case 'badges':
          if (val) {
            const labels = val.split('|').map(s => s.trim()).filter(Boolean);
            if (!node.objectives.length) node.objectives = [];
            for (const lbl of labels) {
              if (node.objectives.length >= 2) break;
              node.objectives.push(lbl);
              objectiveLabelsNeeded.add(lbl);
            }
          }
          break;
        case 'notes':     node.notes = val; break;
        case 'wide':      node.wide = boolVal(rawVal); break;
        case 'dashed':    node.dashed = boolVal(rawVal); break;
        case 'overlapNote': node.overlapNote = val; break;
        case 'hidden':    node.hidden = boolVal(rawVal); break;
      }
    }

    if (!node.name) continue; // skip blank rows
    if (!node.id) node.id = uuidv4();
    node.objectives = [...new Set(node.objectives)].slice(0, 2);
    if (!node.objectives.length) node.objectives = ['default'];

    nodes.push(node);
  }

  if (!nodes.length) throw new Error('No valid rows found. Ensure a "name" column is present.');

  // Deduplicate / fix IDs (in case spreadsheet has duplicates)
  const seenIds = new Set();
  for (const n of nodes) {
    if (seenIds.has(n.id)) n.id = uuidv4();
    seenIds.add(n.id);
  }

  // Build auto objective definitions from labels
  const autoObjectives = [];
  const DEFAULT_OBJECTIVE_COLORS = ['#58a6ff','#3fb950','#e3b341','#f0883e','#bc8cff','#56d3b2','#ff7eb6'];
  let colorIdx = 0;
  const objectiveLabelToId = new Map();
  for (const label of objectiveLabelsNeeded) {
    const color = DEFAULT_OBJECTIVE_COLORS[colorIdx % DEFAULT_OBJECTIVE_COLORS.length];
    colorIdx++;
    const id = uuidv4();
    autoObjectives.push({ id, label, color, bg: hexToRgba(color, 0.25) });
    objectiveLabelToId.set(label, id);
  }
  // Convert objective label arrays to ids
  for (const n of nodes) {
    n.objectives = (n.objectives || []).map(label => objectiveLabelToId.get(label) ?? label).filter(Boolean).slice(0, 2);
  }

  return { nodes, objectives: autoObjectives };
}

/**
 * Generate a template spreadsheet (as a Blob) showing all supported columns.
 */
export function generateTemplateBlob() {
  const headers = [
    'id','parent_id','order','name','subheading','associations','focus','ops',
    'dates','objective','objective_2','objectives','notes','wide','dashed','overlap_note','hidden'
  ];
  const example = [
    '','','0','Root Organization','Dept of Example','','Central coordination body','Op Alpha|Op Beta',
    '2020–present','gov','espionage','','Classified notes here','TRUE','FALSE','','FALSE'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'OrgChart');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function hexToRgba(hex, alpha) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return 'rgba(88,166,255,0.25)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
