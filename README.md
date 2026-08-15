# 🌿 Floorish

**Your home, reimagined. Free. Open. In your pocket.**

Floorish is a free, open-source Progressive Web App for mapping your home's
floor plan and viewing it in 3D — built mobile-first, stored entirely on
your device.

## ✨ Current Features (implemented and working)

- 🏠 **2D Floor Plan Editor** — draw and drag rooms per floor, room templates, multi-floor support
- 🧊 **3D Room View** — toggle any floor into an orbitable 3D view (walls, floors, colour) built from your plan data
- 🛋️ **Furniture placement in 3D** — pick furniture from the built-in library and place it inside the 3D room view
- ↩️ **Undo / Redo** — full history across floor plan edits
- 💾 **Local persistence** — everything stored in IndexedDB, works fully offline
- 📤 **Import / Export** — JSON export/import of your whole home data
- 📱 **PWA** — installable, works offline via a generated service worker + manifest
- ✅ **Automated tests + CI** — Vitest unit tests for the stores/data layer, `svelte-check`, and a build gate all run on every push

## 🧩 Built but not yet reachable from the UI

- 📦 **Furniture Inventory (manual entry)** — the data layer (`src/lib/stores/inventory.js`)
  fully supports adding items with name, category (auto-guessed), dimensions,
  material, tags, notes, and colour variants, plus search and import/export.
  There is currently **no screen that opens it** — it's not linked from any
  route or nav item. Treat this as an open decision, not a shipped feature:
  either a dedicated Inventory tab needs building, or this store should be
  folded into the existing furniture-picker flow instead of running in
  parallel with it.

## 🚧 Not built yet (roadmap, not shipped)

- Photo-to-3D furniture scanning ("Magic Inventory")
- AI-assisted layout/redesign suggestions
- AR viewer (WebXR)
- Walkthrough (first-person) mode
- Community furniture catalogue

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit |
| 3D Engine | Three.js |
| Storage | IndexedDB (via `idb`) |
| PWA | `vite-plugin-pwa` (generated service worker + manifest) |
| Testing | Vitest + `fake-indexeddb` |
| Hosting | Vercel / GitHub Pages |

OpenCV.js, MediaPipe, WebLLM, IPFS, and Fabric.js are not current
dependencies — they were aspirational and are not in `package.json`. If any
of these get built, this table will be updated to match, and only once the
code actually uses them.

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/kynaruniverse/floorish.git
cd floorish

# Install
npm install

# Develop
npm run dev

# Type/template check
npm run check

# Test
npm test

# Build
npm run build
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/    # Modal, Toast, Skeleton, EmptyState, BottomNav, FurniturePicker
│   ├── data/           # roomTemplates.js, furnitureLibrary.js (static catalogues)
│   ├── stores/        # homes.js, inventory.js, app.js, db.js (Svelte stores + IndexedDB)
│   ├── ThreeCanvas.svelte   # reusable Three.js scene/camera/renderer wrapper
│   └── Room3D.svelte        # builds a 3D room scene (with furniture) from floor plan data
└── routes/
    ├── +page.svelte             # marketing/landing page
    └── app/
        ├── +page.svelte         # home list / dashboard
        ├── home/[id]/+page.svelte  # floor plan editor (2D + 3D toggle)
        └── settings/+page.svelte

tests/
├── setup.js            # polyfills IndexedDB for the store tests
├── mocks/               # stub for SvelteKit's $app/environment virtual module
├── stores/               # homes.js / inventory.js store tests
└── data/                 # static data sanity checks
```

## 📜 Licence

AGPL v3.

---

Built with only free software, from a phone.
