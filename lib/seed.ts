/**
 * Seed script — populates IndexedDB with demo analyses, nodes, and reminders.
 * Run this from the browser console: await seedDemoData()
 * Or auto-run when the DB is empty.
 */

import { db, type KiroCanvasNode } from './db';

const NOW = new Date();
const DAY = 86_400_000; // ms per day

function daysAgo(n: number) {
  return new Date(NOW.getTime() - n * DAY).toISOString();
}
function daysFromNow(n: number) {
  return new Date(NOW.getTime() + n * DAY).toISOString().split('T')[0];
}

interface SeedScenario {
  title: string;
  content: string;
  nodes: Omit<KiroCanvasNode, 'id'>[];
  createdAt: string;
  updatedAt: string;
}

function uuid() {
  return crypto.randomUUID();
}

const SCENARIOS: SeedScenario[] = [
  {
    title: 'Krisis Sampah Plastik di Jakarta',
    content:
      'Analisis mendalam tentang krisis sampah plastik di Jakarta. Melibatkan data dari Dinas Lingkungan Hidup DKI Jakarta dan studi kasus pengelolaan sampah berbasis komunitas.',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(1),
    nodes: [
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Produksi Plastik Massal',
        details: 'Produksi plastik global mencapai 400 juta ton/tahun. Di Jakarta, 35% sampah adalah plastik. [Source: UNEP Plastic Report 2024]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Kurangnya Infrastruktur Daur Ulang',
        details: 'Hanya 15% sampah plastik di Jakarta yang terdaur ulang. Fasilitas pengolahan sampah modern hanya ada di 3 dari 5 kota administrasi. [Source: Dinas LH DKI 2024]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'Pencemaran Sungai Ciliwung',
        details: 'Sungai Ciliwung menerima 20 ton sampah plastik per hari dari pemukiman di bantaran sungai. Debit air menurun 40% saat musim kemarau. [Source: Studi Ciliwung 2023]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'Banjir Musiman',
        details: 'Sampah plastik menyumbat 65% saluran air di Jakarta Utara. Biaya penanganan banjir mencapai Rp 2 triliun per tahun. [Source: BNPB]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'IMPACT',
        label: 'Kerusakan Ekosistem Laut',
        details: '100.000 hewan laut mati per tahun akibat plastik. Jakarta Bay memiliki konsentrasi mikroplastik tertinggi di Indonesia. [Source: LIPI]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Program Bank Sampah Digital',
        details: 'Integrasi bank sampah dengan aplikasi digital untuk tracking dan reward. Target: 50% pengurangan sampah plastik di 5 kecamatan. [Source: Framework Circular Economy]',
        targetDate: daysFromNow(90), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Larangan Plastik Sekali Pakai',
        details: 'Peraturan Gubernur DKI tentang larangan plastik sekali pakai di pusat perbelanjaan. Denda Rp 25 juta untuk pelanggaran. [Source: Pergub DKI No. 142/2024]',
        targetDate: daysFromNow(30), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Normalisasi Sungai & Embung',
        details: 'Pengerukan sampah di 12 sungai dan pembangunan 5 embung penampung. Anggaran Rp 500 miliar dari APBD. [Source: PUPR]',
        targetDate: daysFromNow(-5), status: 'PENDING',
      },
    ],
  },
  {
    title: 'Degradasi Hutan Kalimantan',
    content:
      'Analisis deforestasi di Kalimantan Timur akibat tambang batubara dan perkebunan sawit. Data citra satelit menunjukkan penurunan tutupan hutan sebesar 12% dalam 5 tahun terakhir.',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
    nodes: [
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Ekspansi Tambang Batubara',
        details: 'Izin tambang batubara mencakup 2,5 juta hektar di Kaltim. 60% area tambang berada di hutan primer. [Source: Walhi Kaltim 2024]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Konversi Hutan ke Sawit',
        details: 'Perkebunan sawit tumbuh 8% per tahun di Kalimantan. 40% ekspansi berasal dari konversi hutan alam. [Source: Kementan]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'Penurunan Populasi Orangutan',
        details: 'Populasi orangutan di Kalimantan turun 50% dalam 15 tahun. Kehilangan habitat akibat deforestasi adalah ancaman utama. [Source: BOS Foundation 2024]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'IMPACT',
        label: 'Emisi Karbon Masif',
        details: 'Deforestasi Kalimantan menyumbang 15% emisi karbon nasional. Gambut yang terbuka melepas 40 ton CO2/hektar/tahun. [Source: IPCC]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Moratorium Izin Baru',
        details: 'Moratorium izin tambang dan sawit di lahan hutan primer. Evaluasi izin eksisting oleh KLHK. [Source: Perpres Moratorium]',
        targetDate: daysFromNow(14), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Restorasi Ekosistem Gambut',
        details: 'Pembasahan kanal gambut dan penanaman kembali di 50.000 hektar. Kolaborasi dengan masyarakat adat. [Source: BRGM]',
        targetDate: daysFromNow(-2), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Program Desa Konservasi',
        details: 'Insentif ekonomi untuk desa yang menjaga hutan. Rp 100 juta/desa/tahun. Target: 100 desa di Kaltim. [Source: Framework REDD+]',
        targetDate: daysFromNow(180), status: 'DONE',
      },
    ],
  },
  {
    title: 'Krisis Air Bersih Nusa Tenggara',
    content:
      'Analisis krisis air bersih di NTT dan NTB. Kekeringan panjang dipicu perubahan iklim, deforestasi di daerah tangkapan air, dan infrastruktur air yang tidak memadai.',
    createdAt: daysAgo(7),
    updatedAt: daysAgo(0),
    nodes: [
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Perubahan Iklim & Kekeringan',
        details: 'Curah hujan di NTT turun 30% dalam 10 tahun. Musim kemarau berlangsung 8-9 bulan. [Source: BMKG]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Deforestasi DAS',
        details: '70% daerah tangkapan air di Flores dan Sumba gundul. Debit mata air turun 60%. [Source: KLHK]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'Konflik Air Komunal',
        details: '30% desa di NTT melaporkan konflik air antar desa saat kemarau. [Source: Kemendes]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'IMPACT',
        label: 'Stunting & Kesehatan',
        details: 'NTT memiliki prevalensi stunting 35% (tertinggi nasional). Air bersih tidak memadai berkontribusi pada diare berulang. [Source: Riskesdas]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Embung Desa & Pemanenan Hujan',
        details: 'Pembangunan 200 embung desa dan pemanenan air hujan di 500 sekolah. Teknologi sederhana biaya rendah. [Source: PUPR]',
        targetDate: daysFromNow(60), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Reboisasi DAS Prioritas',
        details: 'Penanaman 1 juta pohon di 5 DAS kritis. Melibatkan kelompok tani dan gereja. [Source: Framework Watershed Management]',
        targetDate: daysFromNow(365), status: 'PENDING',
      },
    ],
  },
  {
    title: 'Polusi Udara Jabodetabek',
    content:
      'Analisis polusi udara PM2.5 di Jakarta, Bogor, Depok, Tangerang, Bekasi. Data dari IQAir dan Dinas Lingkungan Hidup. Fokus pada transportasi dan industri.',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(0),
    nodes: [
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Kendaraan Pribadi Massif',
        details: '20 juta kendaraan di Jabodetabek. 70% polusi udara berasal dari transportasi. [Source: Dinas LH]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Pembangkit Listrik Batubara',
        details: 'PLTU Suralaya dan PLTU Indramayu beroperasi tanpa filter yang memadai. Emisi SO2 dan NOx tinggi. [Source: KLHK]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'ISPA & Gangguan Pernapasan',
        details: 'Kunjungan pasien ISPA naik 200% saat musim polusi. Jakarta kehilangan Rp 40 triliun/tahun akibat biaya kesehatan. [Source: Kemkes]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'IMPACT',
        label: 'Produktivitas Turun',
        details: 'Polusi tinggi menyebabkan 15% penurunan produktivitas kerja di sektor formal. [Source: UI Study 2024]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Integrasi Transportasi Massal',
        details: 'Percepatan pembangunan MRT, LRT, dan Bus Transjakarta. Subsidi tarif untuk pengguna rutin. [Source: Framework Sustainable Transport]',
        targetDate: daysFromNow(365), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Pengawasan Emisi Industri',
        details: 'Audit emisi terhadap 100 pabrik terbesar. Sanksi progresif untuk pelanggar. [Source: Pergub Emisi]',
        targetDate: daysFromNow(45), status: 'PENDING',
      },
    ],
  },
  {
    title: 'Krisis Pangan Akibat Perubahan Iklim',
    content:
      'Dampak perubahan iklim pada produksi pangan di Indonesia. Kenaikan suhu, pola hujan tak menentu, dan hama baru mengancam ketahanan pangan nasional.',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
    nodes: [
      {
        noteId: '', parentId: null, nodeType: 'ROOT_CAUSE',
        label: 'Kenaikan Suhu Global',
        details: 'Suhu rata-rata Indonesia naik 1,5°C dibanding era pra-industri. Produksi padi turun 10% per 1°C kenaikan. [Source: IPCC AR6]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'Kegagalan Panen Padi',
        details: '500.000 hektar sawah gagal panen per tahun karena banjir dan kekeringan. Impor beras 2,5 juta ton. [Source: BPS 2024]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'DIAGNOSIS',
        label: 'Serangan Hama Baru',
        details: 'Hama wereng batang coklat dan penggerek batang meningkat 40% dalam 3 tahun karena suhu hangat. [Source: Kementan]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'IMPACT',
        label: 'Kenaikan Harga Pangan',
        details: 'Harga beras naik 25% YoY. Inflasi pangan mencapai 8%. Daya beli masyarakat bawah tergerus. [Source: BI]',
        targetDate: null, status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Varian Padi Tahan Iklim',
        details: 'Pengembangan dan distribusi varian padi tahan banjir dan kekeringan (Inpari IR). Target: 500.000 petani. [Source: BB Padi Litbang]',
        targetDate: daysFromNow(120), status: 'PENDING',
      },
      {
        noteId: '', parentId: null, nodeType: 'MITIGATION',
        label: 'Diversifikasi Pangan Lokal',
        details: 'Program diversifikasi pangan non-beras (sagu, porang, sorgum). Target: 15% konsumsi dari pangan lokal. [Source: Bapanas]',
        targetDate: daysFromNow(-1), status: 'PENDING',
      },
    ],
  },
];

