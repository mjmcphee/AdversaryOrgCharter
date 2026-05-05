# OrgChart Builder

OrgChart Builder is an interactive editor for creating, importing, styling, and exporting organization charts as standalone HTML.

It is designed for:

- Browser-based chart browsing
- Report and document embedding
- PowerPoint workflows (light export)

## Current Features

- Visual node editing from the left panel
- Rich node fields
- Operations are visible on node cards (when enabled)
- Operations are visible in the click panel (when enabled)
- Editable objective catalog (rename, recolor, delete)
- Objective-based filtering
- Theme controls (dark and light)
- Orientation controls (top-down, left-right, middle-out)
- Connector controls:
  - Style (orthogonal or straight)
  - Color
  - Density (compact, default, spacious)
- Font selection
- Background color selection
- Field visibility toggles for node cards
- Reveal-all click panel option for preview/export HTML
- JSON save and load for session resume
- Standalone HTML export
- PPT-friendly light HTML export
- Spreadsheet import (.xlsx, .xls, .csv)
- Google Sheets CSV URL import
- Autosave to browser local storage

## Requirements

- Node.js 18+ (Node.js 20+ recommended)
- npm

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

- <http://localhost:5173>

Build production assets:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Build output directory:

- dist/

## Resume Editing From JSON

Use this workflow to pause and resume editing sessions:

1. Click Save to export your chart as JSON.
2. Later, open the app and click Open.
3. Select your exported JSON file.
4. Continue editing from the restored state.

Notes:

- New JSON exports include session metadata and chart content.
- Older chart-only JSON files are still supported.

## Spreadsheet Import Format

Supported columns are case-insensitive:

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
- PPT export forces light theme for cleaner slide capture or embedding.
- Reveal-all click panel shows all node details in panel view even if card fields are hidden.

## GitHub Push Guide

If this folder is not yet a Git repository, initialize and commit:

```bash
git init
git add .
git commit -m "Initial OrgChart Builder commit"
```

Create an empty repository on GitHub, then connect and push:

```bash
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

If a remote already exists, verify and update as needed:

```bash
git remote -v
git remote set-url origin https://github.com/<your-user>/<your-repo>.git
```

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

1. Retry build and dev:

```bash
npm run build
npm run dev
```
