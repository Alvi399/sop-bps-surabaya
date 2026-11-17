// src/pages/CreateSOP.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Save, Send, Sparkles, Workflow, FileText, 
  Plus, Trash2, MoveUp, MoveDown, X, Eye,
  Building2, Stamp, FileSignature
} from "lucide-react";
import { DataService } from "@/lib/mockData";
import { AuthService } from "@/lib/auth";
import { SOPDocument } from "@/types";
import { toast } from "sonner";
import generateSOPPdf from "@/lib/pdfGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle } from "lucide-react";
import { notifyRealtimeUpdate } from "@/lib/realtime";
import { DEPARTMENTS } from "@/lib/departments";
import { FlowchartSymbolPicker, ExecutorRouteData, FlowchartConnection } from "@/components/sop/FlowchartSymbolPicker";
import { FlowchartSymbolIcon } from "@/lib/flowchartSymbols";

// ✅ API Configuration
import { API_URL } from "@/lib/api";

// ✅ Helper function untuk get token
const getAuthToken = () => {
  const authData = localStorage.getItem('bps_sop_auth');
  if (!authData) return null;
  const user = JSON.parse(authData);
  return user.token || null; // Sesuaikan dengan struktur token Anda
};

// Helper function to format date from YYYY-MM-DD to DD Month YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

interface FlowchartStep {
  no: number;
  aktivitas: string;
  pelaksana: { [key: string]: boolean }; // Dynamic pelaksana columns
  mutuBaku: {
    persyaratan: string;
    output: string;
    waktu: string;
  };
  keterangan: string;
  shapes: { [key: string]: string }; // Map of pelaksana name -> shape
  shapeText?: { [key: string]: string } | string; // (legacy)
  connections?: { [key: string]: FlowchartConnection[] }; // Banyak koneksi fleksibel per pelaksana!
  executorRoutes?: { [key: string]: ExecutorRouteData }; // Rute spesifik per pelaksana!
  targetStep?: number; // Target langkah selanjutnya (default: no + 1, 0 = selesai)
  returnStep?: number; // Target langkah alternatif / kembali (misal jika revisi / tidak)
  returnLabel?: string; // (legacy)
}

