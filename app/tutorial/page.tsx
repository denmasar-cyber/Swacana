'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BookOpen, MessageSquare, Database, GitBranch,
  Sparkles, Search, Brain, FileText, Lightbulb,
  ChevronDown, ChevronRight, Zap, Globe, Terminal, Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimateIn, HoverLift, StaggerGroup } from '@/design-system/components/Motion';

interface FeatureSection {
  id: string;
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  description: string;
  steps: string[];
  tips: string[];
  connects: string[];
}

const FEATURES: FeatureSection[] = [
  {
    id: 'notes',
    icon: FileText,
    title: 'Catatan & Editor',
    subtitle: 'Dasar dari semua analisis',
    description: 'Tulis curhatan, diary, tujuan, atau analisis apapun. Editor mendukung format teks kaya (bold, italic, heading, daftar) dan AI terintegrasi langsung di dalamnya.',
    steps: [
      'Klik "Catatan Baru" atau pilih Template di sidebar',
      'Tuliskan situasi, masalah, atau tujuanmu',
      'Gunakan toolbar format untuk memperindah teks (Bold, Italic, Heading, Daftar)',
      'Gunakan tombol AI Edit/Review/Scrap untuk bantuan otomatis',
      'Catatan tersimpan otomatis ke browser (IndexedDB)',
    ],
    tips: [
      'Makin detail tulisanmu, makin baik insight AI',
      'Gunakan template untuk mempercepat analisis',
      'AI Edit: perbaiki tata bahasa & struktur',
      'AI Review: analisis & umpan balik mendalam',
      'AI Scrap: ekstrak data terstruktur dari teks',
    ],
    connects: ['chat', 'studio', 'mindmap'],
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'AI Chat',
    subtitle: 'Diskusi langsung dengan AI',
    description: 'Chat dengan AI untuk mendiskusikan masalahmu. Didukung oleh model WebLLM yang berjalan 100% di browser — tanpa API key, tanpa server, tanpa biaya.',
    steps: [
      'Buka panel AI Chat di toolbar atas (ikon pesan)',
      'Pilih mode: Default (seimbang), Analitis (ilmiah), Ringkas (singkat)',
      'Ketik pertanyaan atau masalahmu',
      'AI akan merespons dengan konteks dari catatan + dataset RAG',
      'Gunakan panel Model untuk mengganti model AI',
    ],
    tips: [
      'Mode Analitis cocok untuk analisis mendalam',
      'Mode Ringkas untuk jawaban cepat',
      'Import dataset di panel Sumber untuk RAG',
      'AI menggunakan konteks dari catatan + dataset',
      'Semua berjalan offline di browser kamu',
    ],
    connects: ['notes', 'sources', 'models', 'mindmap'],
  },
  {
    id: 'sources',
    icon: Database,
    title: 'RAG & Sumber Data',
    subtitle: 'Perkuat AI dengan data eksternal',
    description: 'Import dataset dari HuggingFace untuk memperkuat respons AI. Data di-chunk dan di-embed secara otomatis untuk Retrieval-Augmented Generation (RAG).',
    steps: [
      'Buka panel Sumber (ikon buku) di toolbar atas',
      'Klik "Import Dataset" dan masukkan ID dataset HuggingFace',
      'Pilih split (train/test/validation) dan limit baris',
      'Dataset akan otomatis di-chunk dan di-embed',
      'Aktifkan/nonaktifkan dataset sesuai kebutuhan',
    ],
    tips: [
      'Contoh dataset: "squad", "imdb", "tatsu-lab/alpaca"',
      'Embedding model (~90MB) otomatis diunduh',
      'Dataset yang aktif ditandai badge "RAG: N" di toolbar',
      'Semakin banyak data, semakin akurat respons AI',
      'Data disimpan lokal di browser (IndexedDB)',
    ],
    connects: ['chat', 'studio'],
  },
  {
    id: 'mindmap',
    icon: GitBranch,
    title: 'Mind Map & Decision Tree',
    subtitle: 'Visualisasi hubungan kausal',
    description: 'AI otomatis memetakan masalahmu menjadi decision tree: Root Cause → Diagnosis → Impact → Mitigation. Setiap node bisa ditandai selesai dan punya tenggat waktu.',
    steps: [
      'Buka tab Mind Map (ikon cabang) di toolbar atas',
      'Chat dengan AI tentang masalahmu — AI akan generate node',
      'Atau gunakan Studio → Generate Graph untuk membuat otomatis',
      'Drag dan zoom untuk menjelajahi decision tree',
      'Klik node untuk toggle status (Pending/Done)',
    ],
    tips: [
      'Node Mitigation otomatis muncul di bar tenggat bawah',
      'Warna merah = overdue, kuning = due today',
      'Gunakan Studio → Generate Timeline untuk rencana aksi',
      'Mind Map tersedia sebagai tab terpisah (tidak lagi terpotong)',
      'Gunakan fitur zoom & pan untuk navigasi peta besar',
    ],
    connects: ['notes', 'chat', 'studio'],
  },
  {
    id: 'studio',
    icon: Sparkles,
    title: 'Studio',
    subtitle: 'Generator output terstruktur',
    description: 'Hasilkan output terstruktur dari analisismu: Ringkasan Root Cause, Timeline Mitigasi, dan Graph Mind Map. Semua berbasis konteks catatan + dataset RAG.',
    steps: [
      'Buka panel Studio (ikon sparkle) di toolbar atas',
      'Pastikan catatan sudah ada isinya',
      'Pilih aksi: Ringkasan, Timeline, atau Generate Graph',
      'AI akan memproses dan menghasilkan output terstruktur',
      'Hasil bisa diterapkan langsung ke catatan atau mind map',
    ],
    tips: [
      'Ringkasan: analisis root cause terstruktur',
      'Timeline: rencana mitigasi dengan milestone & tenggat',
      'Graph: otomatis buat node di mind map',
      'Semakin kaya konteks catatan, semakin baik hasilnya',
      'Didukung oleh WebLLM + RAG pipeline',
    ],
    connects: ['notes', 'chat', 'sources', 'mindmap'],
  },
  {
    id: 'search',
    icon: Search,
    title: 'Pencarian AI',
    subtitle: 'Temukan pola & korelasi',
    description: 'Cari di seluruh catatan, node, dan dataset dengan bantuan AI. Temukan pola tersembunyi dan korelasi antar analisis yang berbeda.',
    steps: [
      'Klik "Cari" di sidebar atau buka tab Pencarian',
      'Ketik kata kunci atau pertanyaan',
      'AI akan mencari di semua catatan dan dataset',
      'Hasil menampilkan catatan relevan dengan konteks',
    ],
    tips: [
      'Bisa cari berdasarkan tema, topik, atau pertanyaan',
      'Hasil mencakup catatan + node + dataset',
      'Gunakan untuk menemukan pola antar analisis',
    ],
    connects: ['notes', 'sources'],
  },
  {
    id: 'graph',
    icon: Globe,
    title: 'Peta Kausal',
    subtitle: 'Visualisasi hubungan antar catatan',
    description: 'Lihat hubungan kausal antar semua catatan dalam satu graf. Cocok untuk melihat big picture dari semua analisismu.',
    steps: [
      'Klik "Peta Kausal" di sidebar',
      'Graf akan menampilkan semua catatan dan koneksi antar node',
      'Drag node untuk mengatur posisi',
      'Klik node untuk membuka catatan terkait',
    ],
    tips: [
      'Node yang saling terkait akan terhubung otomatis',
      'Gunakan untuk melihat pola besar',
      'Cocok untuk analisis multi-aspek',
    ],
    connects: ['notes', 'mindmap'],
  },
  {
    id: 'commands',
    icon: Terminal,
    title: 'Command Palette & Shortcut',
    subtitle: 'Akses cepat ke semua fitur',
    description: 'Tekan Ctrl+K (atau Cmd+K) untuk membuka Command Palette — akses cepat ke catatan, node, dataset, dan tindakan tanpa mengangkat tangan dari keyboard.',
    steps: [
      'Tekan Ctrl+K atau Cmd+K dimana saja',
      'Ketik untuk mencari catatan, node, atau tindakan',
      'Gunakan ↑↓ untuk navigasi, Enter untuk memilih',
      'Esc untuk menutup',
    ],
    tips: [
      'Bisa langsung buat catatan baru dari palette',
      'Bisa ganti tema (terang/gelap)',
      'Bisa navigasi ke catatan tertentu',
      'Cari berdasarkan nama node atau dataset',
    ],
    connects: ['notes', 'mindmap', 'sources'],
  },
];

