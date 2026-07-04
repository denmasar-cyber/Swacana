# 📐 SWACANA — Schema Arsitektur CLI + Local AI Agent

> **Versi:** 1.0.0  
> **Stack:** Node.js + TypeScript + Transformers.js + Ollama  
> **Lisensi:** Open Source (100% Gratis, No API Key)  
> **Platform:** Windows / macOS / Linux  

---

## 1. 🧠 Visi & Filosofi

SWACANA adalah **Personal AI Desk** yang berjalan 100% lokal di laptop Anda.  
Tujuan: Memberi Anda **asisten AI pribadi** yang:

- 🔍 Bisa mengakses & mempelajari **semua file di laptop**
- 🌐 Bisa membaca data dari **Chrome/browser**
- 🧠 Otomatis **mencatat, merencanakan, dan mengorganisir** informasi
- 💾 **100% gratis** — tidak perlu API key, tidak perlu cloud, tidak perlu bayar
- 🪄 Bisa diinstal dengan **satu baris perintah** di terminal

---

## 2. 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                      USER TERMINAL                           │
│  $ npx swacana init   │   $ swacana watch   │   $ swacana   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    CLI LAYER (commander)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ init     │  │ watch    │  │ scan     │  │ agent      │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    AGENT ENGINE                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Self-Driven Agent Loop                           │       │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │       │
│  │  │ Planner  │  │ Executor │  │ Memory (RAG)   │ │       │
│  │  └──────────┘  └──────────┘  └────────────────┘ │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    AI MODULES                                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  LLM Engine       │  │  Embedding Engine │                 │
│  │  (Transformers.js │  │  (Transformers.js │                 │
│  │   / Ollama)       │  │   / Xeno.js)      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                           │
│  ┌────────▼──────────────────────▼─────────┐                 │
│  │  Model Cache (~/.swacana/models/)        │                 │
│  └──────────────────────────────────────────┘                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    INTEGRATION MODULES                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ File System   │  │ Browser       │  │ Local Storage    │  │
│  │ (chokidar)    │  │ (Playwright)  │  │ (better-sqlite3) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    STORAGE LAYER                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ SQLite DB   │  │ Vector DB  │  │ File Index (.json)   │  │
│  │ (struktur)  │  │ (vektor)   │  │ (metadata file)      │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│  Location: ~/.swacana/data/                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 📦 Struktur Folder CLI

```
swacana-cli/
├── package.json              # Package definition + bin entry
├── tsconfig.json             # TypeScript config
├── README.md                 # Quick start guide
├── src/
│   ├── index.ts              # 🚀 Entry point (CLI commands)
│   ├── commands/
│   │   ├── init.ts           # Initialize swacana
│   │   ├── watch.ts          # Watch directories
│   │   ├── scan.ts           # Scan files/dirs
│   │   └── agent.ts          # Run agent loop
│   ├── ai/
│   │   ├── engine.ts         # LLM inference (Transformers.js + Ollama)
│   │   ├── embedding.ts      # Text embeddings (Transformers.js)
│   │   └── prompts.ts        # System prompt templates
│   ├── fs/
│   │   ├── watcher.ts        # File system watcher (chokidar)
│   │   └── scanner.ts        # File scanner & indexer
│   ├── browser/
│   │   └── index.ts          # Chrome/browser automation (Playwright)
│   ├── storage/
│   │   ├── db.ts             # SQLite database layer
│   │   └── vector.ts         # Vector storage & search
│   └── agent/
│       └── index.ts          # Self-driven agent loop
├── setup.sh                  # Unix install script
└── setup.ps1                 # Windows install script
```

---

## 4. 🗄️ Database Schema (SQLite)

### Table: `notes`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT | Judul catatan |
| `content` | TEXT | Konten (markdown) |
| `source_type` | TEXT | `manual`, `file`, `browser`, `auto` |
| `source_path` | TEXT | Path file asal (jika dari file) |
| `tags` | TEXT | JSON array tag |
| `created_at` | TEXT ISO | Waktu dibuat |
| `updated_at` | TEXT ISO | Waktu diupdate |

### Table: `files`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT PK | UUID |
| `path` | TEXT | Full path file |
| `filename` | TEXT | Nama file |
| `extension` | TEXT | Ekstensi (`.ts`, `.md`, dll) |
| `size_bytes` | INTEGER | Ukuran file |
| `mtime` | TEXT ISO | Last modified time |
| `content_hash` | TEXT | SHA256 hash konten |
| `summary` | TEXT | Ringkasan AI (jika sudah diproses) |
| `indexed_at` | TEXT ISO | Waktu diindex |

### Table: `chunks`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT PK | UUID |
| `file_id` | TEXT FK | Foreign key ke files |
| `note_id` | TEXT FK | Foreign key ke notes |
| `text` | TEXT | Teks chunk |
| `token_count` | INTEGER | Estimasi token |

### Table: `embeddings`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT PK | UUID |
| `chunk_id` | TEXT FK | Foreign key ke chunks |
| `note_id` | TEXT FK | Foreign key ke notes |
| `vector` | BLOB | Float32Array (384 dim) |
| `model` | TEXT | Model ID embedding |