function assignHierarchy(
  nodes: Omit<KiroCanvasNode, 'id'>[],
  noteId: string,
): KiroCanvasNode[] {
  const idMap = new Map<string, string>();
  for (const n of nodes) {
    idMap.set(n.label, uuid());
  }

  const roots = nodes.filter((n) => n.nodeType === 'ROOT_CAUSE');
  const diagnoses = nodes.filter((n) => n.nodeType === 'DIAGNOSIS');
  const impacts = nodes.filter((n) => n.nodeType === 'IMPACT');
  const mitigations = nodes.filter((n) => n.nodeType === 'MITIGATION');

  const result: KiroCanvasNode[] = [];

  // ROOT_CAUSE → parentId: null
  for (const r of roots) {
    result.push({
      id: idMap.get(r.label)!, noteId, parentId: null,
      nodeType: r.nodeType, label: r.label,
      details: r.details, targetDate: r.targetDate, status: r.status,
    });
  }

  const firstRootId: string | null = roots.length > 0 ? idMap.get(roots[0].label)! : null;

  // DIAGNOSIS → parentId: first ROOT_CAUSE
  for (const d of diagnoses) {
    result.push({
      id: idMap.get(d.label)!, noteId, parentId: firstRootId,
      nodeType: d.nodeType, label: d.label,
      details: d.details, targetDate: d.targetDate, status: d.status,
    });
  }

  const lastDiagnosisId: string | null = diagnoses.length > 0
    ? idMap.get(diagnoses[diagnoses.length - 1].label)!
    : null;

  // IMPACT → parentId: last DIAGNOSIS
  for (const imp of impacts) {
    result.push({
      id: idMap.get(imp.label)!, noteId, parentId: lastDiagnosisId,
      nodeType: imp.nodeType, label: imp.label,
      details: imp.details, targetDate: imp.targetDate, status: imp.status,
    });
  }

  const parentForMitigations: string | null =
    impacts.length > 0 ? idMap.get(impacts[0].label)! : lastDiagnosisId;

  // MITIGATION → parentId: first IMPACT (or last DIAGNOSIS)
  for (const m of mitigations) {
    result.push({
      id: idMap.get(m.label)!, noteId, parentId: parentForMitigations,
      nodeType: m.nodeType, label: m.label,
      details: m.details, targetDate: m.targetDate, status: m.status,
    });
  }

  return result;
}