const WORKFLOW_STEPS = [
  { icon: FileText, label: 'Tulis Catatan', desc: 'Curhatan, masalah, tujuan' },
  { icon: MessageSquare, label: 'Chat AI', desc: 'Diskusi & analisis' },
  { icon: Database, label: 'Import Data', desc: 'Perkuat dengan RAG' },
  { icon: Sparkles, label: 'Generate', desc: 'Output terstruktur' },
  { icon: GitBranch, label: 'Mind Map', desc: 'Visualisasi & aksi' },
];

export default function TutorialPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>('notes');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground vintage-paper">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="p-1.5 rounded-xl hover:bg-surface2 text-muted hover:text-foreground transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Tutorial Swacana</h1>
            <p className="text-[10px] text-muted">Panduan lengkap semua fitur</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}          <AnimateIn preset="fadeIn" delay={0}>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-2xl shadow-accent/25 mx-auto mb-4 animate-float">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              Cara Kerja Swacana
            </h2>
            <p className="text-sm text-muted max-w-lg mx-auto leading-relaxed">
              Swacana adalah alat <strong>Decision Intelligence</strong> berbasis AI yang berjalan 100% di browser kamu.
              Tulis masalah → AI bantu analisis → Hasilkan rencana aksi terstruktur.
            </p>
          </div>
        </AnimateIn>

        {/* Workflow Overview */}          <AnimateIn preset="fadeIn" delay={100}>
          <div className="clay-card p-5 mb-8">
            <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap size={14} className="text-accent" />
              Alur Kerja Utama
            </h3>
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                    <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center border border-border">
                      <step.icon size={18} className="text-accent" />
                    </div>
                    <span className="text-[10px] font-semibold text-foreground text-center">{step.label}</span>
                    <span className="text-[8px] text-muted text-center leading-tight">{step.desc}</span>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight size={14} className="text-muted/40 shrink-0 mx-1" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted mt-4 text-center leading-relaxed">
              Setiap langkah terhubung satu sama lain. AI menggunakan konteks dari semua langkah sebelumnya untuk memberikan insight yang lebih baik.
            </p>
          </div>
        </AnimateIn>

        {/* Key Principle */}          <AnimateIn preset="fadeIn" delay={150}>
          <div className="clay-card p-5 mb-8 bg-accent/5 border-accent/20">
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-foreground mb-1">Prinsip Utama</h3>
                <p className="text-[11px] text-muted leading-relaxed">
                  <strong className="text-foreground">Semua berjalan offline di browser kamu.</strong> Tidak ada data yang dikirim ke server.
                  Model AI (Phi-3.5 Mini, 2.2GB) dan Embedding (~90MB) diunduh otomatis saat pertama kali membuka aplikasi.
                  Setelah diunduh, semuanya berjalan tanpa internet.
                </p>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* AI Models Info */}          <AnimateIn preset="fadeIn" delay={175}>
          <div className="clay-card p-5 mb-8">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Brain size={14} className="text-accent" />
              Model AI yang Digunakan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface2 border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={12} className="text-accent" />
                  <span className="text-[11px] font-semibold text-foreground">Phi-3.5 Mini (2.2GB)</span>
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  Model generasi terbaik untuk reasoning & analisis. Diunduh otomatis. Berjalan via WebGPU di browser.
                </p>
              </div>
              <div className="rounded-lg bg-surface2 border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={12} className="text-accent" />
                  <span className="text-[11px] font-semibold text-foreground">All-MiniLM-L6-v2 (~90MB)</span>
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  Model embedding untuk RAG. Mengubah teks jadi vektor 384-dim untuk pencarian semantik. Diunduh otomatis.
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted mt-3 text-center">
              Status unduhan model terlihat di sidebar utama. Jika gagal, klik "Muat" untuk mencoba ulang.
            </p>
          </div>
        </AnimateIn>

        {/* Feature Sections */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2 mb-2 mt-6">
            <Palette size={14} className="text-accent" />
            Penjelasan Fitur Lengkap
          </h3>

          <StaggerGroup delay={50} className="space-y-3">
            {FEATURES.map((feature) => {
              const isExpanded = expandedId === feature.id;
              return (
                <HoverLift key={feature.id} scale={1.005} lift={1}>
                  <div id={`feature-${feature.id}`} className={cn(
                    'clay-card overflow-hidden transition-all',
                    isExpanded && 'ring-1 ring-accent/20',
                  )}>
                    <button
                      onClick={() => toggleExpand(feature.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface2/30 transition-colors"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                        isExpanded ? 'bg-accent/15' : 'bg-surface2',
                      )}>
                        <feature.icon size={18} className={isExpanded ? 'text-accent' : 'text-muted'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground">{feature.title}</span>
                        <span className="block text-[10px] text-muted">{feature.subtitle}</span>
                      </div>
                      <ChevronDown size={14} className={cn(
                        'text-muted transition-transform shrink-0',
                        isExpanded && 'rotate-180',
                      )} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 animate-fade-in">
                        <p className="text-[11px] text-muted leading-relaxed mb-4">{feature.description}</p>

                        {/* Steps */}
                        <div className="mb-4">
                          <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">Cara Pakai</h4>
                          <ol className="space-y-1.5">
                            {feature.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-foreground/80">
                                <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[8px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Tips */}
                        <div className="mb-4">
                          <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">Tips</h4>
                          <ul className="space-y-1">
                            {feature.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-muted">
                                <span className="text-accent mt-0.5 shrink-0">✦</span>
                                <span className="leading-relaxed">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Connections */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] text-muted font-medium">Terhubung dengan:</span>
                          {feature.connects.map((connId) => {
                            const conn = FEATURES.find((f) => f.id === connId);
                            return conn ? (
                              <button key={connId}
                                onClick={() => { setExpandedId(connId); document.getElementById(`feature-${connId}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                                className="tag tag-accent text-[8px] cursor-pointer hover:opacity-80 transition-opacity">
                                {conn.title}
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </HoverLift>
              );
            })}
          </StaggerGroup>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-10 mb-8">
          <button onClick={() => router.push('/')}
            className="clay-btn clay-btn-sm inline-flex items-center gap-2">
            <ArrowLeft size={12} />
            Kembali ke Papan Catatan
          </button>
        </div>
      </div>
    </div>
  );
}