// Mini Flowchart Live Simulator Component
function FlowchartLivePreview({
  steps,
  columns,
}: {
  steps: FlowchartStep[];
  columns: string[];
}) {
  return (
    <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl shadow-inner border border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Live Preview Alur Diagram Flowchart (Swimlane BPS)</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">25+ Bentuk Simbol Visual & Alur Fleksibel Multi-Koneksi</span>
      </div>

      <div className="overflow-x-auto w-full">
        <div className="min-w-[650px] grid" style={{ gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` }}>
          {/* Header Row */}
          <div className="p-2.5 text-xs font-bold text-slate-400 border-b border-slate-700 bg-slate-950/60 rounded-tl-lg">
            Aktivitas
          </div>
          {columns.map((col, idx) => (
            <div
              key={idx}
              className={`p-2.5 text-xs font-bold text-blue-300 text-center border-b border-slate-700 border-l border-slate-800 bg-slate-950/60 truncate ${
                idx === columns.length - 1 ? 'rounded-tr-lg' : ''
              }`}
            >
              {col}
            </div>
          ))}

          {/* Step Rows */}
          {steps.map((step, sIdx) => {
            return (
              <div key={sIdx} className="contents group">
                <div className="p-2.5 text-[11px] text-slate-300 border-b border-slate-800/80 flex flex-col justify-center bg-slate-900/60 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 text-[10px] flex items-center justify-center font-bold shrink-0 border border-blue-600/40">
                      {step.no}
                    </span>
                    <span className="truncate text-slate-200 font-medium" title={step.aktivitas || `Langkah ${step.no}`}>
                      {step.aktivitas || `Langkah ${step.no}`}
                    </span>
                  </div>
                </div>

                {columns.map((col, cIdx) => {
                  const isActive = !!step.pelaksana[col];
                  const symbol = (step.shapes && step.shapes[col] && step.shapes[col] !== "auto") 
                    ? step.shapes[col] 
                    : (sIdx === 0 || sIdx === steps.length - 1 ? "terminator" : "process");
                  const conns = (step.connections?.[col] && step.connections[col].length > 0)
                    ? step.connections[col]
                    : (step.executorRoutes?.[col] ? [
                        { targetStep: step.executorRoutes[col].targetStep ?? 0, targetPelaksana: step.executorRoutes[col].targetPelaksana },
                        ...(step.executorRoutes[col].returnStep ? [{ targetStep: step.executorRoutes[col].returnStep, targetPelaksana: step.executorRoutes[col].returnPelaksana }] : [])
                      ] : [{ targetStep: sIdx + 2 <= steps.length ? sIdx + 2 : 0 }]);

                  return (
                    <div
                      key={cIdx}
                      className="p-2.5 flex flex-col items-center justify-center border-b border-slate-800/80 border-l border-slate-800/60 relative min-h-[64px] bg-slate-900/40"
                    >
                      {isActive ? (
                        <div className="flex flex-col items-center gap-1 w-full">
                          {/* Polosan plain shapes dengan icon SVG presisi */}
                          <div className="p-1 bg-white rounded shadow-sm border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-800">
                            <FlowchartSymbolIcon symbolId={symbol} className="w-10 h-7" />
                          </div>

                          {/* Specific route badges for this executor */}
                          {conns.map((c, idx) => {
                            const isCurrent = c.targetStep === sIdx + 1;
                            const isEnd = c.targetStep === 0;
                            const isBack = c.targetStep > 0 && c.targetStep < sIdx + 1;
                            const targetText = c.targetPelaksana ? ` (${c.targetPelaksana})` : '';
                            return (
                              <span
                                key={idx}
                                className={`text-[8.5px] font-semibold px-1 rounded border max-w-[120px] truncate ${
                                  isEnd
                                    ? "text-slate-400 bg-slate-950 border-slate-800"
                                    : isCurrent
                                    ? "text-purple-300 bg-purple-950/80 border-purple-800/60"
                                    : isBack
                                    ? "text-amber-300 bg-amber-950/80 border-amber-800/60"
                                    : "text-cyan-300 bg-cyan-950/80 border-cyan-800/60"
                                }`}
                              >
                                {isEnd
                                  ? "🏁 Selesai"
                                  : isCurrent
                                  ? `➔ L-${c.targetStep}${targetText}`
                                  : isBack
                                  ? `↶ L-${c.targetStep}${targetText}`
                                  : `➔ L-${c.targetStep}${targetText}`}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CreateSOP() {
  const [formData, setFormData] = useState({
    code: "",
    tanggalPembuatan: "",
    tanggalRevisi: "",
    tanggalEfektif: "",
    title: "",
    department: "",
    responsiblePerson: "",
    dasarHukum: "",
    kualifikasiPelaksana: "",
    keterkaitan: "",
    peralatanPerlengkapan: "",
    peringatan: "",
    pencatatanPendataan: "",
    maksud: "",
    tujuan: "",
    description: "",
    effectiveDate: "",
    expiryDate: "",
    // KOP & Pengesahan Kustom (Opsional)
    instansi: "",
    kepalaInstansi: "",
    subBagian: "",
    jabatanPengesah: "",
    namaPengesah: "",
    nipPengesah: "",
  });

  // Stempel & Tanda Tangan kustom
  const [stempelImage, setStempelImage] = useState<string | null>(null);
  const [ttdImage, setTtdImage] = useState<string | null>(null);

  const handleStempelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file stempel maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setStempelImage(reader.result as string);
      toast.success("✅ File stempel berhasil dimuat");
    };
    reader.readAsDataURL(file);
  };

  const handleTtdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file tanda tangan maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTtdImage(reader.result as string);
      toast.success("✅ File tanda tangan berhasil dimuat");
    };
    reader.readAsDataURL(file);
  };

  // Pelaksana columns (dynamic)
  const [pelaksanaColumns, setPelaksanaColumns] = useState<string[]>([
    "Kasubbag Tata Usaha",
    "Staff",
    "Bina Program BPS Provinsi",
  ]);
  const [newPelaksanaName, setNewPelaksanaName] = useState("");

  // Flowchart steps
  const [flowchartSteps, setFlowchartSteps] = useState<FlowchartStep[]>([
    {
      no: 1,
      aktivitas: "",
      pelaksana: {
        "Kasubbag Tata Usaha": false,
        "Staff": false,
        "Bina Program BPS Provinsi": false,
      },
      mutuBaku: {
        persyaratan: "",
        output: "",
        waktu: "",
      },
      keterangan: "",
      shapes: {},
    },
  ]);

  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFlowchart, setShowFlowchart] = useState(false);
  // custom shape images: { stepIndex: Uint8Array }
  const [customShapeImages, setCustomShapeImages] = useState<{ [key: number]: Uint8Array }>({});

  const [activeTab, setActiveTab] = useState("generate"); // "generate" or "upload"

  // Form data untuk upload PDF manual
  const [uploadFormData, setUploadFormData] = useState({
    code: "",
    title: "",
    department: "",
    responsiblePerson: "",
    effectiveDate: "",
    expiryDate: "",
    description: "",
    status: "draft"
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const currentUser = AuthService.getCurrentUser();
  const departments = Array.from(new Set([...DEPARTMENTS, ...(currentUser?.department ? [currentUser.department] : [])]));

  const AUTOSAVE_DRAFT_KEY = "bps_sop_create_autosave_draft";
  const [draftRestored, setDraftRestored] = useState(false);

  // 1. Auto-Restore: Muat draft otomatis saat halaman dibuka
  useEffect(() => {
    try {
      const user = AuthService.getCurrentUser();
      const saved = localStorage.getItem(AUTOSAVE_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData && (parsed.formData.title || parsed.formData.code || parsed.formData.department || parsed.formData.description)) {
          setFormData(parsed.formData);
          if (parsed.pelaksanaColumns && parsed.pelaksanaColumns.length > 0) {
            setPelaksanaColumns(parsed.pelaksanaColumns);
          }
          if (parsed.flowchartSteps && parsed.flowchartSteps.length > 0) {
            setFlowchartSteps(parsed.flowchartSteps);
          }
          if (parsed.uploadFormData) {
            setUploadFormData(parsed.uploadFormData);
          }
          if (parsed.activeTab) {
            setActiveTab(parsed.activeTab);
          }
          if (parsed.stempelImage) {
            setStempelImage(parsed.stempelImage);
          }
          if (parsed.ttdImage) {
            setTtdImage(parsed.ttdImage);
          }
          setDraftRestored(true);
          toast.info("✨ Draft SOP yang Anda ketik sebelumnya telah dipulihkan otomatis!");
        }
      } else if (user) {
        // Pre-fill department & penanggung jawab dari user yang sedang login
        if (user.department) {
          setUploadFormData(prev => ({
            ...prev,
            department: user.department || prev.department,
            responsiblePerson: user.fullName || user.full_name || prev.responsiblePerson
          }));
          setFormData(prev => ({
            ...prev,
            department: user.department || prev.department,
            penanggungJawab: user.fullName || user.full_name || prev.penanggungJawab
          }));
        }
      }
    } catch (e) {
      console.error("Error restoring autosaved draft:", e);
    }
  }, []);

  // 2. Auto-Save: Simpan draft otomatis tiap kali data form berubah
  useEffect(() => {
    try {
      const hasContent = formData.title || formData.code || formData.department || formData.description || uploadFormData.title;
      if (hasContent) {
        const draft = {
          formData,
          pelaksanaColumns,
          flowchartSteps,
          uploadFormData,
          activeTab,
          stempelImage,
          ttdImage,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(AUTOSAVE_DRAFT_KEY, JSON.stringify(draft));
      }
    } catch (e) {
      console.error("Error auto-saving draft:", e);
    }
  }, [formData, pelaksanaColumns, flowchartSteps, uploadFormData, activeTab, stempelImage, ttdImage]);

  const clearAutoSaveDraft = () => {
    try {
      localStorage.removeItem(AUTOSAVE_DRAFT_KEY);
      setDraftRestored(false);
      setStempelImage(null);
      setTtdImage(null);
    } catch (e) {
      console.error("Error clearing draft:", e);
    }
  };

  const handleResetForm = () => {
    if (confirm("Apakah Anda yakin ingin menghapus draft yang sedang diketik dan mengulang dari awal?")) {
      clearAutoSaveDraft();
      setFormData({
        code: "",
        tanggalPembuatan: "",
        tanggalRevisi: "",
        tanggalEfektif: "",
        title: "",
        department: "",
        responsiblePerson: "",
        dasarHukum: "",
        kualifikasiPelaksana: "",
        keterkaitan: "",
        peralatanPerlengkapan: "",
        peringatan: "",
        pencatatanPendataan: "",
        maksud: "",
        tujuan: "",
        description: "",
        effectiveDate: "",
        expiryDate: "",
        instansi: "",
        kepalaInstansi: "",
        subBagian: "",
        jabatanPengesah: "",
        namaPengesah: "",
        nipPengesah: "",
      });
      setFlowchartSteps([{
        no: 1,
        aktivitas: "",
        pelaksana: Object.fromEntries(pelaksanaColumns.map(col => [col, false])),
        mutuBaku: { persyaratan: "", output: "", waktu: "" },
        keterangan: "",
        shapes: Object.fromEntries(pelaksanaColumns.map(col => [col, "auto"])),
      }]);
      toast.success("Draft form berhasil direset ke awal.");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ===== PELAKSANA COLUMN MANAGEMENT =====
  const addPelaksanaColumn = () => {
    if (!newPelaksanaName.trim()) {
      toast.error("Nama pelaksana tidak boleh kosong!");
      return;
    }
    
    if (pelaksanaColumns.includes(newPelaksanaName.trim())) {
      toast.error("Nama pelaksana sudah ada!");
      return;
    }

    const newColumn = newPelaksanaName.trim();
    setPelaksanaColumns([...pelaksanaColumns, newColumn]);

    // Update all existing steps
    setFlowchartSteps(
      flowchartSteps.map((step) => ({
        ...step,
        pelaksana: {
          ...step.pelaksana,
          [newColumn]: false,
        },
      }))
    );

    setNewPelaksanaName("");
    toast.success("Kolom pelaksana berhasil ditambahkan!");
  };

  const removePelaksanaColumn = (columnName: string) => {
    if (pelaksanaColumns.length <= 1) {
      toast.error("Minimal harus ada 1 kolom pelaksana!");
      return;
    }

    setPelaksanaColumns(pelaksanaColumns.filter((col) => col !== columnName));

    // Remove from all steps
    setFlowchartSteps(
      flowchartSteps.map((step) => {
        const { [columnName]: removed, ...rest } = step.pelaksana;
        return {
          ...step,
          pelaksana: rest,
        };
      })
    );

    toast.success("Kolom pelaksana berhasil dihapus!");
  };

  // ===== FLOWCHART STEP MANAGEMENT =====
  const addFlowchartStep = () => {
    const pelaksanaObj: { [key: string]: boolean } = {};
    pelaksanaColumns.forEach((col) => {
      pelaksanaObj[col] = false;
    });

    setFlowchartSteps([
      ...flowchartSteps,
      {
        no: flowchartSteps.length + 1,
        aktivitas: "",
        pelaksana: pelaksanaObj,
        mutuBaku: {
          persyaratan: "",
          output: "",
          waktu: "",
        },
        keterangan: "",
        shapes: {},
      },
    ]);
  };

  const removeFlowchartStep = (index: number) => {
    if (flowchartSteps.length <= 1) {
      toast.error("Minimal harus ada 1 langkah!");
      return;
    }

    const updated = flowchartSteps.filter((_, i) => i !== index);
    updated.forEach((step, i) => {
      step.no = i + 1;
    });
    setFlowchartSteps(updated);
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const updated = [...flowchartSteps];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    updated.forEach((step, i) => {
      step.no = i + 1;
    });
    setFlowchartSteps(updated);
  };

  const moveStepDown = (index: number) => {
    if (index === flowchartSteps.length - 1) return;
    const updated = [...flowchartSteps];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((step, i) => {
      step.no = i + 1;
    });
    setFlowchartSteps(updated);
  };

  const updateFlowchartStep = (index: number, field: string, value: any) => {
    setFlowchartSteps((prevSteps) => {
      return prevSteps.map((step, i) => {
        if (i !== index) return step;

        const updatedStep = {
          ...step,
          pelaksana: { ...step.pelaksana },
          shapes: { ...(step.shapes || {}) },
          connections: { ...(step.connections || {}) },
          executorRoutes: { ...(step.executorRoutes || {}) },
          shapeText: typeof step.shapeText === 'object' && step.shapeText !== null ? { ...step.shapeText } : step.shapeText,
          mutuBaku: { ...step.mutuBaku },
        };

        if (field.startsWith("pelaksana.")) {
          const pelaksanaKey = field.split(".")[1];
          updatedStep.pelaksana[pelaksanaKey] = value;
          if (value) {
            if (!updatedStep.shapes[pelaksanaKey]) {
              updatedStep.shapes[pelaksanaKey] = index === 0 || index === prevSteps.length - 1 ? "terminator" : "process";
            }
            if (!updatedStep.connections[pelaksanaKey] || updatedStep.connections[pelaksanaKey].length === 0) {
              const defTarget = index + 2 <= prevSteps.length ? index + 2 : 0;
              updatedStep.connections[pelaksanaKey] = [{ targetStep: defTarget }];
            }
          }
        } else if (field.startsWith("shapes.")) {
          const pelaksanaKey = field.split(".")[1];
          updatedStep.shapes[pelaksanaKey] = value;
        } else if (field.startsWith("connections.")) {
          const pelaksanaKey = field.split(".")[1];
          updatedStep.connections[pelaksanaKey] = value;
          // Sinkronkan juga executorRoutes secara atomik agar tidak saling menimpa
          if (Array.isArray(value) && value.length > 0) {
            updatedStep.executorRoutes[pelaksanaKey] = {
              targetStep: value[0].targetStep,
              targetPelaksana: value[0].targetPelaksana,
              returnStep: value[1]?.targetStep,
              returnPelaksana: value[1]?.targetPelaksana,
            };
          }
        } else if (field.startsWith("executorRoutes.")) {
          const pelaksanaKey = field.split(".")[1];
          updatedStep.executorRoutes[pelaksanaKey] = value;
        } else if (field.startsWith("shapeText.")) {
          const pelaksanaKey = field.split(".")[1];
          if (typeof updatedStep.shapeText !== 'object' || updatedStep.shapeText === null) {
            updatedStep.shapeText = {};
          }
          (updatedStep.shapeText as any)[pelaksanaKey] = value;
        } else if (field.startsWith("mutuBaku.")) {
          const mutuBakuKey = field.split(".")[1] as keyof typeof updatedStep.mutuBaku;
          updatedStep.mutuBaku[mutuBakuKey] = value;
        } else {
          (updatedStep as any)[field] = value;
        }

        return updatedStep;
      });
    });
  };

  const autoOptimizeFlowchart = () => {
    const total = flowchartSteps.length;
    const optimized = flowchartSteps.map((step, idx) => {
      const akt = (step.aktivitas || "").toLowerCase();
      let defaultShape = "rectangle";
      let defaultLabel = "Proses";

      if (idx === 0) {
        defaultShape = "oval";
        defaultLabel = "Mulai";
      } else if (idx === total - 1) {
        defaultShape = "oval";
        defaultLabel = "Selesai";
      } else if (akt.includes("cek") || akt.includes("validasi") || akt.includes("verifikasi") || akt.includes("setuju")) {
        defaultShape = "diamond";
        defaultLabel = "Validasi";
      } else if (akt.includes("laporan") || akt.includes("berkas") || akt.includes("dokumen") || akt.includes("surat")) {
        defaultShape = "document";
        defaultLabel = "Dokumen";
      } else if (akt.includes("simpan") || akt.includes("arsip") || akt.includes("database")) {
        defaultShape = "database";
        defaultLabel = "Simpan";
      }

      const activePels = Object.keys(step.pelaksana).filter(k => !!step.pelaksana[k]);
      const newPelaksana = { ...step.pelaksana };
      const newShapes = { ...step.shapes };
      const newShapeText = typeof step.shapeText === 'object' && step.shapeText ? { ...step.shapeText } : {};

      if (activePels.length === 0 && pelaksanaColumns.length > 0) {
        newPelaksana[pelaksanaColumns[0]] = true;
        newShapes[pelaksanaColumns[0]] = defaultShape;
        newShapeText[pelaksanaColumns[0]] = defaultLabel;
      } else {
        activePels.forEach(p => {
          if (!newShapes[p] || newShapes[p] === "auto") newShapes[p] = defaultShape;
          if (!newShapeText[p]) newShapeText[p] = defaultLabel;
        });
      }

      return {
        ...step,
        pelaksana: newPelaksana,
        shapes: newShapes,
        shapeText: newShapeText,
      };
    });

    setFlowchartSteps(optimized);
    toast.success("✨ Alur flowchart dan label simbol berhasil dirapikan sesuai standar BPS!");
  };

  // ===== AI & SAVE HANDLERS =====
  const generateAISuggestion = async () => {
    if (!formData.title) {
      toast.error("Masukkan judul SOP terlebih dahulu!");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/generate_sop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.title }),
      });
      if (!response.ok) throw new Error("Gagal ambil dari backend");
      const data = await response.json();
      setAiSuggestion(data.steps || "Tidak ada hasil AI.");
    } catch (err) {
      console.error(err);
      toast.error("Gagal terhubung ke backend. Pastikan FastAPI aktif!");
    } finally {
      setIsGenerating(false);
    }
  };

  const useAISuggestion = () => {
    setFormData((prev) => ({ ...prev, description: aiSuggestion }));
    setAiSuggestion("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('File harus berformat PDF');
        return;
      }
      setUploadedFile(selectedFile);
      toast.success(`File ${selectedFile.name} berhasil dipilih`);
    }
  };

  const handleUploadInputChange = (field: string, value: string) => {
    setUploadFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadSubmit = async (isDraft: boolean = true) => {
    if (!uploadedFile) {
      toast.error("Pilih file PDF terlebih dahulu!");
      return;
    }

    if (!uploadFormData.title || !uploadFormData.department) {
      toast.error("Judul SOP dan Tim harus diisi!");
      return;
    }

    setIsSaving(true);

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Silakan login terlebih dahulu!");
        setIsSaving(false);
        return;
      }

      // Convert PDF to base64
      const base64Pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      const sopData = {
        code: (uploadFormData.code && uploadFormData.code.trim()) || `SOP-${Date.now()}`,
        title: uploadFormData.title.trim(),
        description: (uploadFormData.description && uploadFormData.description.trim()) || "-",
        department: (uploadFormData.department && uploadFormData.department.trim()) || currentUser?.department || "Umum",
        responsible_person: (uploadFormData.responsiblePerson && uploadFormData.responsiblePerson.trim()) || currentUser?.fullName || (currentUser as any)?.full_name || "Penanggung Jawab",
        status: isDraft ? "draft" : "aktif",
        effective_date: uploadFormData.effectiveDate || new Date().toISOString().split('T')[0],
        expiry_date: uploadFormData.expiryDate || null,
        file_base64: base64Pdf,
        is_manual: true,
      };

      const response = await fetch(`${API_URL}/sops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(sopData),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          errorData = JSON.parse(text);
        } catch {
          errorData = { detail: `Server error (${response.status}: ${response.statusText})` };
        }
        
        if (response.status === 401 || errorData.detail?.includes("Could not validate credentials")) {
          AuthService.logout();
          toast.error("Sesi login Anda telah berakhir. Silakan login kembali.");
          window.location.href = "/login";
          return;
        }

        // Tampilkan error spesifik
        if (errorData.detail?.includes("already exists") || errorData.detail?.includes("Duplicate entry")) {
          throw new Error("Kode SOP sudah ada, gunakan kode lain!");
        }
        
        let errMsg = errorData.detail || "Failed to create SOP";
        if (errMsg === "Validation error" || errMsg.toLowerCase().includes("validation error")) {
          errMsg = "Validasi data gagal. Pastikan Kode SOP unik dan seluruh kolom wajib terisi.";
        }
        throw new Error(errMsg);
      }

      clearAutoSaveDraft();
      toast.success(`✅ SOP berhasil ${isDraft ? 'disimpan sebagai draft' : 'dipublikasikan'}!`);
      notifyRealtimeUpdate("sop_created");
      setShowSuccess(true);

      // Reset form
      setTimeout(() => {
        setUploadFormData({
          code: "",
          title: "",
          department: "",
          responsiblePerson: "",
          effectiveDate: "",
          expiryDate: "",
          description: "",
          status: "draft"
        });
        setUploadedFile(null);
        setShowSuccess(false);
        
        const fileInput = document.getElementById('pdf-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }, 2000);

    } catch (error: any) {
      console.error("❌ Error uploading SOP:", error);
      toast.error(`Gagal upload SOP: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (isDraft: boolean = true) => {
    setIsSaving(true);

    try {
      // 1. Validasi user login
      const token = getAuthToken();
      if (!token) {
        toast.error("Silakan login terlebih dahulu!");
        setIsSaving(false);
        return;
      }

      // 2. Validasi form
      if (!formData.title || !formData.department) {
        toast.error("Judul SOP dan Tim harus diisi!");
        setIsSaving(false);
        return;
      }

      console.log("🔄 Generating PDF...");

      // 3. Generate PDF
      const pdfBytes = await generateSOPPdf({
        nomor: formData.code || `SOP-${Date.now()}`,
        namaSop: formData.title,
        tanggalPembuatan: formatDate(formData.tanggalPembuatan),
        tanggalRevisi: formatDate(formData.tanggalRevisi),
        tanggalEfektif: formatDate(formData.tanggalEfektif),
        dasarHukum: formData.dasarHukum,
        kualifikasiPelaksana: formData.kualifikasiPelaksana,
        keterkaitan: formData.keterkaitan,
        peralatanPerlengkapan: formData.peralatanPerlengkapan,
        peringatan: formData.peringatan,
        pencatatanPendataan: formData.pencatatanPendataan,
        maksud: formData.maksud,
        tujuan: formData.tujuan,
        flowchartSteps: flowchartSteps,
        pelaksanaColumns: pelaksanaColumns,
        customShapeImages: customShapeImages,
        kopConfig: {
          instansi: formData.instansi,
          kepalaInstansi: formData.kepalaInstansi,
          subBagian: formData.subBagian,
          jabatanPengesah: formData.jabatanPengesah,
          namaPengesah: formData.namaPengesah,
          nipPengesah: formData.nipPengesah,
          stempelImage: stempelImage || undefined,
          ttdImage: ttdImage || undefined,
        },
      });

      console.log("📄 PDF generated:", pdfBytes.length, "bytes");

      // 4. Convert PDF to base64 (lebih mudah untuk database)
      const base64Pdf = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // 5. Prepare JSON data (BUKAN FormData)
      const sopData = {
        code: (formData.code && formData.code.trim()) || `SOP-${Date.now()}`,
        title: formData.title.trim(),
        description: (formData.description && formData.description.trim()) || "-",
        department: (formData.department && formData.department.trim()) || currentUser?.department || "Umum",
        responsible_person: (formData.responsiblePerson && formData.responsiblePerson.trim()) || currentUser?.fullName || (currentUser as any)?.full_name || "Penanggung Jawab",
        status: isDraft ? "draft" : "aktif",
        effective_date: formData.effectiveDate || new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate || null,
        file_base64: base64Pdf, // ✅ Kirim sebagai base64
        is_manual: false,
        // Data tambahan untuk COP
        tanggal_pembuatan: formData.tanggalPembuatan || null,
        tanggal_revisi: formData.tanggalRevisi || null,
        tanggal_efektif: formData.tanggalEfektif || null,
        dasar_hukum: formData.dasarHukum || null,
        kualifikasi_pelaksana: formData.kualifikasiPelaksana || null,
        keterkaitan: formData.keterkaitan || null,
        peralatan_perlengkapan: formData.peralatanPerlengkapan || null,
        peringatan: formData.peringatan || null,
        pencatatan_pendataan: formData.pencatatanPendataan || null,
        maksud: formData.maksud || null,
        tujuan: formData.tujuan || null,
        flowchart_steps: JSON.stringify({
          steps: flowchartSteps,
          kopConfig: {
            instansi: formData.instansi,
            kepalaInstansi: formData.kepalaInstansi,
            subBagian: formData.subBagian,
            jabatanPengesah: formData.jabatanPengesah,
            namaPengesah: formData.namaPengesah,
            nipPengesah: formData.nipPengesah,
            stempelImage: stempelImage || undefined,
            ttdImage: ttdImage || undefined,
          }
        }), // ✅ Simpan langkah dan kopConfig
        pelaksana_columns: JSON.stringify(pelaksanaColumns), // ✅ Convert ke JSON string
      };

      console.log("📤 Uploading to backend...");

      // 6. Send to backend
      const response = await fetch(`${API_URL}/sops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(sopData),
      });

      let result: any = null;
      let text = "";
      try {
        text = await response.text();
        result = JSON.parse(text);
      } catch {
        result = null;
      }

      if (!response.ok) {
        if (text && text.trim().startsWith("<")) {
          throw new Error(`Server returned HTML instead of JSON (${response.status} ${response.statusText}). Pastikan backend server berjalan di port 8000.`);
        }
        let errorDetail = result?.detail || `Failed to create SOP (${response.status})`;
        if (response.status === 401 || errorDetail.includes("Could not validate credentials")) {
          AuthService.logout();
          toast.error("Sesi login Anda telah berakhir. Silakan login kembali.");
          window.location.href = "/login";
          return;
        }
        if (errorDetail.includes("already exists") || errorDetail.includes("Duplicate entry")) {
          throw new Error("Kode SOP sudah ada, gunakan kode lain!");
        }
        if (errorDetail === "Validation error" || errorDetail.toLowerCase().includes("validation error")) {
          errorDetail = "Validasi data gagal. Pastikan Kode SOP unik dan seluruh kolom wajib terisi.";
        }
        throw new Error(errorDetail);
      }

      console.log("✅ Upload successful:", result);

      clearAutoSaveDraft();
      setShowSuccess(true);
      toast.success(`✅ SOP berhasil ${isDraft ? 'disimpan sebagai draft' : 'dipublikasikan'}!`);
      notifyRealtimeUpdate("sop_created");

      // 7. Reset form after 2s
      setTimeout(() => {
        setFormData({
          code: "",
          tanggalPembuatan: "",
          tanggalRevisi: "",
          tanggalEfektif: "",
          title: "",
          department: "",
          responsiblePerson: "",
          dasarHukum: "",
          kualifikasiPelaksana: "",
          keterkaitan: "",
          peralatanPerlengkapan: "",
          peringatan: "",
          pencatatanPendataan: "",
          maksud: "",
          tujuan: "",
          description: "",
          effectiveDate: "",
          expiryDate: "",
        });
        setFlowchartSteps([{
          no: 1,
          aktivitas: "",
          pelaksana: Object.fromEntries(pelaksanaColumns.map(col => [col, false])),
          mutuBaku: { persyaratan: "", output: "", waktu: "" },
          keterangan: "",
        shapes: Object.fromEntries(pelaksanaColumns.map(col => [col, "auto"])),
        }]);
        setShowSuccess(false);
        
        // Optional: Navigate to SOP list
        // navigate('/sop-documents');
      }, 2000);

    } catch (error: any) {
      console.error("❌ Error saving SOP:", error);
      toast.error(`Gagal menyimpan SOP: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPDF = async () => {
    try {
      toast.info("🔄 Menghasilkan preview PDF Flowchart...");

      const pdfBytes: Uint8Array = await generateSOPPdf({
        nomor: formData.code || "TEST-001",
        namaSop: formData.title || "SOP",
        tanggalPembuatan: formatDate(formData.tanggalPembuatan) || formatDate(new Date().toISOString().split("T")[0]),
        tanggalRevisi: formatDate(formData.tanggalRevisi),
        tanggalEfektif: formatDate(formData.tanggalEfektif) || formatDate(new Date().toISOString().split("T")[0]),
        dasarHukum: formData.dasarHukum || "-",
        kualifikasiPelaksana: formData.kualifikasiPelaksana || "-",
        keterkaitan: formData.keterkaitan || "-",
        peralatanPerlengkapan: formData.peralatanPerlengkapan || "-",
        peringatan: formData.peringatan || "-",
        pencatatanPendataan: formData.pencatatanPendataan || "-",
        maksud: formData.maksud || "-",
        tujuan: formData.tujuan || "-",
        flowchartSteps: flowchartSteps,
        pelaksanaColumns: pelaksanaColumns,
        customShapeImages: customShapeImages,
        kopConfig: {
          instansi: formData.instansi,
          kepalaInstansi: formData.kepalaInstansi,
          subBagian: formData.subBagian,
          jabatanPengesah: formData.jabatanPengesah,
          namaPengesah: formData.namaPengesah,
          nipPengesah: formData.nipPengesah,
          stempelImage: stempelImage || undefined,
          ttdImage: ttdImage || undefined,
        },
      });

      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      toast.success("✅ Test PDF Flowchart berhasil dibuat!");
    } catch (err: any) {
      console.error("❌ PDF Error:", err);
      toast.error(`PDF Error: ${err.message}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      <Sidebar activeMenu="create" />

      <div className="ml-0 lg:ml-64 flex-1 min-w-0 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6">
          {/* Header - Keep existing */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Buat SOP Baru
                </h1>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-normal">
                  <Save className="h-3 w-3" /> Auto-Save Aktif
                </Badge>
              </div>
              <p className="text-gray-600">
                Buat dokumen SOP baru sesuai template BPS Kota Surabaya (draft tersimpan otomatis di browser)
              </p>
            </div>
            {(formData.title || formData.code || uploadFormData.title) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetForm}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs flex items-center gap-1.5 self-start md:self-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset / Ulang Form
              </Button>
            )}
          </div>

          {showSuccess && (
            <Alert className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
              <AlertDescription className="text-green-800 font-medium">
                ✨ SOP berhasil disimpan! Data telah ditambahkan ke sistem.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF dari Form
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF Manual
              </TabsTrigger>
            </TabsList>

            {/* ===== TAB GENERATE PDF ===== */}
            <TabsContent value="generate">
              <div className="space-y-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* ===== CARD 1: INFORMASI HEADER COP ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-blue-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Informasi Header COP
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                          <Label htmlFor="code" className="text-sm font-medium text-gray-700">Nomor SOP</Label>
                          <Input
                            id="code"
                            placeholder="Contoh: SOP/001/2025"
                            value={formData.code}
                            onChange={(e) => handleInputChange("code", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="tanggalPembuatan" className="text-sm font-medium text-gray-700">Tanggal Pembuatan</Label>
                          <Input
                            id="tanggalPembuatan"
                            type="date"
                            value={formData.tanggalPembuatan}
                            onChange={(e) => handleInputChange("tanggalPembuatan", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="tanggalRevisi" className="text-sm font-medium text-gray-700">Tanggal Revisi</Label>
                          <Input
                            id="tanggalRevisi"
                            type="date"
                            value={formData.tanggalRevisi}
                            onChange={(e) => handleInputChange("tanggalRevisi", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="tanggalEfektif" className="text-sm font-medium text-gray-700">Tanggal Efektif</Label>
                          <Input
                            id="tanggalEfektif"
                            type="date"
                            value={formData.tanggalEfektif}
                            onChange={(e) => handleInputChange("tanggalEfektif", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>
                      </div>

                      <div className="pt-1">
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700">Nama SOP</Label>
                        <Input
                          id="title"
                          placeholder="Masukkan nama/judul SOP"
                          value={formData.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          className="mt-1.5 h-10"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD KOP & PENGESAHAN DOKUMEN (OPSIONAL) ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-blue-200">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Kustomisasi Teks KOP & Pengesahan (Opsional)
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            Secara default mengikuti template resmi BPS Kota Surabaya & Dr. Arrief Chandra Setiawan. Isi jika ingin mengubah teks instansi, pejabat, atau mengganti stempel & tanda tangan.
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[11px] self-start sm:self-auto bg-blue-50 text-blue-700 border-blue-200">
                          Template Default Aktif
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50/70 border border-gray-100">
                        {/* Kolom Kiri: KOP Instansi */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 pb-1 border-b border-gray-200">
                            🏢 KOP Surat (Kiri Atas PDF)
                          </h4>
                          <div>
                            <Label htmlFor="instansi" className="text-xs font-medium text-gray-700">Nama Instansi</Label>
                            <Input
                              id="instansi"
                              placeholder="Badan Pusat Statistik Kota Surabaya"
                              value={formData.instansi || ""}
                              onChange={(e) => handleInputChange("instansi", e.target.value)}
                              className="mt-1 h-9 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memakai teks bawaan template</p>
                          </div>
                          <div>
                            <Label htmlFor="kepalaInstansi" className="text-xs font-medium text-gray-700">Kepala Instansi</Label>
                            <Input
                              id="kepalaInstansi"
                              placeholder="Kepala Badan Pusat Statistik Kota Surabaya"
                              value={formData.kepalaInstansi || ""}
                              onChange={(e) => handleInputChange("kepalaInstansi", e.target.value)}
                              className="mt-1 h-9 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memakai teks bawaan template</p>
                          </div>
                          <div>
                            <Label htmlFor="subBagian" className="text-xs font-medium text-gray-700">Kepala Sub. Bagian / Satuan Kerja</Label>
                            <Input
                              id="subBagian"
                              placeholder="Kepala Sub. Bagian Tata Usaha"
                              value={formData.subBagian || ""}
                              onChange={(e) => handleInputChange("subBagian", e.target.value)}
                              className="mt-1 h-9 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memakai teks bawaan template</p>
                          </div>
                        </div>

                        {/* Kolom Kanan: Pengesahan */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 pb-1 border-b border-gray-200">
                            ✍️ Pengesahan Dokumen (Kanan Atas PDF)
                          </h4>
                          <div>
                            <Label htmlFor="jabatanPengesah" className="text-xs font-medium text-gray-700">Jabatan Pengesah</Label>
                            <Input
                              id="jabatanPengesah"
                              placeholder="Kepala BPS Kota Surabaya"
                              value={formData.jabatanPengesah || ""}
                              onChange={(e) => handleInputChange("jabatanPengesah", e.target.value)}
                              className="mt-1 h-9 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memakai teks bawaan template</p>
                          </div>
                          <div>
                            <Label htmlFor="namaPengesah" className="text-xs font-medium text-gray-700">Nama Pejabat Penandatangan</Label>
                            <Input
                              id="namaPengesah"
                              placeholder="Dr. Arrief Chandra Setiawan, SST., M.Si."
                              value={formData.namaPengesah || ""}
                              onChange={(e) => handleInputChange("namaPengesah", e.target.value)}
                              className="mt-1 h-9 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memakai nama pejabat bawaan template</p>
                          </div>
                          <div>
                            <Label htmlFor="nipPengesah" className="text-xs font-medium text-gray-700">NIP Pejabat</Label>
                            <Input
                              id="nipPengesah"
                              placeholder="NIP. 196508161992031001"
                              value={formData.nipPengesah || ""}
                              onChange={(e) => handleInputChange("nipPengesah", e.target.value)}
                              className="mt-1 h-9 text-sm"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memakai NIP bawaan template</p>
                          </div>
                        </div>
                      </div>

                      {/* Baris Bawah: Upload Stempel & Tanda Tangan */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                        {/* Upload Stempel */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                              <Stamp className="h-4 w-4 text-blue-600" />
                              Upload Stempel Baru (Opsional)
                            </Label>
                            {stempelImage && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStempelImage(null)}
                                className="h-6 text-xs text-red-600 hover:text-red-700 px-1.5"
                              >
                                Reset ke Default
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Disarankan format <strong>PNG transparan</strong> agar stempel bertumpuk rapi di dokumen.
                          </p>
                          <div className="flex items-center gap-3">
                            <Input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={handleStempelUpload}
                              className="text-xs h-9 cursor-pointer file:cursor-pointer"
                            />
                            {stempelImage && (
                              <div className="h-10 w-10 flex-shrink-0 border rounded bg-white p-1 flex items-center justify-center shadow-sm">
                                <img src={stempelImage} alt="Stempel Preview" className="max-h-full max-w-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Upload Tanda Tangan */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                              <FileSignature className="h-4 w-4 text-purple-600" />
                              Upload Tanda Tangan Baru (Opsional)
                            </Label>
                            {ttdImage && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setTtdImage(null)}
                                className="h-6 text-xs text-red-600 hover:text-red-700 px-1.5"
                              >
                                Reset ke Default
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Disarankan format <strong>PNG transparan</strong> tanpa latar putih untuk posisi tanda tangan presisi.
                          </p>
                          <div className="flex items-center gap-3">
                            <Input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={handleTtdUpload}
                              className="text-xs h-9 cursor-pointer file:cursor-pointer"
                            />
                            {ttdImage && (
                              <div className="h-10 w-10 flex-shrink-0 border rounded bg-white p-1 flex items-center justify-center shadow-sm">
                                <img src={ttdImage} alt="TTD Preview" className="max-h-full max-w-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD 2: INFORMASI TAMBAHAN ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-indigo-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Informasi Tambahan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        <div>
                          <Label htmlFor="department" className="text-sm font-medium text-gray-700">Tim</Label>
                          <Select
                            value={formData.department}
                            onValueChange={(value) => handleInputChange("department", value)}
                          >
                            <SelectTrigger className="mt-1.5 h-10">
                              <SelectValue placeholder="Pilih Tim/Department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {dept}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="responsiblePerson" className="text-sm font-medium text-gray-700">Penanggung Jawab</Label>
                          <Input
                            id="responsiblePerson"
                            placeholder="Nama penanggung jawab..."
                            value={formData.responsiblePerson}
                            onChange={(e) => handleInputChange("responsiblePerson", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="effectiveDate" className="text-sm font-medium text-gray-700">Tanggal Berlaku</Label>
                          <Input
                            id="effectiveDate"
                            type="date"
                            value={formData.effectiveDate}
                            onChange={(e) => handleInputChange("effectiveDate", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD 3: DETAIL INFORMASI COP ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-purple-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Detail Informasi COP
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1 */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="dasarHukum" className="text-sm font-medium text-gray-700">Dasar Hukum</Label>
                            <Textarea
                              id="dasarHukum"
                              rows={3}
                              placeholder="Masukkan dasar hukum..."
                              value={formData.dasarHukum}
                              onChange={(e) => handleInputChange("dasarHukum", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="keterkaitan" className="text-sm font-medium text-gray-700">Keterkaitan</Label>
                            <Textarea
                              id="keterkaitan"
                              rows={3}
                              placeholder="Masukkan keterkaitan dengan SOP lain..."
                              value={formData.keterkaitan}
                              onChange={(e) => handleInputChange("keterkaitan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="peringatan" className="text-sm font-medium text-gray-700">Peringatan</Label>
                            <Textarea
                              id="peringatan"
                              rows={3}
                              placeholder="Masukkan peringatan penting..."
                              value={formData.peringatan}
                              onChange={(e) => handleInputChange("peringatan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="kualifikasiPelaksana" className="text-sm font-medium text-gray-700">Kualifikasi Pelaksana</Label>
                            <Textarea
                              id="kualifikasiPelaksana"
                              rows={3}
                              placeholder="Masukkan kualifikasi pelaksana..."
                              value={formData.kualifikasiPelaksana}
                              onChange={(e) => handleInputChange("kualifikasiPelaksana", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="peralatanPerlengkapan" className="text-sm font-medium text-gray-700">Peralatan/Perlengkapan</Label>
                            <Textarea
                              id="peralatanPerlengkapan"
                              rows={3}
                              placeholder="Masukkan peralatan yang diperlukan..."
                              value={formData.peralatanPerlengkapan}
                              onChange={(e) => handleInputChange("peralatanPerlengkapan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="pencatatanPendataan" className="text-sm font-medium text-gray-700">Pencatatan & Pendataan</Label>
                            <Textarea
                              id="pencatatanPendataan"
                              rows={3}
                              placeholder="Masukkan pencatatan dan pendataan..."
                              value={formData.pencatatanPendataan}
                              onChange={(e) => handleInputChange("pencatatanPendataan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD 4: MAKSUD DAN TUJUAN ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-green-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Maksud dan Tujuan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="maksud" className="text-sm font-medium text-gray-700">Maksud</Label>
                        <Textarea
                          id="maksud"
                          rows={3}
                          placeholder="Jelaskan maksud dari SOP ini..."
                          value={formData.maksud}
                          onChange={(e) => handleInputChange("maksud", e.target.value)}
                          className="mt-1.5 resize-none text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tujuan" className="text-sm font-medium text-gray-700">Tujuan</Label>
                        <Textarea
                          id="tujuan"
                          rows={3}
                          placeholder="Jelaskan tujuan dari SOP ini..."
                          value={formData.tujuan}
                          onChange={(e) => handleInputChange("tujuan", e.target.value)}
                          className="mt-1.5 resize-none text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* FLOWCHART SECTION */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            <Workflow className="h-5 w-5 text-blue-600" />
                            Flowchart & Mutu Baku
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            Pilih bentuk simbol dan ketikkan teks singkat di dalam simbol flowchart
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={autoOptimizeFlowchart}
                            className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs flex items-center gap-1.5"
                            title="Otomatis rapikan simbol Mulai, Proses, Validasi, dan Selesai"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Rapikan Alur Otomatis
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFlowchart(!showFlowchart)}
                          >
                            {showFlowchart ? "Sembunyikan" : "Tampilkan"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {showFlowchart && (
                      <CardContent className="space-y-6">
                        {/* Manage Pelaksana Columns */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <Label className="font-semibold mb-2 block">Kelola Kolom Pelaksana</Label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {pelaksanaColumns.map((col) => (
                              <Badge key={col} variant="secondary" className="gap-1">
                                {col}
                                <button
                                  onClick={() => removePelaksanaColumn(col)}
                                  className="ml-1 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nama kolom pelaksana baru..."
                              value={newPelaksanaName}
                              onChange={(e) => setNewPelaksanaName(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && addPelaksanaColumn()}
                            />
                            <Button size="sm" onClick={addPelaksanaColumn}>
                              <Plus className="h-4 w-4 mr-1" /> Tambah
                            </Button>
                          </div>
                        </div>

                        {/* Flowchart Steps */}
                        <div className="space-y-4">
                          {flowchartSteps.map((step, index) => (
                            <Card key={index} className="border-2">
                              <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-4">
                                  <Badge variant="outline">Langkah {step.no}</Badge>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveStepUp(index)}
                                      disabled={index === 0}
                                    >
                                      <MoveUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveStepDown(index)}
                                      disabled={index === flowchartSteps.length - 1}
                                    >
                                      <MoveDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFlowchartStep(index)}
                                      className="text-red-600"
                                      disabled={flowchartSteps.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-4">
                                  {/* Aktivitas */}
                                  <div>
                                    <Label className="text-xs font-semibold">Aktivitas</Label>
                                    <Textarea
                                      rows={2}
                                      placeholder="Deskripsi aktivitas..."
                                      value={step.aktivitas}
                                      onChange={(e) =>
                                        updateFlowchartStep(index, "aktivitas", e.target.value)
                                      }
                                    />
                                  </div>

                                  {/* Pelaksana (Dynamic Checkboxes) with per-executor shapes */}
                                  <div>
                                    <Label className="text-xs font-semibold">Pelaksana & Bentuk Simbol</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                                      {pelaksanaColumns.map((pel) => (
                                        <div key={pel} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50/50">
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              id={`step-${index}-pel-${pel}`}
                                              checked={step.pelaksana[pel] || false}
                                              onChange={(e) =>
                                                updateFlowchartStep(
                                                  index,
                                                  `pelaksana.${pel}`,
                                                  e.target.checked
                                                )
                                              }
                                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <Label
                                              htmlFor={`step-${index}-pel-${pel}`}
                                              className="text-xs font-medium cursor-pointer"
                                            >
                                              {pel}
                                            </Label>
                                          </div>
                                          
                                          {step.pelaksana[pel] && (
                                            <div className="mt-2 pl-6">
                                              <FlowchartSymbolPicker
                                                currentSymbol={step.shapes[pel] || (index === 0 || index === flowchartSteps.length - 1 ? "terminator" : "process")}
                                                onSymbolChange={(newSymbol) => updateFlowchartStep(index, `shapes.${pel}`, newSymbol)}
                                                executorName={pel}
                                                stepIndex={index}
                                                totalSteps={flowchartSteps.length}
                                                connections={step.connections?.[pel]}
                                                onConnectionsChange={(newConns) => updateFlowchartStep(index, `connections.${pel}`, newConns)}
                                                routeData={step.executorRoutes?.[pel]}
                                                onRouteChange={(newRoute) => updateFlowchartStep(index, `executorRoutes.${pel}`, newRoute)}
                                                allColumns={pelaksanaColumns}
                                                allSteps={flowchartSteps}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Custom image upload shown only when "custom" is selected for any pelaksana */}
                                  {Object.values(step.shapes).includes("custom") && (
                                    <div className="mt-2 flex flex-col gap-1">
                                      <Label className="text-xs text-gray-500">Upload gambar bentuk (PNG/JPG):</Label>
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        className="text-xs"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const buf = await file.arrayBuffer();
                                          setCustomShapeImages(prev => ({ ...prev, [index]: new Uint8Array(buf) }));
                                          toast.success(`Gambar "${file.name}" berhasil dimuat untuk langkah ${index + 1}!`);
                                        }}
                                      />
                                      {customShapeImages[index] && (
                                        <span className="text-xs text-green-600">✅ Gambar kustom dimuat</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Mutu Baku */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs font-semibold">
                                        Persyaratan/Kelengkapan
                                      </Label>
                                      <Input
                                        placeholder="Rincian Biaya..."
                                        value={step.mutuBaku.persyaratan}
                                        onChange={(e) =>
                                          updateFlowchartStep(
                                            index,
                                            "mutuBaku.persyaratan",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold">Output</Label>
                                      <Input
                                        placeholder="Database RKAKL..."
                                        value={step.mutuBaku.output}
                                        onChange={(e) =>
                                          updateFlowchartStep(index, "mutuBaku.output", e.target.value)
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold">Waktu</Label>
                                      <Input
                                        placeholder="5 menit..."
                                        value={step.mutuBaku.waktu}
                                        onChange={(e) =>
                                          updateFlowchartStep(index, "mutuBaku.waktu", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* Keterangan */}
                                  <div>
                                    <Label className="text-xs font-semibold">Keterangan</Label>
                                    <Input
                                      placeholder="Keterangan tambahan..."
                                      value={step.keterangan}
                                      onChange={(e) =>
                                        updateFlowchartStep(index, "keterangan", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {/* Live Preview Simulator */}
                          <FlowchartLivePreview steps={flowchartSteps} columns={pelaksanaColumns} />

                          <Button variant="outline" className="w-full" onClick={addFlowchartStep}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Langkah Baru
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Action Buttons */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-2xl overflow-visible">
                    <CardContent className="pt-6">
                      <div className="flex gap-3 flex-wrap">
                        <Button variant="outline" disabled={isSaving} onClick={() => handleSave(true)}>
                          <Save className="h-4 w-4 mr-1" />
                          Simpan Draft
                        </Button>
                        <Button
                          onClick={() => handleSave(false)}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                          {isSaving ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Publikasikan SOP
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleTestPDF}
                          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-medium"
                        >
                          <Eye className="h-4 w-4 mr-1.5" /> Test PDF Flowchart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ===== TAB UPLOAD PDF ===== */}
            <TabsContent value="upload">
              <Card className="bg-white/80 backdrop-blur-md shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    Upload PDF SOP Manual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <Label htmlFor="pdf-file-upload">File PDF *</Label>
                    <Input
                      id="pdf-file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="mt-1.5"
                    />
                    {uploadedFile && (
                      <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                        <CheckCircle className="h-4 w-4" />
                        {uploadedFile.name}
                      </div>
                    )}
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="upload-code">Kode SOP</Label>
                      <Input
                        id="upload-code"
                        placeholder="SOP/001/2025"
                        value={uploadFormData.code}
                        onChange={(e) => handleUploadInputChange("code", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="upload-title">Judul SOP *</Label>
                      <Input
                        id="upload-title"
                        placeholder="Nama SOP"
                        value={uploadFormData.title}
                        onChange={(e) => handleUploadInputChange("title", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="upload-department">Tim *</Label>
                      <Select
                        value={uploadFormData.department}
                        onValueChange={(value) => handleUploadInputChange("department", value)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Pilih Tim" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="upload-responsible">Penanggung Jawab</Label>
                      <Input
                        id="upload-responsible"
                        value={uploadFormData.responsiblePerson}
                        onChange={(e) => handleUploadInputChange("responsiblePerson", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="upload-effective">Tanggal Berlaku *</Label>
                      <Input
                        id="upload-effective"
                        type="date"
                        value={uploadFormData.effectiveDate}
                        onChange={(e) => handleUploadInputChange("effectiveDate", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="upload-expiry">Tanggal Kadaluarsa</Label>
                      <Input
                        id="upload-expiry"
                        type="date"
                        value={uploadFormData.expiryDate}
                        onChange={(e) => handleUploadInputChange("expiryDate", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="upload-description">Deskripsi</Label>
                    <Textarea
                      id="upload-description"
                      rows={4}
                      value={uploadFormData.description}
                      onChange={(e) => handleUploadInputChange("description", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" disabled={isSaving} onClick={() => handleUploadSubmit(true)}>
                      <Save className="h-4 w-4 mr-1" />
                      Simpan Draft
                    </Button>
                    <Button
                      onClick={() => handleUploadSubmit(false)}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publikasikan SOP
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <Footer />
      </div>
    </div>
  );
}