export async function seedDemoData(): Promise<void> {
  // Check if already seeded
  const count = await db.notes.count();
  if (count > 0) {
    console.log('[seed] DB already has data — skipping.');
    return;
  }

  console.log('[seed] Seeding demo data...');

  for (const scenario of SCENARIOS) {
    const noteId = uuid();
    const nodesWithIds = assignHierarchy(scenario.nodes, noteId);

    // Create note with chatMode field
    await db.notes.add({
      id: noteId,
      title: scenario.title,
      content: scenario.content,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
      chatMode: 'default',
      chatModeCustomPrompt: null,
    });

    // Create nodes
    for (const n of nodesWithIds) {
      await db.nodes.add({
        id: n.id,
        noteId: n.noteId,
        parentId: n.parentId,
        nodeType: n.nodeType,
        label: n.label,
        details: n.details,
        targetDate: n.targetDate,
        status: n.status,
      });

      // Create reminder for MITIGATION nodes with targetDate
      if (n.nodeType === 'MITIGATION' && n.targetDate) {
        await db.reminders.add({
          id: uuid(),
          noteId: n.noteId,
          nodeId: n.id,
          title: n.label,
          targetDate: n.targetDate,
          isAcknowledged: n.status === 'DONE',
        });
      }
    }
  }

  console.log(`[seed] Seeded ${SCENARIOS.length} scenarios with ${SCENARIOS.reduce((s, sc) => s + sc.nodes.length, 0)} nodes.`);
}

export async function resetAndSeed(): Promise<void> {
  const confirmed = confirm('Reset all data and re-seed with demo data? This cannot be undone.');
  if (!confirmed) return;

  await db.notes.clear();
  await db.nodes.clear();
  await db.reminders.clear();
  await db.datasets.clear();
  await db.chunks.clear();
  await db.embeddings.clear();
  await db.chatMessages.clear();
  await seedDemoData();
  window.location.reload();
}