### Table: `browser_data`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT | Judul halaman |
| `url` | TEXT | URL |
| `content` | TEXT | Konten halaman |
| `summary` | TEXT | Ringkasan AI |
| `captured_at` | TEXT ISO | Waktu capture |

### Table: `agent_memory`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT PK | UUID |
| `type` | TEXT | `insight`, `plan`, `task`, `idea` |
| `content` | TEXT | Konten memori |
| `context` | TEXT | Konteks (file path, URL, dll) |
| `created_at` | TEXT ISO | Waktu dibuat |
| `is_actioned` | INTEGER | 0/1 sudah ditindaklanjuti |

---

## 5. 🤖 AI Engine Architecture

### 5.1 LLM Inference (Text Generation)

**Primary:** `@xenova/transformers` (100% local, zero API calls)
**Fallback:** Ollama (jika user install, lebih powerful)

```typescript
// Pipeline pemilihan model:
// 1. Cek: Apakah Ollama tersedia di localhost:11434?
//    YA → Gunakan Ollama (model: qwen3:1.8b atau llama3.2:3b)
//    TIDAK → Gunakan Transformers.js (model: Xenova/LaMini-Flan-T5-783M)
//
// 2. Model Transformer.js di-cache di ~/.swacana/models/
//    Download sekali, reuse selamanya (offline)
```

**Model yang digunakan:**

| Model | Ukuran | Kapan Dipakai |
|-------|--------|---------------|
| `Xenova/LaMini-Flan-T5-783M` | ~1.5GB | Default (no Ollama) |
| `Xenova/all-MiniLM-L6-v2` | ~90MB | Embedding (wajib) |
| `qwen3:1.8b` (via Ollama) | ~1.1GB | Jika Ollama terinstall |
| `llama3.2:3b` (via Ollama) | ~2.0GB | Jika mau lebih cerdas |

### 5.2 Embedding Pipeline

```
File/Document → chunk → Transformers.js → vector[384] → SQLite
                                                          ↓
Query → Transformers.js → vector[384] → cosine similarity → top-K results
```

### 5.3 Agent Loop

```
┌──────────────────────────────┐
│         WAIT / IDLE           │
│  (file watcher / scheduler)   │
└──────────┬───────────────────┘
           │ Event: file change / timer / manual trigger
           ▼
┌──────────────────────────────┐
│     1. SENSE (Persepsi)       │
│   - Baca file baru/diubah     │
│   - Capture browser tab       │
│   - Baca clipboard            │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│     2. THINK (Analisis)       │
│   - Ringkas konten            │
│   - Ekstrak insight           │
│   - Identifikasi pola         │
│   - Hubungkan dengan memori   │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│     3. ACT (Aksi)             │
│   - Buat catatan baru         │
│   - Update rencana            │
│   - Suggest task              │
│   - Simpan ke memori          │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│     4. STORE (Simpan)         │
│   - Vector ke SQLite          │
│   - Note ke SQLite            │
│   - Update index              │
└──────────┬───────────────────┘
           │ Loop kembali ke IDLE
           ▼
```

---

## 6. 💻 CLI Commands

### 6.1 `swacana init`

Inisialisasi pertama:

```
$ swacana init
╭─────────────────────────────────╮
│  🔧 SWACANA — Personal AI Desk │
│  ═══════════════════════════════ │
│  📦 Menginstall dependencies... │
│  📥 Download model AI (1.5GB)...│
│  📁 Membuat folder ~/.swacana/  │
│  🗄️ Inisialisasi database...    │
│                                 │
│  ✅ Siap! Jalankan 'swacana'    │
╰─────────────────────────────────╯
```

### 6.2 `swacana watch [dir]]

Mengawasi direktori untuk perubahan:

```
$ swacana watch ./projects
👀 Mengawasi: C:\Users\name\projects
   [14:32] 📄 index.ts diubah → meringkas...
   [14:32] 💡 Insight: "Menggunakan pattern observer"
   [14:32] 📝 Catatan otomatis dibuat
```

### 6.3 `swacana scan [dir]`

Memindai direktori & mengindex semua file:

```
$ swacana scan ./documents
🔍 Memindai: C:\Users\name\documents
   ✅ 42 file ditemukan
   📊 18 file teks → diproses
   🧠 156 chunk → di-embedding
   💡 7 insight baru
```

### 6.4 `swacana agent [mode]`

Menjalankan agent dalam mode tertentu:

| Mode | Fungsi |
|------|--------|
| `daemon` | Berjalan di background, auto-learn |
| `once` | Satu siklus sense→think→act |
| `chat` | Mode interaktif (tanya jawab) |

### 6.5 `swacana browser`

Mengakses browser untuk capture data:

```
$ swacana browser
🌐 Chrome terdeteksi!
   [Tab aktif] "Cara membuat AI Agent" → diringkas...
   ✅ Disimpan ke notes
```

---

## 7. 🔌 Integration Layer

### 7.1 File System Watcher (`chokidar`)

