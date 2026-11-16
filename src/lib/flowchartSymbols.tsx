import React from "react";

export interface FlowchartSymbolDef {
  id: string;
  name: string;
  category: "Utama" | "Dokumen & Data" | "Input & Operasi" | "Konektor & Percabangan" | "Penyimpanan & Lainnya";
  description: string;
  // Representasi SVG viewbox 0 0 40 28
  svgContent: React.ReactNode;
}

export const FLOWCHART_SYMBOLS: FlowchartSymbolDef[] = [
  // 1. Utama
  {
    id: "terminator",
    name: "Terminator (Awal / Akhir)",
    category: "Utama",
    description: "Menandai titik awal (Mulai) atau akhir (Selesai) alur SOP.",
    svgContent: (
      <rect x="3" y="5" width="34" height="18" rx="9" ry="9" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "process",
    name: "Proses / Tindakan",
    category: "Utama",
    description: "Kegiatan, tugas operasional, verifikasi teknis, atau aktivitas standar.",
    svgContent: (
      <rect x="3" y="5" width="34" height="18" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "decision",
    name: "Keputusan / Pemeriksaan",
    category: "Utama",
    description: "Titik evaluasi/validasi yang menghasilkan percabangan (Ya / Tidak / Revisi).",
    svgContent: (
      <polygon points="20,4 37,14 20,24 3,14" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "predefined",
    name: "Subproses / SOP Lain",
    category: "Utama",
    description: "Proses yang telah dirinci dalam SOP lain atau prosedur terpisah.",
    svgContent: (
      <g>
        <rect x="3" y="5" width="34" height="18" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <line x1="9" y1="5" x2="9" y2="23" stroke="currentColor" strokeWidth="1.5" />
        <line x1="31" y1="5" x2="31" y2="23" stroke="currentColor" strokeWidth="1.5" />
      </g>
    ),
  },
  {
    id: "preparation",
    name: "Persiapan / Inisialisasi",
    category: "Utama",
    description: "Penyiapan sarana, bahan kerja, atau pembukaan aplikasi sebelum proses.",
    svgContent: (
      <polygon points="9,5 31,5 37,14 31,23 9,23 3,14" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },

  // 2. Dokumen & Data
  {
    id: "document",
    name: "Dokumen Tunggal",
    category: "Dokumen & Data",
    description: "Dokumen fisik, formulir, berkas cetak, atau surat resmi.",
    svgContent: (
      <path
        d="M 4 5 L 36 5 L 36 19 Q 28 15 20 19 Q 12 23 4 19 Z"
        fill="#f8fafc"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    ),
  },
  {
    id: "multidocument",
    name: "Banyak Dokumen (Multi-Dokumen)",
    category: "Dokumen & Data",
    description: "Kumpulan beberapa dokumen berkas, arsip rangkap, atau bundel laporan.",
    svgContent: (
      <g>
        <path d="M 8 3 L 38 3 L 38 15 Q 31 12 24 15 Q 17 18 8 15 Z" fill="#e2e8f0" stroke="currentColor" strokeWidth="1.4" />
        <path d="M 6 5 L 36 5 L 36 17 Q 29 14 22 17 Q 15 20 6 17 Z" fill="#cbd5e1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M 4 7 L 34 7 L 34 21 Q 27 17 19 21 Q 12 25 4 21 Z" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
      </g>
    ),
  },
  {
    id: "data",
    name: "Data / I-O (Jajar Genjang)",
    category: "Dokumen & Data",
    description: "Input berkas atau penerimaan hasil output data informasi.",
    svgContent: (
      <polygon points="9,5 37,5 31,23 3,23" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "card",
    name: "Kartu / Formulir Fisik",
    category: "Dokumen & Data",
    description: "Kartu kendali, lembar disposisi, atau formulir isian dengan pojok terpotong.",
    svgContent: (
      <polygon points="10,5 37,5 37,23 3,23 3,12" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "display",
    name: "Tampilan Layar / Monitor",
    category: "Dokumen & Data",
    description: "Informasi yang ditampilkan ke pengguna lewat layar komputer/dashboard.",
    svgContent: (
      <path d="M 5 14 L 11 5 L 30 5 Q 37 14 30 23 L 11 23 Z" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },

  // 3. Input & Operasi
  {
    id: "manual_input",
    name: "Entri Data Manual",
    category: "Input & Operasi",
    description: "Pengisian data manual via keyboard, komputer, atau input web form.",
    svgContent: (
      <polygon points="3,10 37,5 37,23 3,23" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "manual_operation",
    name: "Operasi Manual (Tanpa Komputer)",
    category: "Input & Operasi",
    description: "Pekerjaan fisik manual (pemeriksaan berkas fisik, cap basah, tanda tangan).",
    svgContent: (
      <polygon points="3,5 37,5 31,23 9,23" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "delay",
    name: "Penundaan / Menunggu (Delay)",
    category: "Input & Operasi",
    description: "Masa tunggu antrean berkas, proses terjadwal, atau jeda waktu respon.",
    svgContent: (
      <path d="M 4 5 L 24 5 A 9 9 0 0 1 24 23 L 4 23 Z" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "collate",
    name: "Penyusunan Berkas (Collate)",
    category: "Input & Operasi",
    description: "Menyusun atau mencocokkan beberapa berkas menjadi satu kesatuan tertib.",
    svgContent: (
      <polygon points="4,5 36,5 4,23 36,23" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "sort",
    name: "Pengurutan Data (Sort)",
    category: "Input & Operasi",
    description: "Mengurutkan data atau dokumen berdasarkan kriteria/abjad/tanggal tertentu.",
    svgContent: (
      <g>
        <polygon points="20,4 36,14 20,24 4,14" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <line x1="4" y1="14" x2="36" y2="14" stroke="currentColor" strokeWidth="1.5" />
      </g>
    ),
  },

  // 4. Konektor & Percabangan
  {
    id: "connector",
    name: "Konektor Halaman Sama (Lingkaran)",
    category: "Konektor & Percabangan",
    description: "Titik sambung alur flowchart dalam halaman yang sama.",
    svgContent: (
      <circle cx="20" cy="14" r="9" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "offpage",
    name: "Konektor Antar Halaman (Off-Page)",
    category: "Konektor & Percabangan",
    description: "Penghubung alur yang berlanjut ke halaman berikutnya (segi lima meruncing).",
    svgContent: (
      <polygon points="6,5 34,5 34,16 20,24 6,16" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "merge",
    name: "Penggabungan Alur (Merge)",
    category: "Konektor & Percabangan",
    description: "Titik temu di mana dua atau lebih alur proses bergabung menjadi satu.",
    svgContent: (
      <polygon points="5,5 35,5 20,23" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "extract",
    name: "Pemisahan Alur (Extract)",
    category: "Konektor & Percabangan",
    description: "Satu alur proses dipecah menjadi beberapa alur tindak lanjut.",
    svgContent: (
      <polygon points="20,5 35,23 5,23" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
    ),
  },
  {
    id: "or",
    name: "Logika OR (Percabangan Pilihan)",
    category: "Konektor & Percabangan",
    description: "Titik alur yang berlanjut jika salah satu kondisi terpenuhi.",
    svgContent: (
      <g>
        <circle cx="20" cy="14" r="9" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <line x1="20" y1="5" x2="20" y2="23" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="14" x2="29" y2="14" stroke="currentColor" strokeWidth="1.5" />
      </g>
    ),
  },
  {
    id: "summing",
    name: "Titik Temu / Summing (AND)",
    category: "Konektor & Percabangan",
    description: "Pertemuan alur di mana seluruh prasyarat harus terpenuhi bersamaan.",
    svgContent: (
      <g>
        <circle cx="20" cy="14" r="9" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <line x1="14" y1="8" x2="26" y2="20" stroke="currentColor" strokeWidth="1.5" />
        <line x1="26" y1="8" x2="14" y2="20" stroke="currentColor" strokeWidth="1.5" />
      </g>
    ),
  },

  // 5. Penyimpanan & Lainnya
  {
    id: "database",
    name: "Basis Data / Database (Silinder)",
    category: "Penyimpanan & Lainnya",
    description: "Penyimpanan data elektronik atau server database terpusat.",
    svgContent: (
      <g>
        <ellipse cx="20" cy="9" rx="14" ry="4" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <path d="M 6 9 L 6 20 A 14 4 0 0 0 34 20 L 34 9" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
      </g>
    ),
  },
  {
    id: "internal_storage",
    name: "Penyimpanan Internal",
    category: "Penyimpanan & Lainnya",
    description: "Penyimpanan data lokal dalam memori sistem aplikasi atau spreadsheet internal.",
    svgContent: (
      <g>
        <rect x="3" y="5" width="34" height="18" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <line x1="3" y1="11" x2="37" y2="11" stroke="currentColor" strokeWidth="1.5" />
        <line x1="10" y1="5" x2="10" y2="23" stroke="currentColor" strokeWidth="1.5" />
      </g>
    ),
  },
  {
    id: "stored_data",
    name: "Data Arsip Tersimpan",
    category: "Penyimpanan & Lainnya",
    description: "Berkas arsip digital atau file dokumen yang disimpan ke repositori.",
    svgContent: (
      <path
        d="M 10 5 L 30 5 A 9 9 0 0 1 30 23 L 10 23 A 9 9 0 0 1 10 5 Z"
        fill="#f8fafc"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    ),
  },
  {
    id: "sequential_data",
    name: "Data Berurutan / Rekaman",
    category: "Penyimpanan & Lainnya",
    description: "Data rekaman berurutan, log sistem, atau jejak audit berkesinambungan.",
    svgContent: (
      <g>
        <circle cx="18" cy="13" r="8" fill="#f8fafc" stroke="currentColor" strokeWidth="1.8" />
        <line x1="18" y1="21" x2="35" y2="21" stroke="currentColor" strokeWidth="1.8" />
      </g>
    ),
  },
];

// Helper icon component
export const FlowchartSymbolIcon: React.FC<{ symbolId: string; className?: string }> = ({
  symbolId,
  className = "w-6 h-4",
}) => {
  const symbol = FLOWCHART_SYMBOLS.find((s) => s.id === symbolId) || FLOWCHART_SYMBOLS[1]; // default process
  return (
    <svg viewBox="0 0 40 28" className={`inline-block shrink-0 ${className}`}>
      {symbol.svgContent}
    </svg>
  );
};
