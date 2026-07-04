<#
.SYNOPSIS
  SWACANA — Personal AI Desk Installer (Windows)
.DESCRIPTION
  One-command install script for SWACANA CLI on Windows.
  Installs Node.js (if needed), downloads SWACANA, and runs init.
.LINK
  https://github.com/swacana/swacana
#>

# ─── Config ─────────────────────────────────────────────────────────────────
$PACKAGE_NAME = "swacana"
$NODE_MIN_VERSION = 18

# ─── Colors ─────────────────────────────────────────────────────────────────
function Write-Color($text, $color = "White") {
    Write-Host $text -ForegroundColor $color
}

# ─── Banner ─────────────────────────────────────────────────────────────────
function Show-Banner {
    Write-Color @"
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
"@ "Cyan"
}

# ─── Check Node.js ──────────────────────────────────────────────────────────
function Test-NodeInstalled {
    try {
        $version = node --version 2>$null
        if ($version -match 'v(\d+)') {
            $numVersion = [int]$Matches[1]
            if ($numVersion -ge $NODE_MIN_VERSION) {
                return $true, $version
            }
        }
    } catch {}
    return $false, $null
}

# ─── Install Node.js via winget ─────────────────────────────────────────────
function Install-NodeJS {
    Write-Color "📦  Menginstall Node.js via winget..." "Yellow"

    try {
        # Check if winget is available
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if (-not $wingetCheck) {
            Write-Color "⚠️  winget tidak tersedia. Install Node.js manual dari:" "Red"
            Write-Color "   https://nodejs.org (pilih LTS version)" "White"
            return $false
        }

        # Install Node.js using winget
        $process = Start-Process -FilePath "winget" -ArgumentList "install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Color "   ✅ Node.js berhasil diinstall!" "Green"
            # Refresh PATH
            $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
            return $true
        } else {
            Write-Color "⚠️  Gagal install Node.js. Install manual dari https://nodejs.org" "Red"
            return $false
        }
    } catch {
        Write-Color "⚠️  Error: $($_.Exception.Message)" "Red"
        Write-Color "   Install Node.js manual dari https://nodejs.org" "White"
        return $false
    }
}

# ─── Main Install ───────────────────────────────────────────────────────────
function Install-SWACANA {
    Show-Banner

    Write-Color "`n🔧  Memulai instalasi SWACANA...`n" "White"

    # Step 1: Check Node.js
    Write-Color "📋  Langkah 1/4: Memeriksa Node.js..." "White"
    $installed, $version = Test-NodeInstalled

    if ($installed) {
        Write-Color "   ✅ Node.js $version terdeteksi" "Green"
    } else {
        Write-Color "   ⚠️  Node.js belum terinstall" "Yellow"
        $ok = Install-NodeJS
        if (-not $ok) {
            Write-Color "`n❌  Install Node.js dulu, lalu jalankan ulang script ini." "Red"
            Write-Color "   Download: https://nodejs.org (pilih LTS)`n" "White"
            return $false
        }

        # Recheck
        $installed, $version = Test-NodeInstalled
        if (-not $installed) {
            Write-Color "`n❌  Node.js masih belum terdeteksi. Restart terminal & coba lagi." "Red"
            return $false
        }
        Write-Color "   ✅ Node.js $version terinstall" "Green"
    }

    # Step 2: Install SWACANA via npm
    Write-Color "`n📦  Langkah 2/4: Menginstall SWACANA..." "White"
    Write-Color "   Menjalankan: npm install -g $PACKAGE_NAME" "Gray"

    try {
        $installProcess = Start-Process -FilePath "npm" -ArgumentList "install", "-g", $PACKAGE_NAME -Wait -PassThru -NoNewWindow

        if ($installProcess.ExitCode -ne 0) {
            Write-Color "   ⚠️  Install via npm gagal. Mencoba instalasi lokal..." "Yellow"

            # Fallback: clone and install locally
            $tempDir = "$env:TEMP\swacana-install"
            if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }

            Write-Color "   📥 Clone dari repository..." "White"
            & git clone https://github.com/swacana/swacana.git $tempDir 2>$null

            if (Test-Path "$tempDir\cli") {
                Push-Location "$tempDir\cli"
                & npm install
                & npm run build
                & npm link
                Pop-Location
                Remove-Item -Recurse -Force $tempDir
                Write-Color "   ✅ SWACANA terinstall via git clone!" "Green"
            } else {
                # Direct install from local source
                Write-Color "   📥 Install dari source lokal..." "White"
                $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
                if (Test-Path "$scriptDir\cli") {
                    Push-Location "$scriptDir\cli"
                    & npm install
                    & npm run build
                    & npm link
                    Pop-Location
                    Write-Color "   ✅ SWACANA terinstall dari source lokal!" "Green"
                } else {
                    Write-Color "   ❌ Gagal install dari semua sumber." "Red"
                    return $false
                }
            }
        } else {
            Write-Color "   ✅ SWACANA berhasil diinstall!" "Green"
        }
    } catch {
        Write-Color "   ❌ Error: $($_.Exception.Message)" "Red"
        return $false
    }

    # Step 3: Verify installation
    Write-Color "`n✅  Langkah 3/4: Memverifikasi instalasi..." "White"
    try {
        $versionOut = & swacana --version 2>&1
        Write-Color "   ✅ SWACANA $versionOut siap digunakan!" "Green"
    } catch {
        Write-Color "   ⚠️  'swacana' tidak dikenali. Coba restart terminal." "Yellow"
        Write-Color "   Atau jalankan: npx $PACKAGE_NAME --version" "Gray"
    }

    # Step 4: Init
    Write-Color "`n🚀  Langkah 4/4: Inisialisasi SWACANA..." "White"
    Write-Color "   Menjalankan: swacana init" "Gray"
    Write-Color "   (Download model AI ~1.5GB. Butuh internet & waktu)" "Yellow"

    try {
        & swacana init
    } catch {
        Write-Color "`n   Nanti jalankan manual: swacana init" "Yellow"
    }

    # Done
    Write-Color @"

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
"@ "Cyan"

    return $true
}

# ─── Run ───────────────────────────────────────────────────────────────────
$result = Install-SWACANA

if (-not $result) {
    Write-Color "`n❌  Instalasi gagal. Silakan coba manual:" "Red"
    Write-Color "   1. Install Node.js dari https://nodejs.org" "White"
    Write-Color "   2. npm install -g swacana" "White"
    Write-Color "   3. swacana init`n" "White"

    # Pause so user can see the error
    Write-Color "   Tekan Enter untuk keluar..." "Gray"
    $null = Read-Host
    exit 1
}

# Pause if double-clicked
if ($Host.Name -eq "ConsoleHost") {
    Write-Color "`n   Tekan Enter untuk keluar..." "Gray"
    $null = Read-Host
}