```typescript
// Konfigurasi watcher
const watcher = chokidar.watch(directories, {
  ignored: /(^|[\/\\])\..|node_modules|\.git/,
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: { stabilityThreshold: 500 }
});

watcher
  .on('add', path => indexFile(path))
  .on('change', path => reindexFile(path))
  .on('unlink', path => removeFile(path));
```

### 7.2 Chrome/Browser Integration (`playwright`)

```typescript
// Connect ke Chrome yang sudah berjalan (bisa pakai Playwright)
const browser = await chromium.launch({
  headless: false, // Bisa lihat prosesnya
  channel: 'chrome' // Gunakan Chrome yang terinstall
});

// Atau connect ke Chrome via debugging port:
// chrome --remote-debugging-port=9222
const browser = await chromium.connectOverCDP('http://localhost:9222');
```

### 7.3 Local Storage (`better-sqlite3`)

```typescript
import Database from 'better-sqlite3';
const db = new Database(path.join(homeDir, '.swacana', 'data', 'swacana.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
```

---

## 8. 📁 Folder Struktur Data

```
~/.swacana/
├── config.json              # Konfigurasi user
├── data/
│   ├── swacana.db           # SQLite database
│   └── index.json           # File index (cache)
├── models/                  # AI model cache
│   ├── transformers/        # Transformers.js models
│   └── ollama/              # Ollama models (jika dipakai)
├── logs/
│   ├── agent.log            # Agent activity log
│   └── error.log            # Error log
└── notes/                   # Ekspor catatan (markdown)
    └── 2026-07-04-tentang-ai-agent.md
```

---

## 9. 🔒 Keamanan & Privasi

| Aspek | Implementasi |
|-------|--------------|
| **Data tidak keluar laptop** | Semua proses local, zero cloud |
| **Tidak ada API key** | Model AI di-download sekali, offline selamanya |
| **File hanya dibaca** | Tidak ada write ke file user (kecuali di folder sendiri) |
| **Chrome read-only** | Hanya membaca tab aktif, tidak modifikasi |
| **Opt-in** | User harus explicit set folder untuk di-watch |
| **Encryption** | Database bisa di-encrypt dengan passphrase |

---

## 10. 📊 Flow Data End-to-End

```
                    ┌──────────────────┐
                    │  FILE SYSTEM      │
                    │  (folder user)    │
                    └────────┬─────────┘
                             │ chokidar detects change
                             ▼
                    ┌──────────────────┐
                    │  READ FILE        │
                    │  → text content   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  CHUNK + EMBED    │
                    │  → vector[384]    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ LLM Ringkas │ │ RAG Search │ │ Agent      │
     │ → summary   │ │ → relevan  │ │ → insight  │
     └────────┬───┘ └────────┬───┘ └──────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌──────────────────┐
                    │  SQLite STORAGE   │
                    │  → notes, chunks  │
                    │  → embeddings     │
                    │  → memory         │
                    └──────────────────┘
```

---

## 11. 🚀 Quick Start (User Experience)

```bash
# 1. Install dari terminal (hanya sekali)
npm install -g swacana

# Atau tanpa install:
npx swacana init

# 2. Inisialisasi (download model AI ~5 menit)
swacana init

# 3. Mulai mengawasi folder pekerjaan
swacana watch ./my-project

# 4. Atau jalankan agent otomatis
swacana agent daemon

# 5. Buka dashboard web (optional)
swacana dashboard
# → Buka http://localhost:3333 untuk lihat catatan
```

---

## 12. 📋 Daftar Dependensi (100% Free/Open Source)

| Package | Lisensi | Fungsi |
|---------|---------|--------|
| `commander` | MIT | CLI framework |
| `@xenova/transformers` | Apache 2.0 | AI inference (LLM + Embedding) |
| `chokidar` | MIT | File system watcher |
| `better-sqlite3` | MIT | Local database |
| `playwright` | Apache 2.0 | Browser automation |
| `chalk` | MIT | Terminal colors |
| `ora` | MIT | Terminal spinner |
| `conf` | MIT | Config management |
| `uuid` | MIT | UUID generation |
| `update-notifier` | BSD-2 | Version check |

---

## 13. 🧪 Testing Strategy

| Level | Tools | Cakupan |
|-------|-------|---------|
| Unit test | Vitest | AI modules, storage, chunking |
| Integration | Vitest + Playwright | File watcher, browser |
| E2E | Manual + script | Full agent loop |
| Windows test | WSL + native | Cross-platform compatibility |

---

## 14. 🎯 Roadmap

| Fase | Fitur |
|------|-------|
| **MVP** | `init`, `watch`, `scan`, AI ringkasan, SQLite storage |
| **v1.1** | `agent daemon`, RAG search, insight otomatis |
| **v1.2** | Browser capture, clipboard monitoring, auto-tags |
| **v1.3** | Dashboard web, export markdown, template notes |
| **v2.0** | Multi-agent, task automation, integration API |

---

> Dokumen ini adalah **living architecture** — akan terus diperbarui seiring pengembangan.
