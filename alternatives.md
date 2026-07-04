# 🔄 SWACANA — Alternatif & Perbandingan Teknologi

> **Tujuan:** Membandingkan semua pendekatan untuk memastikan solusi **100% gratis, no API key, terminimal mungkin** untuk pengguna awam.

---

## 1. 🤖 AI Engine (LLM)

### 1.1 Perbandingan Opsi LLM Lokal

| Opsi | Gratis? | API Key? | Ukuran | Performa | Setup | Windows |
|------|---------|----------|--------|----------|-------|---------|
| **✅ Transformers.js** (Node.js) | ✅ Ya | ✅ Tidak perlu | 0.5–2 GB | Sedang | 🔧 **Instal otomatis** | ✅ Native |
| **✅ Ollama** | ✅ Ya | ✅ Tidak perlu | 1–8 GB | Tinggi | ⚡ Manual install | ✅ Installer |
| **node-llama-cpp** | ✅ Ya | ✅ Tidak perlu | 1–8 GB | Tinggi | 🔧 Build native | ⚠️ Butuh build tool |
| **WebLLM** | ✅ Ya | ✅ Tidak perlu | 0.7–2 GB | Sedang | 🔧 Browser only | ❌ Tidak untuk CLI |
| **❌ OpenAI API** | ❌ Berbayar | ❌ Wajib | - | Tinggi | 🔧 Mudah | ✅ Ya |
| **❌ Google AI** | ❌ Berbayar | ❌ Wajib | - | Tinggi | 🔧 Mudah | ✅ Ya |
| **❌ Anthropic** | ❌ Berbayar | ❌ Wajib | - | Tinggi | 🔧 Mudah | ✅ Ya |

### 🏆 **Kesimpulan: Transformers.js (default) + Ollama (opsional)**

| Kritería | Transformers.js | Ollama |
|----------|----------------|--------|
| **Instalasi** | Auto-install via npm ✅ | Manual download installer |
| **Size model** | ~1.5GB (LaMini-Flan-T5) | ~1.1GB (qwen3:1.8b) |
| **Kualitas output** | Cukup untuk ringkasan | Bagus untuk analisis |
| **Kecepatan** | CPU inference (lambat) | GPU acceleration (cepat) |
| **Kemudahan untuk pemula** | ✅ Auto, no config | ⚠️ Harus install dulu |

**Keputusan:** Gunakan Transformers.js sebagai default (zero setup). Jika user mau kualitas lebih baik, bisa install Ollama (tetap gratis).

---

## 2. 📦 AI Embedding

### 2.1 Perbandingan Opsi Embedding

| Opsi | Gratis? | API Key? | Dimensi | Kecepatan | Catatan |
|------|---------|----------|---------|-----------|---------|
| **✅ Transformers.js** (all-MiniLM-L6-v2) | ✅ | ✅ Tidak | 384 | Cepat | **Pilihan terbaik**, 90MB, multilingual |
| **Ollama embeddings** | ✅ | ✅ Tidak | 768–4096 | Cepat | Harus install Ollama |
| **Vectra** | ✅ | ✅ Tidak | 384+ | Cepat | Wrapper di atas file storage |
| **VectorDB.js** | ✅ | ✅ Tidak | 384+ | Cepat | In-memory, perlu persistensi |
| **❌ OpenAI embeddings** | ❌ | ❌ | 1536 | Cepat | $0.13/1M tokens |

### 🏆 **Kesimpulan: Transformers.js (all-MiniLM-L6-v2)**

Alasan:
- 100% gratis, offline, tanpa API key
- 384 dimensi (cukup untuk RAG)
- Model multilingual (support Bahasa Indonesia)
- Ukuran hanya 90MB
- Bisa di-cache untuk penggunaan offline

---

## 3. 💾 Local Storage

### 3.1 Perbandingan Database Lokal

| Opsi | Gratis? | Server? | Vector? | Ukuran DB | Kecepatan |
|------|---------|---------|---------|-----------|-----------|
| **✅ better-sqlite3** | ✅ Ya | ❌ No | Bisa via BLOB | Tak terbatas | ⚡ Sangat cepat |
| **Dexie (IndexedDB)** | ✅ Ya | ❌ No | Bisa | 50% kapasitas HDD | 🐢 Lambat (browser) |
| **Vectra** | ✅ Ya | ❌ No | ✅ Built-in | Tak terbatas | ⚡ Cepat |
| **NeDB** | ✅ Ya | ❌ No | ❌ No | Tak terbatas | 🐢 Lambat |
| **LowDB** | ✅ Ya | ❌ No | ❌ No | Terbatas (RAM) | ⚡ Cepat |
| **MongoDB** | ✅ Gratis | ✅ Ya | ✅ Atlas | Tak terbatas | ⚡ Cepat |

