#!/usr/bin/env bash
#
# SWACANA — Personal AI Desk Installer (Unix/macOS)
#
# One-command install: curl -fsSL https://swacana.com/install.sh | bash
#
# Requirements: Node.js 18+, bash
#

set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# ─── Config ─────────────────────────────────────────────────────────────────
PACKAGE_NAME="swacana"
NODE_MIN_VERSION=18

# ─── Helpers ────────────────────────────────────────────────────────────────
info()  { echo -e "   ${CYAN}$1${NC}"; }
ok()    { echo -e "   ${GREEN}✅ $1${NC}"; }
warn()  { echo -e "   ${YELLOW}⚠️  $1${NC}"; }
err()   { echo -e "   ${RED}❌ $1${NC}"; }
gray()  { echo -e "   ${GRAY}$1${NC}"; }

# ─── Banner ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}"
cat << 'EOF'
╭──────────────────────────────────────╮
│                                      │
│   ███████  ██     ██  █████   █████  │
│  ██       ████   ████ ██  ██ ██     │
│  ██       ██ ██ ██ ██ █████  ██     │
│  ██       ██  ███  ██ ██  ██ ██     │
│   ███████ ██   █   ██ ██  ██  █████  │
│                                      │
│  🌟 SWACANA — Personal AI Desk       │
│  100% Lokal · Gratis · No API Key    │
│                                      │
╰──────────────────────────────────────╯
EOF
echo -e "${NC}"
echo ""

# ─── Check Node.js ──────────────────────────────────────────────────────────
info "📋 Langkah 1/4: Memeriksa Node.js..."

if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -ge "$NODE_MIN_VERSION" ]; then
        ok "Node.js v$(node --version) terdeteksi"
    else
        warn "Node.js v$(node --version) terinstall, tapi minimal v$NODE_MIN_VERSION"
        warn " Upgrade dari https://nodejs.org"
        exit 1
    fi
else
    warn "Node.js belum terinstall"

    # Check for package managers
    if command -v brew &>/dev/null; then
        info "📦 Menginstall Node.js via Homebrew..."
        brew install node
    elif command -v apt-get &>/dev/null; then
        info "📦 Menginstall Node.js via apt..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
        info "📦 Menginstall Node.js via dnf..."
        sudo dnf install -y nodejs
    else
        err "Tidak ada package manager yang cocok."
        err "Install Node.js manual dari https://nodejs.org"
        exit 1
    fi

    # Verify installation
    if command -v node &>/dev/null; then
        ok "Node.js $(node --version) terinstall"
    else
        err "Gagal install Node.js. Install manual dari https://nodejs.org"
        exit 1
    fi
fi

# ─── Check npm ──────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
    err "npm tidak ditemukan. Install Node.js dari https://nodejs.org"
    exit 1
fi
ok "npm $(npm --version) terdeteksi"

# ─── Install SWACANA ────────────────────────────────────────────────────────
echo ""
info "📦 Langkah 2/4: Menginstall SWACANA..."
gray "Menjalankan: npm install -g $PACKAGE_NAME"

if npm install -g "$PACKAGE_NAME" 2>/dev/null; then
    ok "SWACANA berhasil diinstall via npm!"
else
    warn "Install via npm publik gagal. Mencoba dari source..."

    # Get the script directory (works with curl | bash too)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd 2>/dev/null || echo "")"

    if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/cli/package.json" ]; then
        info "Menginstall dari source lokal..."
        cd "$SCRIPT_DIR/cli"
        npm install
        npm run build
        npm link
        ok "SWACANA terinstall dari source lokal!"
    else
        err "Gagal install dari semua sumber."
        err "Coba manual:"
        err "  git clone https://github.com/swacana/swacana.git"
        err "  cd swacana/cli && npm install && npm run build && npm link"
        exit 1
    fi
fi

# ─── Verify ──────────────────────────────────────────────────────────────────
echo ""
info "✅ Langkah 3/4: Memverifikasi instalasi..."

if command -v swacana &>/dev/null; then
    SWACANA_VER=$(swacana --version 2>/dev/null || echo "terinstall")
    ok "SWACANA $SWACANA_VER siap digunakan!"
else
    warn "'swacana' tidak dikenali. Coba restart terminal."
    gray "Atau jalankan: npx $PACKAGE_NAME --version"
fi

# ─── Init ────────────────────────────────────────────────────────────────────
echo ""
info "🚀 Langkah 4/4: Inisialisasi SWACANA..."
gray "Menjalankan: swacana init"
gray "(Download model AI ~1.5GB. Butuh internet & waktu)"
echo ""

if command -v swacana &>/dev/null; then
    swacana init || warn "Inisialisasi gagal. Jalankan 'swacana init' manual nanti."
else
    warn "Jalankan 'npx swacana init' untuk inisialisasi."
fi

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}"
cat << 'EOF'
╭──────────────────────────────────────╮
│                                      │
│  ✅  SWACANA siap digunakan!         │
│                                      │
│  🚀  Coba perintah berikut:          │
│                                      │
│     swacana watch ./folder-anda      │
│     swacana scan ./folder-anda       │
│     swacana agent                    │
│     swacana dashboard                │
│     swacana --help                   │
│                                      │
│  📁  Data disimpan di:               │
│     ~/.swacana/                      │
│                                      │
│  💡  Butuh tutorial?                │
│     https://swacana.com/docs         │
│                                      │
╰──────────────────────────────────────╯
EOF
echo -e "${NC}"
echo ""
