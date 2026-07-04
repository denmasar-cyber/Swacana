# 🚀 SWACANA — Personal AI Desk

**100% lokal, gratis, tanpa API key.**  
Otomatis mencatat, merencanakan, dan mengorganisir informasi dari laptop Anda.

## ✨ Fitur

- 🌐 **AI lokal** — Tidak perlu koneksi internet, tidak perlu bayar
- 📁 **Pantau folder** — Otomatis belajar dari file Anda
- 🧠 **RAG Pipeline** — Cari informasi dari semua file yang pernah dibaca
- 🌍 **Browser capture** — Baca & ringkas halaman Chrome
- 📝 **Auto notes** — Catatan otomatis dari insight AI
- 🪄 **Satu perintah** — `npx swacana init` langsung jalan

## 🚀 Quick Start (Pemula)

### Windows (PowerShell)
```powershell
# Install sekali (butuh Node.js)
npm install -g swacana

# Atau langsung pakai tanpa install:
npx swacana init
```

### macOS / Linux
```bash
npm install -g swacana
# atau
npx swacana init
```

### Setelah install
```bash
# 1. Inisialisasi (download AI model ~5 menit)
swacana init

# 2. Pantau folder proyek Anda
swacana watch ./dokumen-saya

# 3. Scan folder untuk index
swacana scan ./dokumen-saya

# 4. Jalankan agent otomatis
swacana agent

# 5. Lihat semua catatan
swacana notes
```

## 📋 Perintah

| Perintah | Fungsi |
|----------|--------|
| `swacana init` | Inisialisasi & download model AI |
| `swacana watch <dir>` | Pantau folder |
| `swacana scan <dir>` | Index semua file di folder |
| `swacana agent` | Jalankan AI agent |
| `swacana notes` | Lihat catatan |
| `swacana browser` | Capture browser |

## ⚙️ Persyaratan

- **Node.js 18+** (download dari [nodejs.org](https://nodejs.org))
- **Chrome** (opsional, untuk browser capture)
- **Koneksi internet** (hanya sekali untuk download model)

## 💰 Biaya: Rp 0

Semua komponen open source dan gratis:
- ✅ AI model → Transformers.js (Apache 2.0)
- ✅ Database → SQLite (Public Domain)
- ✅ File watcher → chokidar (MIT)
- ✅ CLI → commander (MIT)

## 📁 Data Lokasi

Semua data disimpan di `~/.swacana/`:
```
~/.swacana/
├── config.json       # Konfigurasi
├── data/
│   └── swacana.db    # Database SQLite
├── models/           # Cache AI model
└── logs/             # Log aktivitas
```

## 🛠️ Untuk Developer

```bash
git clone https://github.com/swacana/swacana.git
cd swacana/cli
npm install
npm run dev -- init
```

## 📄 Lisensi

MIT — bebas pakai, modifikasi, dan distribusi.