### 🏆 **Kesimpulan: better-sqlite3 + Vector storage via BLOB**

Alasan:
- **better-sqlite3:** Paling cepat untuk Node.js CLI, zero config, mature
- Vector disimpan sebagai BLOB Float32Array → diquery dengan cosine similarity
- Tidak perlu server, tidak perlu service
- Performa sangat baik untuk dataset hingga 1 juta+ vektor

---

## 4. 📁 File System Watcher

### 4.1 Perbandingan File Watching

| Opsi | Gratis? | Cross-platform | Akurasi | CPU Usage | Windows |
|------|---------|---------------|---------|-----------|---------|
| **✅ chokidar** | ✅ Ya | ✅ Ya | Tinggi | Rendah | ✅ Sangat baik |
| **Node.js fs.watch** | ✅ Ya | ⚠️ Parsial | Rendah | Rendah | ⚠️ Buggy |
| **Node.js fs.watchFile** | ✅ Ya | ✅ Ya | Tinggi | 🔥 Tinggi | ✅ OK |
| **onchange** | ✅ Ya | ✅ Ya | Sedang | Rendah | ✅ OK |
| **watcher** | ✅ Ya | ✅ Ya | Tinggi | Rendah | ✅ OK |

### 🏆 **Kesimpulan: chokidar**

Alasan:
- Paling mature, digunakan oleh webpack, VSCode, dll
- Menangani Windows quirks (atomic writes, path normalization)
- Filter pattern (ignore node_modules, .git, dll)
- Konfigurasi `awaitWriteFinish` untuk menghindari partial reads

---

## 5. 🌐 Browser Automation

### 5.1 Perbandingan Browser Tools

| Opsi | Gratis? | Browser | Ukuran Install | Windows | Catatan |
|------|---------|---------|---------------|---------|---------|
| **✅ Playwright** | ✅ Ya | Chromium, Firefox, WebKit | ~150MB | ✅ Ya | Auto-download browser |
| **Puppeteer** | ✅ Ya | Chrome/Chromium | ~170MB | ✅ Ya | Hanya Chromium |
| **Puppeteer Core** | ✅ Ya | Chrome existing | 0MB | ✅ Ya | **Paling ringan** |
| **Selenium** | ✅ Ya | All | ~200MB | ✅ Ya | Berat, kompleks |
| **chrome-launcher** | ✅ Ya | Chrome existing | 0MB | ✅ Ya | **Paling ringan** |

### 🏆 **Kesimpulan: chrome-launcher + Puppeteer Core**

Alasan untuk memilih **chrome-launcher + puppeteer-core**:
- **0MB tambahan** — menggunakan Chrome yang sudah terinstall
- `chrome-launcher` untuk menemukan & launch Chrome
- `puppeteer-core` untuk kontrol via DevTools Protocol
- Jika user tidak punya Chrome, fallback ke Playwright (download Chromium otomatis)

---

## 6. 🖥️ CLI Framework

### 6.1 Perbandingan CLI Frameworks

| Opsi | Gratis? | Popularitas | Fitur | Ukuran |
|------|---------|-------------|-------|--------|
| **✅ commander** | ✅ Ya | #1 | Subcommands, help, args | ~50KB |
| **yargs** | ✅ Ya | #2 | Auto-help, type coercion | ~200KB |
| **oclif** | ✅ Ya | #3 | Plugin architecture | ~1MB |
| **cac** | ✅ Ya | #4 | Minimal API | ~30KB |
| **clack** | ✅ Ya | #5 | Interactive prompts | ~100KB |

### 🏆 **Kesimpulan: commander + clack prompts**

`commander` untuk framework CLI, `clack` untuk interactive prompts (spinner, input, select).

---

## 7. 📋 Perbandingan Alternatif Arsitektur Utuh

### Opsi A: Monolith CLI (Pilihan Terpilih)

