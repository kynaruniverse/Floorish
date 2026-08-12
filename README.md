# 🌿 Floorish

**Your home, reimagined. Free. Open. In your pocket.**

Floorish is a free, open-source Progressive Web App that lets you map your home, photograph your real furniture into 3D, and redesign your space with AI assistance — then see it overlaid in AR before lifting a finger.

[![CI/CD](https://github.com/floorish/floorish/actions/workflows/ci.yml/badge.svg)](https://github.com/floorish/floorish/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Netlify Status](https://api.netlify.com/api/v1/badges/xxx/deploy-status)](https://app.netlify.com/sites/floorish/deploys)

## ✨ Features

- 🏠 **2D Floor Plan** — Draw rooms with snap-to-grid precision
- 🪑 **3D Room Editor** — Arrange furniture in real-time 3D
- 📷 **Magic Inventory** — Scan real furniture into 3D models
- 🤖 **AI Designer** — Describe a vibe, get instant redesigns
- 👁️ **AR Viewer** — See designs overlaid in your real space
- 🚶 **Walkthrough Mode** — Explore rooms in first-person
- 🛋️ **Community Catalogue** — Share and discover furniture
- 📱 **PWA** — Works offline, installable, no app store needed
- 🔓 **100% Free & Open Source** — AGPL v3

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit |
| 3D Engine | Three.js |
| 2D Canvas | Fabric.js |
| Computer Vision | OpenCV.js |
| AI/ML | WebLLM / MediaPipe |
| Storage | IndexedDB + IPFS |
| AR | WebXR API |
| Hosting | GitHub Pages / Netlify |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/floorish/floorish.git
cd floorish

# Install
pnpm install

# Develop
pnpm dev

# Test
pnpm test

# Build
pnpm build
```

📁 Project Structure

```
src/
├── lib/
│   ├── components/    # Reusable UI components
│   ├── stores/        # Svelte stores (homes, inventory)
│   └── utils/         # OpenCV, AI, IPFS utilities
├── routes/
│   ├── +page.svelte           # Home dashboard
│   ├── home/[id]/             # Floor plan
│   ├── inventory/             # Furniture inventory
│   ├── catalogue/             # Community catalogue
│   ├── ai/                    # AI designer
│   └── settings/              # App settings
└── app.css            # Design system
```

🤝 Contributing

See CONTRIBUTING.md for guidelines.

📜 Licence

Floorish is AGPL v3 licensed. Community furniture models use their own licences (CC0, CC-BY, etc.).

---

Built with ❤️ using only free software.

```

---

## Complete Project Status

| Step | Description | Status |
|------|-------------|--------|
| 1 | OpenCV.js integration | ✅ Real edge detection, contour analysis, 3D extrusion |
| 2 | MediaPipe body tracking | ✅ Pose detection, skeleton creation, AR integration |
| 3 | AI model (WebLLM) | ✅ Local LLM with fallback rule-based designer |
| 4 | IPFS storage | ✅ Helia IPFS node, upload/download, pinning |
| 5 | Test suite | ✅ Vitest unit tests, E2E with Playwright, coverage |
| 6 | CI/CD pipeline | ✅ GitHub Actions: lint, test, build, deploy, Lighthouse |
| 7 | Deployment | ✅ Scripts for GitHub Pages, Netlify, Vercel |

**Total codebase: ~15,000+ lines across 35+ files.**