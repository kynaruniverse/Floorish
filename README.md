# 🌿 Floorish

**Your home, reimagined. Free. Open. In your pocket.**

Floorish is a free, open-source Progressive Web App for mapping your home's
floor plan and viewing it in 3D — built mobile-first, stored entirely on
your device.

## ✨ Current Features (implemented and working)

- 🏠 **2D Floor Plan Editor** — draw and drag rooms per floor, room templates, multi-floor support
- 🧊 **3D Room View** — toggle any floor into an orbitable 3D view (walls, floors, colour) built from your plan data
- ↩️ **Undo / Redo** — full history across floor plan edits
- 📦 **Furniture Inventory (manual entry)** — add items with name, category (auto-guessed), dimensions, material, tags
- 💾 **Local persistence** — everything stored in IndexedDB, works fully offline
- 📤 **Import / Export** — JSON export/import of your whole home data
- 📱 **PWA** — installable, mobile-first UI

## 🚧 Not built yet (roadmap, not shipped)

These were previously listed as complete — they are not. Tracking honestly
here so scope stays real:

- Furniture placement inside the 3D view (rooms render; furniture doesn't yet)
- Photo-to-3D furniture scanning ("Magic Inventory")
- AI-assisted layout/redesign suggestions
- AR viewer (WebXR)
- Walkthrough (first-person) mode
- Community furniture catalogue
- Automated test suite / CI beyond install+build

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit |
| 3D Engine | Three.js |
| Storage | IndexedDB (via `idb`) |
| Hosting | Vercel / GitHub Pages |

Fabric.js, OpenCV.js, MediaPipe, WebLLM, and IPFS are not current
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

# Build
npm run build
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/    # Modal, Toast, Skeleton, EmptyState, BottomNav
│   ├── stores/        # homes.js, inventory.js, app.js (Svelte stores + IndexedDB)
│   ├── ThreeCanvas.svelte   # reusable Three.js scene/camera/renderer wrapper
│   └── Room3D.svelte        # builds a 3D room scene from floor plan data
└── routes/
    ├── +page.svelte             # marketing/landing page
    └── app/
        ├── +page.svelte         # home list / dashboard
        ├── home/[id]/+page.svelte  # floor plan editor (2D + 3D toggle)
        └── settings/+page.svelte
```

## 📜 Licence

AGPL v3.

---

Built with only free software, from a phone.