```
SWACANA CLI tunggal → semua fitur dalam satu package npm
✅ Satu perintah: npm install -g swacana
✅ Semua dependency di-bundle
✅ User tinggal jalanin
✅ 100% gratis
```

### Opsi B: CLI + Web App Terpisah

```
SWACANA CLI (Node.js) + SWACANA Web (Next.js) berjalan terpisah
✅ Web app sudah ada (sekarang)
⚠️ Harus setup dua service
⚠️ Port conflict
```

**Keputusan:** CLI sebagai **companion** ke web app yang sudah ada. CLI untuk terminal, web untuk visual.

### Opsi C: Electron App

```
SWACANA sebagai desktop app (Electron)
✅ GUI built-in
❌ Heavy (~200MB+)
❌ Complex setup
❌ Overkill untuk CLI
```

**Keputusan:** Ditolak — terlalu berat, berlawanan dengan "ringan dan cepat".

### Opsi D: Python CLI

```
SWACANA CLI in Python
✅ Banyak library AI
❌ User harus install Python
❌ Dependency management rumit
❌ Tidak konsisten dengan stack existing (Next.js/TS)
```

**Keputusan:** Ditolak — Node.js lebih konsisten dengan project yang sudah ada.

---

## 8. 💰 Analisis Biaya (Semua Gratis)

| Komponen | Biaya | Keterangan |
|----------|-------|------------|
| Hosting npm | ✅ **Gratis** | npm publish gratis |
| AI Inference | ✅ **Gratis** | Transformers.js di laptop |
| Embedding | ✅ **Gratis** | Transformers.js di laptop |
| Database | ✅ **Gratis** | SQLite lokal |
| File Watching | ✅ **Gratis** | chokidar (open source) |
| Browser Control | ✅ **Gratis** | Playwright (open source) |
| CLI Framework | ✅ **Gratis** | commander (MIT) |
| **TOTAL** | ✅ **Rp 0** | **100% gratis selamanya** |

---

## 9. ⚖️ Tabel Keputusan Akhir

| Modul | Pilihan | Alasan Utama |
|-------|---------|--------------|
| **AI LLM** | Transformers.js + Ollama | Zero setup, gratis, offline |
| **AI Embedding** | Transformers.js (MiniLM) | 100% lokal, 90MB, multilingual |
| **Database** | better-sqlite3 | Tercepat, zero config, mature |
| **File Watcher** | chokidar | Paling reliable di Windows |
| **Browser** | chrome-launcher + puppeteer-core | Zero install, pakai Chrome existing |
| **CLI Framework** | commander | #1 di Node.js, ringan, fitur lengkap |
| **Interactive** | clack | Spinner, prompts yang cantik |
| **Config** | conf | JSON config di ~/.swacana/ |

---

## 10. 🧩 Integrasi dengan SWACANA Web Yang Ada

| Fitur Web | Fitur CLI | Sinkronisasi |
|-----------|-----------|--------------|
| Dashboard visual | `swacana dashboard` | CLI buka browser ke localhost:3333 |
| AI Chat Console | `swacana chat` | CLI mode chat interaktif |
| Notes di IndexedDB | Notes di SQLite | Export/import via JSON |
| Model Manager | Auto-download model | Sama-sama download dari HuggingFace |
| RAG Pipeline | `swacana scan` + embed | Pipeline identik |

### Sinkronisasi Data

```
SWACANA Web (Next.js)          SWACANA CLI (Node.js)
┌───────────────┐              ┌──────────────────┐
│ IndexedDB      │ ←──JSON──→  │ SQLite            │
│ (Dexie.js)     │   export/   │ (better-sqlite3)  │
└───────────────┘   import     └──────────────────┘
```

---

## 11. 🔍 Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Transformers.js terlalu lambat di CPU | User frustasi | Optimasi: quantized models, worker threads |
| Model download gagal (besar) | Tidak bisa pakai AI | Retry logic, resume download, progress bar |
| Playwright tidak kompatibel | Browser capture gagal | Graceful fallback, user bisa skip |
| better-sqlite3 build error | Database tidak jalan | Prebuild binaries, fallback ke SQL.js |
| Node.js versi lawas | Syntax error | target ES2020, dokumentasi requirement |

---

> **Dokumen ini adalah living document** — akan diperbarui seiring perkembangan teknologi dan kebutuhan user.
