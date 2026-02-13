# CLAUDE.md

## Project Overview

**URL Memo** is a Progressive Web App (PWA) for saving and managing URLs as memos. It integrates with Android's Share Intent system via the Web Share Target API, allowing users to share URLs from any app directly into this memo app. All data is stored client-side in `localStorage` with full offline support via a Service Worker.

- **Language**: Japanese (UI strings, ARIA labels, comments)
- **Stack**: Vanilla HTML/CSS/JavaScript — zero external dependencies
- **Build system**: None — static files served directly
- **Deployment**: GitHub Pages (static hosting)

## File Structure

```
URL-sharing-support-PWA/
├── index.html          # Single-page HTML (views toggled via JS)
├── app.js              # All application logic (IIFE, strict mode)
├── style.css           # Full styling with CSS custom properties
├── sw.js               # Service Worker (cache-first with share target support)
├── manifest.json       # PWA manifest with share_target configuration
├── .nojekyll           # Disables Jekyll on GitHub Pages
└── icons/
    ├── icon-192.png    # PWA icon 192x192
    └── icon-512.png    # PWA icon 512x512
```

## Architecture

### Single-Page App with Two Views

The app uses a simple view-switching pattern (CSS class `hidden` toggled via JS):

1. **List View** (`#list-view`): Shows all memos sorted by `updatedAt` descending, with swipe-to-delete and a FAB for new memos
2. **Edit View** (`#edit-view`): Textarea editor with copy, share, save, and cancel actions

### Data Model

Memos are stored as a JSON array in `localStorage` under key `url_memo_data`:

```js
{
  id: string,        // crypto.randomUUID() or Date.now()-based fallback
  text: string,      // Memo content
  createdAt: number,  // Unix timestamp (ms)
  updatedAt: number   // Unix timestamp (ms)
}
```

### Service Worker (`sw.js`)

- **Cache name**: `url-memo-v{APP_VERSION}` (e.g., `url-memo-v1.4.0`)
- **Install**: Pre-caches all static assets
- **Activate**: Deletes old cache versions
- **Fetch strategy**: Cache-first, with network fallback that updates cache
- **Share Target**: Requests with `title`/`text`/`url` query params serve `index.html` from cache so the app can parse them

### Share Target Flow

1. Android sends GET request with `?title=...&text=...&url=...`
2. Service Worker intercepts and serves cached `index.html`
3. `handleShareTarget()` in `app.js` reads `URLSearchParams`, builds memo text, opens edit view
4. URL params are cleaned via `history.replaceState()`

## Code Conventions

### JavaScript

- **Module pattern**: Entire `app.js` is wrapped in an IIFE `(function() { 'use strict'; ... })()`
- **No frameworks or modules**: Plain DOM manipulation, `addEventListener` for all interactions
- **DOM references**: Cached at top of IIFE scope (e.g., `const memoListEl = document.getElementById(...)`)
- **State**: Closure variables (`currentMemoId`, `deleteTargetId`, `toastTimer`)
- **Constants**: `UPPERCASE_SNAKE` (e.g., `STORAGE_KEY`, `CACHE_NAME`)
- **Functions**: `camelCase` (e.g., `loadMemos`, `renderList`, `showToast`)
- **Error handling**: Try-catch around `localStorage` operations, toast messages for user feedback
- **API fallbacks**: Clipboard API falls back to `document.execCommand('copy')`, `crypto.randomUUID()` falls back to timestamp+random

### CSS

- **Custom properties** defined on `:root`: `--primary`, `--danger`, `--bg`, `--surface`, `--text`, `--text-secondary`, `--border`, `--shadow`, `--shadow-lg`, `--radius`
- **Class naming**: BEM-like (e.g., `.memo-item`, `.memo-item-content`, `.memo-item-preview`)
- **Button variants**: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.action-btn`
- **Theme colors**: Google Material-inspired (`#1a73e8` primary blue, `#d93025` danger red)
- **System font stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Mobile-first**: Touch-optimized with `touch-action: pan-y`, `-webkit-tap-highlight-color: transparent`

### HTML

- **Semantic**: Proper `<header>`, `<button>` elements with `aria-label` attributes
- **Japanese UI text**: All user-facing strings are in Japanese
- **View pattern**: Each view is a `<div class="view">` toggled with `.hidden`

## Development Workflow

### Local Development

No build step required. Open `index.html` in a browser. For full PWA features (Service Worker, Share Target), serve via HTTPS or `localhost`:

```bash
# Python
python3 -m http.server 8000

# Node.js (npx)
npx serve .
```

### Making Changes

1. Edit static files directly (`app.js`, `style.css`, `index.html`)
2. If adding/removing cached assets, update the `ASSETS` array in `sw.js`
3. When deploying asset changes, bump version in **both** files to the same value:
   - `APP_VERSION` in `app.js` (設定画面に表示されるバージョン)
   - `CACHE_NAME` in `sw.js` (`url-memo-v{VERSION}` の形式、例: `url-memo-v1.5.0`)
4. Test in browser — Service Worker may need manual unregister/reload during dev

### Deployment

Push to the GitHub Pages branch. The `.nojekyll` file ensures GitHub Pages serves files without Jekyll processing.

### Testing

Manual browser testing only (no test framework):

- Create, edit, and delete memos
- Swipe-to-delete on touch devices
- Copy and share functionality
- Offline mode (DevTools > Network > Offline)
- Share Target (requires Android device/emulator with installed PWA)

## Key Implementation Details

- **Toast notifications**: Auto-dismiss after 2 seconds, uses CSS opacity transition
- **Swipe gesture**: `touchstart`/`touchmove`/`touchend` with 60px threshold to trigger delete dialog
- **List rendering**: Full re-render on every change (`innerHTML = ''` then rebuild)
- **Preview text**: Truncated to 50 characters with `...` suffix
- **Date format**: `YYYY/MM/DD HH:mm` (Japanese style)
- **Delete flow**: Always goes through confirmation dialog (both button click and swipe)

## Important Notes for AI Assistants

- This is a **zero-dependency, no-build project**. Do not introduce `package.json`, bundlers, or frameworks.
- All UI strings are in **Japanese**. Maintain this convention for any new user-facing text.
- バージョン更新時は `app.js` の `APP_VERSION` と `sw.js` の `CACHE_NAME` を必ず同時に同じバージョン番号で更新すること。`CACHE_NAME` は `url-memo-v{VERSION}` の形式。
- The `ASSETS` array in `sw.js` must stay in sync with actual files in the project.
- The `manifest.json` `share_target` configuration is critical for the app's core functionality — changes here affect how the app receives shared URLs on Android.
- Use `./` relative paths (not `/`) for GitHub Pages compatibility.
