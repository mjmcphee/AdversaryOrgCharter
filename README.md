# OrgChart Builder

OrgChart Builder is an interactive editor for creating, importing, styling, and exporting organization charts as standalone HTML.

It is designed for:

- browser-based chart browsing
- report/document embedding
- PowerPoint workflows (light export)

## Current Feature Set

- Visual node editing from the left panel
- Rich node fields:
  - name (required)
  - subheading
  - associations
  - focus/description
  - operations (bulleted items)
  - dates
  - overlap/warning note
  - detail panel notes
  - wide card
  - dashed border
  - hidden node
- Operations visibility:
  - shown on node cards when enabled
  - shown in click panel when enabled (or when reveal-all mode is enabled)
- Objective catalog management:
  - all objectives are editable (label and color)
  - objectives can be deleted (with safe fallback reassignment)
  - each node can have up to 2 objectives
  - objective-based filtering
- Display and layout controls:
  - theme (dark/light)
  - orientation (top-down, left-right, middle-out)
  - connector style (orthogonal/straight)
  - connector color
  - connector density (compact/default/spacious)
  - font selection
  - custom background color
- Field visibility toggles for node cards
- Export behavior controls:
  - reveal-all click panel option for exported/preview HTML
- Import/export:
  - JSON save/load
  - standalone HTML export
  - PPT-friendly light HTML export
  - spreadsheet import (.xlsx, .xls, .csv)
  - Google Sheets CSV URL import
- Autosave to local storage

## Requirements

- Node.js 18+ (20+ recommended)
- npm

## Local Development

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Open:

- <http://localhost:5173>

Build production bundle:

```bash
npm run build
```

Preview production bundle:

```bash
npm run preview
```

Build output:

- dist/

## Import Format (Spreadsheet)

Supported columns are case-insensitive.

- id (optional)
- parent_id (optional for root)
- order
- name (required)
- subheading
- associations (aliases also supported)
- focus
- ops (pipe-separated, for example A|B|C)
- dates
- objective
- objective_2
- objectives (pipe-separated)
- tier (legacy alias)
- badges (legacy alias)
- notes
- wide (TRUE/FALSE)
- dashed (TRUE/FALSE)
- overlap_note
- hidden (TRUE/FALSE)

Example ops value:

- Operation Alpha|Operation Beta|Operation Gamma

Use the template download link in the Import tab for a starter file.

## Google Sheets Import

1. Publish a sheet as CSV from Google Sheets.
2. Copy the CSV URL.
3. Paste it into the Import tab and import.

## Export Notes

- HTML export produces a standalone, shareable HTML file.
- PPT export forces light theme for cleaner slide capture/embedding.
- Reveal-all click panel option shows all node details in panel view even if card fields are hidden.

## Troubleshooting

If local startup fails:

1. Check Node version:

```bash
node -v
```

1. Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

1. Retry build/dev:

```bash
npm run build
npm run dev
```
