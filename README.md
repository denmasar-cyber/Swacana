# 🌟 SWACANA — AI-Powered Decision Intelligence

> **Petakan diri, pikiran, dan kehidupanmu dengan AI lokal 100% gratis.**

SWACANA adalah aplikasi web untuk memetakan masalah, menganalisis kausalitas, dan membuat rencana aksi — semuanya berjalan **100% di browser** tanpa API key atau server.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📝 **Catatan & Analisis** | Tulis curhatan, diary, atau tujuan — AI bantu memetakan solusi |
| 🧠 **Decision Tree** | Visualisasi otomatis: Root Cause → Diagnosis → Impact → Mitigation |
| 🔗 **Korelasi Kausal** | Graf hubungan antar catatan berdasarkan konten dan waktu |
| 🤖 **AI Chat** | Chat dengan AI lokal (WebLLM) + fallback Ollama |
| 📊 **RAG Pipeline** | Import dataset HuggingFace → chunk → embed → augmented retrieval |
| 📅 **Tenggat & Reminder** | Tracking deadline mitigasi dengan status done/pending |
| 🎨 **Claymorphism UI** | Desain vintage modern dengan micro-interactions halus |
| 💯 **100% Lokal** | Zero API key, zero cost, data tetap di browser kamu |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **Browser** Chrome 113+ atau Edge 113+ (untuk WebGPU)
- **npm** atau **pnpm**

### Install & Run

```bash
# 1. Clone repository
git clone https://github.com/your-username/swacana.git
cd swacana/self-plan-hub

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Buka browser
open http://localhost:3000
```

### Dengan CLI (opsional)

```bash
# Install CLI globally
npm install -g swacana

# Inisialisasi (download model AI ~1.5GB)
swacana init

# Scan folder untuk indexing
swacana scan ./my-project

# Buka dashboard
swacana dashboard
```

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Next.js 16  │  │   WebLLM    │  │   Dexie.js  │ │
│  │ App Router  │  │  (WebGPU)   │  │ (IndexedDB) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼──────┐  │
│  │            SWACANA Application                 │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │  │
│  │  │ Notes  │ │  AI    │ │  RAG   │ │ Graph  │ │  │
│  │  │ Editor │ │ Chat   │ │Pipeline│ │ Engine │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Ollama Fallback (localhost:11434) - Optional  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + Claymorphism Design System |
| Database | Dexie.js (IndexedDB) — client-side |
| AI Generation | WebLLM (MLC) — browser-side via WebGPU |
| AI Embedding | Transformers.js (Xenova/all-MiniLM-L6-v2) |
| AI Fallback | Ollama / Llama.cpp / LocalAI |
| Graph | React Flow + Dagre layout |
| RAG | HuggingFace Datasets API → Chunk → Embed → Retrieve |

---

## 🎨 Design System

SWACANA menggunakan tema **Claymorphism** dengan palet warna hangat:

```css
/* Dark mode (default) */
--bg: #1a1512;        /* Background utama */
--fg: #e8ddd0;        /* Text utama */
--accent: #d4a373;    /* Aksen utama (warm gold) */
--accent2: #c97b5e;   /* Aksen sekunder (terracotta) */
--surface: #2a221e;   /* Card/panel */
--border: #5a4f44;    /* Border */
```

### Komponen yang Tersedia

- `clay-card` — Card dengan shadow claymorphism
- `clay-btn` / `clay-btn-sm` — Button dengan efek 3D
- `clay-input` — Input dengan inset shadow
- `clay-badge` — Badge/pill indicator
- `glass` — Glassmorphism effect
- `pinboard` / `pinboard-card` — Pinterest-style grid

### Design System Components

```tsx
import Button from '@/design-system/components/Button';
import Badge from '@/design-system/components/Badge';
import { AnimateIn, HoverLift, StaggerGroup } from '@/design-system/components/Motion';

// 7 button variants: primary, secondary, outline, ghost, danger, success, warning
<Button variant="primary" size="md">Simpan</Button>

// Entrance animations
<AnimateIn preset="fadeIn" delay={100}>
  <div>Content</div>
</AnimateIn>

// Hover micro-interactions
<HoverLift scale={1.02} lift={3}>
  <Card>Hover me</Card>
</HoverLift>
```

---

## 📁 Struktur Project

```
self-plan-hub/
├── app/
│   ├── page.tsx              # Homepage (Papan Catatan)
│   ├── note/[id]/page.tsx    # Note workspace
│   ├── error.tsx             # Global error boundary
│   └── globals.css           # Theme tokens & utilities
├── components/features/
│   ├── kiro-network.tsx      # Homepage dashboard
│   ├── note-workspace.tsx    # Note editor + panels
│   ├── note-editor.tsx       # Text editor + AI actions
│   ├── chat-console.tsx      # AI chat interface
│   ├── causal-correlation.tsx # Graph visualization
│   ├── activity-timeline.tsx  # Timeline view
│   ├── ai-search.tsx         # Search with AI ranking
│   ├── sources-panel.tsx     # RAG dataset management
│   ├── studio-panel.tsx      # AI generation studio
│   ├── model-manager.tsx     # AI model management
│   └── command-palette.tsx   # Cmd+K quick actions
├── design-system/
│   ├── components/           # Button, Badge, Motion, etc.
│   ├── hooks/                # use-motion, use-canvas
│   └── tokens/               # Design tokens
├── lib/
│   ├── db.ts                 # Dexie.js schema
│   ├── webllm-client.ts      # WebLLM engine wrapper
│   ├── omni-client.ts        # LLM stream + Ollama fallback
│   ├── embedding-engine.ts   # Transformers.js embedding
│   ├── rag/                  # Chunking, retrieval, HF datasets
│   ├── sync.ts               # WebSocket + BroadcastChannel
│   └── notification-manager.ts # Reminder notifications
├── prisma/schema.prisma      # PostgreSQL schema (v2 backend)
└── cli/                      # CLI tool (swacana command)
```

---

## 🤖 AI Models

### WebLLM (Browser-side, Free)

| Model | Size | Use Case |
|-------|------|----------|
| Llama 3.2 1B | 0.7GB | Fast testing |
| Llama 3.2 3B | 1.8GB | Balanced |
| Phi-3.5 Mini 3.8B | 2.2GB | Best reasoning |
| Gemma 2 2B | 1.5GB | Efficient |

### Embedding

| Model | Size | Dimension |
|-------|------|-----------|
| Xenova/all-MiniLM-L6-v2 | ~90MB | 384 |

### Ollama Fallback (Optional)

Jika kamu punya Ollama running di `localhost:11434`, SWACANA otomatis menggunakannya sebagai fallback.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Aksi |
|----------|------|
| `Cmd/Ctrl + K` | Buka Command Palette |
| `Enter` | Kirim pesan chat |
| `Shift + Enter` | Newline di chat |
| `Esc` | Tutup modal/palette |

---

## 🔧 Development

```bash
# Development server
npm run dev

# Build untuk production
npm run build

# Start production server
npm start

# Lint
npm run lint

# Run tests
npx vitest

# Collaboration server (WebSocket)
npm run dev:all
```

---

## 📄 Lisensi

MIT License — 100% Open Source, 100% Gratis, No API Key Required.

---

> **SWACANA** — Karena setiap orang berhak punya AI pribadi untuk memetakan hidupnya. 🌱
