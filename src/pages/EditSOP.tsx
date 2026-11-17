// src/pages/EditSOP.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Save, Send, Workflow, FileText, Sparkles,
  Plus, Trash2, MoveUp, MoveDown, X, ArrowLeft, Upload, CheckCircle, RotateCcw, Eye, Maximize2,
  Building2, Stamp, FileSignature
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { toast } from "sonner";
import generateSOPPdf, { FlowchartStep } from "@/lib/pdfGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifyRealtimeUpdate } from "@/lib/realtime";
import { DEPARTMENTS } from "@/lib/departments";
import { FlowchartSymbolPicker, ExecutorRouteData, FlowchartConnection } from "@/components/sop/FlowchartSymbolPicker";
import { FlowchartSymbolIcon } from "@/lib/flowchartSymbols";
import axios from "axios";

// ✅ API Configuration
import { API_URL } from "@/lib/api";

// ✅ Helper function untuk get token
const getAuthToken = () => {
  const authData = localStorage.getItem('bps_sop_auth');
  if (!authData) return null;
  const user = JSON.parse(authData);
  return user.token || null;
};

// Helper function to format date from YYYY-MM-DD to DD Month YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

const formatDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split('T')[0];
};

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

export default function EditSOP() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const AUTOSAVE_EDIT_KEY = id ? `bps_sop_edit_autosave_${id}` : "bps_sop_edit_autosave";

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const serverDataRef = useRef<any>(null);

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
    status: "draft",
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

  const [pelaksanaColumns, setPelaksanaColumns] = useState<string[]>([
    "Kasubbag Tata Usaha",
    "Staff",
    "Bina Program BPS Provinsi",
  ]);
  const [newPelaksanaName, setNewPelaksanaName] = useState("");

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
      shapeText: {},
    },
  ]);

  const [customShapeImages, setCustomShapeImages] = useState<{ [key: number]: Uint8Array }>({});
  const [activeTab, setActiveTab] = useState("generate");

  // Pop-up Text Editor Modal State
  const [textEditorModal, setTextEditorModal] = useState<{
    open: boolean;
    stepIndex: number;
    field: string;
    label: string;
    value: string;
  }>({ open: false, stepIndex: -1, field: "", label: "", value: "" });

  const openTextEditor = (stepIndex: number, field: string, label: string) => {
    const step = flowchartSteps[stepIndex];
    let currentValue = "";
    if (field === "aktivitas") currentValue = step.aktivitas;
    else if (field === "keterangan") currentValue = step.keterangan;
    else if (field === "mutuBaku.persyaratan") currentValue = step.mutuBaku.persyaratan;
    else if (field === "mutuBaku.output") currentValue = step.mutuBaku.output;
    else if (field === "mutuBaku.waktu") currentValue = step.mutuBaku.waktu;
    else if (field.startsWith("shapeText.")) {
      const key = field.replace("shapeText.", "");
      currentValue = typeof step.shapeText === 'object' && step.shapeText ? (step.shapeText as any)[key] || "" : typeof step.shapeText === 'string' ? step.shapeText : "";
    }
    setTextEditorModal({ open: true, stepIndex, field, label, value: currentValue });
  };

  const saveTextEditor = () => {
    if (textEditorModal.stepIndex >= 0) {
      updateFlowchartStep(textEditorModal.stepIndex, textEditorModal.field, textEditorModal.value);
    }
    setTextEditorModal({ open: false, stepIndex: -1, field: "", label: "", value: "" });
  };

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
  const [isManual, setIsManual] = useState<boolean>(false);

  const departments = DEPARTMENTS;

  // ===== 1. FETCH SOP DATA DARI SERVER & RESTORE DRAFT =====
  useEffect(() => {
    fetchSOPData();
  }, [id]);

  const fetchSOPData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        toast.error("Sesi telah berakhir. Silakan login kembali.");
        navigate("/login");
        return;
      }

      const response = await axios.get(`${API_URL}/sops/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sop = response.data;
      console.log("✅ SOP data loaded for editing:", sop);

      const initialForm = {
        code: sop.code || "",
        tanggalPembuatan: formatDateForInput(sop.tanggal_pembuatan || sop.created_at),
        tanggalRevisi: formatDateForInput(sop.tanggal_revisi),
        tanggalEfektif: formatDateForInput(sop.tanggal_efektif || sop.effective_date),
        title: sop.title || "",
        department: sop.department || "",
        responsiblePerson: sop.responsible_person || "",
        dasarHukum: sop.dasar_hukum || "",
        kualifikasiPelaksana: sop.kualifikasi_pelaksana || "",
        keterkaitan: sop.keterkaitan || "",
        peralatanPerlengkapan: sop.peralatan_perlengkapan || "",
        peringatan: sop.peringatan || "",
        pencatatanPendataan: sop.pencatatan_pendataan || "",
        maksud: sop.maksud || "",
        tujuan: sop.tujuan || "",
        description: sop.description || "",
        effectiveDate: formatDateForInput(sop.effective_date),
        expiryDate: formatDateForInput(sop.expiry_date),
        status: sop.status || "draft",
        // KOP & Pengesahan Kustom (Opsional)
        instansi: "",
        kepalaInstansi: "",
        subBagian: "",
        jabatanPengesah: "",
        namaPengesah: "",
        nipPengesah: "",
      };

      setApprovalStatus(sop.approval_status || 'pending');

      // Ambil alasan penolakan dari revisi terakhir jika status rejected
      if (sop.approval_status === 'rejected' && Array.isArray(sop.revisions) && sop.revisions.length > 0) {
        const lastRejected = sop.revisions.find((r: any) => r.status === 'ditolak' || r.review_notes);
        if (lastRejected?.review_notes) {
          setRejectionReason(lastRejected.review_notes);
        }
      }

      const initialUploadForm = {
        code: sop.code || "",
        title: sop.title || "",
        department: sop.department || "",
        responsiblePerson: sop.responsible_person || "",
        effectiveDate: formatDateForInput(sop.effective_date),
        expiryDate: formatDateForInput(sop.expiry_date),
        description: sop.description || "",
        status: sop.status || "draft"
      };

      // Parse Pelaksana Columns
      let initialCols: string[] = ["Kasubbag Tata Usaha", "Staff", "Bina Program BPS Provinsi"];
      if (sop.pelaksana_columns) {
        try {
          let cols = sop.pelaksana_columns;
          if (typeof cols === 'string') { try { cols = JSON.parse(cols); } catch {} }
          if (typeof cols === 'string') { try { cols = JSON.parse(cols); } catch {} }
          if (Array.isArray(cols) && cols.length > 0) {
            initialCols = cols;
          }
        } catch (e) {
          console.error("Error parsing pelaksana columns:", e);
        }
      }

      // Parse Flowchart Steps & KOP Config
      let initialSteps: FlowchartStep[] = [];
      let loadedKopConfig: any = null;
      if (sop.flowchart_steps) {
        try {
          let steps = sop.flowchart_steps;
          if (typeof steps === 'string') { try { steps = JSON.parse(steps); } catch {} }
          if (typeof steps === 'string') { try { steps = JSON.parse(steps); } catch {} }
          if (steps && !Array.isArray(steps) && steps.steps) {
            loadedKopConfig = steps.kopConfig;
            steps = steps.steps;
          }
          if (Array.isArray(steps) && steps.length > 0) {
            initialSteps = steps.map((s: any, idx: number) => ({
              no: s.no || idx + 1,
              aktivitas: s.aktivitas || "",
              pelaksana: typeof s.pelaksana === 'object' && s.pelaksana !== null ? s.pelaksana : {},
              mutuBaku: {
                persyaratan: s.mutuBaku?.persyaratan || "",
                output: s.mutuBaku?.output || "",
                waktu: s.mutuBaku?.waktu || "",
              },
              keterangan: s.keterangan || "",
              shapes: typeof s.shapes === 'object' && s.shapes !== null ? s.shapes : {},
              shapeText: typeof s.shapeText === 'object' && s.shapeText !== null ? s.shapeText : (typeof s.shapeText === 'string' ? s.shapeText : {}),
              connections: typeof s.connections === 'object' && s.connections !== null ? s.connections : {},
              executorRoutes: typeof s.executorRoutes === 'object' && s.executorRoutes !== null ? s.executorRoutes : {},
              targetStep: s.targetStep,
              returnStep: s.returnStep,
            }));
          }
        } catch (e) {
          console.error("Error parsing flowchart steps:", e);
        }
      }

      if (loadedKopConfig) {
        if (loadedKopConfig.instansi) initialForm.instansi = loadedKopConfig.instansi;
        if (loadedKopConfig.kepalaInstansi) initialForm.kepalaInstansi = loadedKopConfig.kepalaInstansi;
        if (loadedKopConfig.subBagian) initialForm.subBagian = loadedKopConfig.subBagian;
        if (loadedKopConfig.jabatanPengesah) initialForm.jabatanPengesah = loadedKopConfig.jabatanPengesah;
        if (loadedKopConfig.namaPengesah) initialForm.namaPengesah = loadedKopConfig.namaPengesah;
        if (loadedKopConfig.nipPengesah) initialForm.nipPengesah = loadedKopConfig.nipPengesah;
        if (loadedKopConfig.stempelImage) setStempelImage(loadedKopConfig.stempelImage);
        if (loadedKopConfig.ttdImage) setTtdImage(loadedKopConfig.ttdImage);
      }

      if (initialSteps.length === 0) {
        const pObj: { [key: string]: boolean } = {};
        initialCols.forEach(c => { pObj[c] = false; });
        initialSteps = [{
          no: 1,
          aktivitas: "",
          pelaksana: pObj,
          mutuBaku: { persyaratan: "", output: "", waktu: "" },
          keterangan: "",
          shapes: {},
          shapeText: {},
        }];
      }

      // Simpan backup data asli server
      serverDataRef.current = {
        formData: { ...initialForm },
        uploadFormData: initialUploadForm,
        pelaksanaColumns: initialCols,
        flowchartSteps: initialSteps,
        stempelImage: loadedKopConfig?.stempelImage || null,
        ttdImage: loadedKopConfig?.ttdImage || null,
      };

      // Periksa apakah ada draft lokal Auto-Save yang lebih baru
      let usedDraft = false;
      try {
        const savedDraft = localStorage.getItem(AUTOSAVE_EDIT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.formData && (parsed.formData.title || parsed.formData.code)) {
            setFormData(parsed.formData);
            if (parsed.pelaksanaColumns && parsed.pelaksanaColumns.length > 0) {
              setPelaksanaColumns(parsed.pelaksanaColumns);
            } else {
              setPelaksanaColumns(initialCols);
            }
            if (parsed.flowchartSteps && parsed.flowchartSteps.length > 0) {
              setFlowchartSteps(parsed.flowchartSteps);
            } else {
              setFlowchartSteps(initialSteps);
            }
            if (parsed.uploadFormData) setUploadFormData(parsed.uploadFormData);
            if (parsed.activeTab) setActiveTab(parsed.activeTab);
            if (parsed.stempelImage) setStempelImage(parsed.stempelImage);
            if (parsed.ttdImage) setTtdImage(parsed.ttdImage);

            usedDraft = true;
            setDraftRestored(true);
            toast.info("✨ Draft perubahan lokal terakhir Anda dipulihkan otomatis!");
          }
        }
      } catch (e) {
        console.error("Error loading local draft:", e);
      }

      if (!usedDraft) {
        setFormData(initialForm);
        setUploadFormData(initialUploadForm);
        setPelaksanaColumns(initialCols);
        setFlowchartSteps(initialSteps);
      }

      const isManualDoc = sop.is_manual === 1 || sop.is_manual === true || (!sop.flowchart_steps && !!sop.file_url);
      setIsManual(isManualDoc);

      if (isManualDoc) {
        setActiveTab("upload");
      }

      setLoading(false);
    } catch (error: any) {
      console.error("❌ Error fetching SOP:", error);
      toast.error(error.response?.data?.detail || "Gagal memuat data SOP.");
      setLoading(false);
    }
  };

  // ===== 2. AUTO-SAVE SETIAP PERUBAHAN FORM =====
  useEffect(() => {
    if (loading) return;
    try {
      const hasContent = formData.title || formData.code || formData.department;
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
        localStorage.setItem(AUTOSAVE_EDIT_KEY, JSON.stringify(draft));
      }
    } catch (e) {
      console.error("Error auto-saving draft:", e);
    }
  }, [formData, pelaksanaColumns, flowchartSteps, uploadFormData, activeTab, loading, stempelImage, ttdImage]);

  const resetToOriginalServerData = () => {
    if (!serverDataRef.current) return;
    if (confirm("Kembalikan formulir ke data asli yang tersimpan di server? Seluruh perubahan lokal akan dibatalkan.")) {
      localStorage.removeItem(AUTOSAVE_EDIT_KEY);
      setFormData(serverDataRef.current.formData);
      setUploadFormData(serverDataRef.current.uploadFormData);
      setPelaksanaColumns(serverDataRef.current.pelaksanaColumns);
      setFlowchartSteps(serverDataRef.current.flowchartSteps);
      if (serverDataRef.current.stempelImage !== undefined) setStempelImage(serverDataRef.current.stempelImage);
      if (serverDataRef.current.ttdImage !== undefined) setTtdImage(serverDataRef.current.ttdImage);
      setDraftRestored(false);
      toast.success("Formulir berhasil direset ke data asli server!");
    }
  };

  // Smart Flowchart Optimizer
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

      // Pastikan ada setidaknya 1 pelaksana aktif
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
    toast.success(`Kolom "${newColumn}" berhasil ditambahkan!`);
  };

  const removePelaksanaColumn = (columnName: string) => {
    if (pelaksanaColumns.length <= 1) {
      toast.error("Minimal harus ada 1 kolom pelaksana!");
      return;
    }

    setPelaksanaColumns(pelaksanaColumns.filter((col) => col !== columnName));

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
        shapeText: {},
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
    toast.success("Langkah berhasil dihapus!");
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
            // Auto assign label if empty
            if (!updatedStep.shapeText || !((updatedStep.shapeText as any)[pelaksanaKey])) {
              const autoLabel = index === 0 ? "Mulai" : index === prevSteps.length - 1 ? "Selesai" : "Proses";
              if (typeof updatedStep.shapeText !== 'object' || updatedStep.shapeText === null) {
                updatedStep.shapeText = {};
              }
              (updatedStep.shapeText as any)[pelaksanaKey] = autoLabel;
            }
          }
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
        } else if (field.startsWith("shapes.")) {
          const pelaksanaKey = field.split(".")[1];
          updatedStep.shapes[pelaksanaKey] = value;
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

  const handleUploadSubmit = async (isDraft: boolean = true) => {
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

      let base64Pdf: string | undefined = undefined;
      if (uploadedFile) {
        base64Pdf = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(uploadedFile);
        });
      }

      const sopData: any = {
        code: uploadFormData.code || formData.code,
        title: uploadFormData.title,
        description: uploadFormData.description || "-",
        department: uploadFormData.department,
        responsible_person: uploadFormData.responsiblePerson || "-",
        status: isDraft ? "draft" : "aktif",
        effective_date: uploadFormData.effectiveDate || new Date().toISOString().split('T')[0],
        expiry_date: uploadFormData.expiryDate || null,
        is_manual: true,
      };

      if (base64Pdf) {
        sopData.file_base64 = base64Pdf;
      }

      const response = await fetch(`${API_URL}/sops/${id}`, {
        method: "PUT",
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
        throw new Error(errorData.detail || "Gagal mengupdate SOP");
      }

      localStorage.removeItem(AUTOSAVE_EDIT_KEY);
      const isHigher = currentUser?.role === 'admin' || currentUser?.role === 'kepala_bagian';

      // Jika SOP ini sebelumnya ditolak (rejected) atau bukan admin, otomatis ajukan revisi jika bukan draft
      if (!isHigher && (approvalStatus === 'rejected' || !isDraft)) {
        try {
          await fetch(`${API_URL}/sops/${id}/request-revision`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              revision_notes: "Pembaruan dokumen SOP (upload berkas baru)",
            }),
          });
          console.log("🔄 Otomatis mengajukan revisi ulang (request-revision) untuk upload manual");
        } catch (revErr) {
          console.warn("⚠️ Gagal auto request-revision:", revErr);
        }
      }

      toast.success(
        isHigher && !isDraft
          ? "✨ SOP berhasil diperbarui dan langsung disetujui (Admin Absolute)!"
          : `✅ SOP berhasil ${isDraft ? 'diperbarui sebagai draft' : 'diperbarui dan dipublikasikan'}!`
      );
      notifyRealtimeUpdate("sop_updated");
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/management");
      }, 1200);

    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal mengupdate SOP: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ===== SAVE HANDLER FOR BUILDER =====
  const handleSave = async (isDraft: boolean = true) => {
    try {
      setIsSaving(true);
      const token = getAuthToken();

      if (!token) {
        toast.error("Silakan login terlebih dahulu!");
        setIsSaving(false);
        return;
      }

      if (isManual) {
        toast.error("Dokumen upload manual tidak dapat diperbarui menggunakan form generator! Gunakan tab Ganti File PDF Manual.");
        setIsSaving(false);
        return;
      }

      if (!formData.title) {
        toast.error("Nama SOP harus diisi!");
        setIsSaving(false);
        return;
      }

      if (!formData.department) {
        toast.error("Tim Penanggung Jawab harus dipilih!");
        setIsSaving(false);
        return;
      }

      console.log("Generating updated clean PDF...");

      // Generate PDF with clean orthogonal swimlane layout
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

      const base64Pdf = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const sopData = {
        code: formData.code || `SOP-${Date.now()}`,
        title: formData.title,
        description: formData.description || "-",
        department: formData.department,
        responsible_person: formData.responsiblePerson || "-",
        status: isDraft ? "draft" : "aktif",
        effective_date: formData.effectiveDate || new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate || null,
        is_manual: false,
        file_base64: base64Pdf,
        tanggal_pembuatan: formData.tanggalPembuatan || null,
        tanggal_revisi: formData.tanggalRevisi || null,
        tanggal_efektif: formData.tanggalEfektif || null,
        dasarHukum: formData.dasarHukum || null,
        kualifikasiPelaksana: formData.kualifikasiPelaksana || null,
        keterkaitan: formData.keterkaitan || null,
        peralatanPerlengkapan: formData.peralatanPerlengkapan || null,
        peringatan: formData.peringatan || null,
        pencatatanPendataan: formData.pencatatanPendataan || null,
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
        }),
        pelaksana_columns: JSON.stringify(pelaksanaColumns),
      };

      console.log("📤 Sending update to backend...");

      const response = await fetch(`${API_URL}/sops/${id}`, {
        method: "PUT",
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
        const errorDetail = result?.detail || `Gagal mengupdate SOP (${response.status})`;
        if (response.status === 401 || errorDetail.includes("Could not validate credentials")) {
          AuthService.logout();
          toast.error("Sesi login Anda telah berakhir. Silakan login kembali.");
          window.location.href = "/login";
          return;
        }
        throw new Error(errorDetail);
      }

      // Hapus draft autosave lokal setelah berhasil simpan ke database
      localStorage.removeItem(AUTOSAVE_EDIT_KEY);

      // Jika SOP ini sebelumnya ditolak (rejected), otomatis kirimkan pengajuan revisi ulang HANYA untuk role staf/ketua tim
      const isHigherRole = currentUser?.role === 'admin' || currentUser?.role === 'kepala_bagian';
      if (!isHigherRole && (approvalStatus === 'rejected' || !isDraft)) {
        try {
          await fetch(`${API_URL}/sops/${id}/request-revision`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ revision_notes: "Memperbaiki SOP sesuai arahan dan mengajukan ulang" })
          });
        } catch (e) {
          console.warn("Auto request-revision trigger notice:", e);
        }
      }

      setShowSuccess(true);
      const successMsg = isHigherRole
        ? "✨ SOP berhasil diperbarui dan langsung disetujui (Admin Absolute)!"
        : approvalStatus === 'rejected'
        ? "✅ SOP berhasil diperbaiki dan diajukan ulang ke Kepala/Admin"
        : isDraft
        ? "✅ SOP berhasil diperbarui sebagai draft"
        : "✅ SOP berhasil diperbarui dan dipublikasikan";
      toast.success(successMsg);
      notifyRealtimeUpdate("sop_updated");

      setTimeout(() => {
        navigate("/management");
      }, 1200);

    } catch (error: any) {
      console.error("❌ Error updating SOP:", error);
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
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("✅ Test PDF Flowchart berhasil dibuat!");
    } catch (err) {
      console.error(err);
      toast.error("❌ Gagal generate test PDF!");
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
        <Sidebar activeMenu="management" />
        <div className="ml-0 lg:ml-64 flex-1 min-w-0 flex flex-col min-h-screen">
          <Header />
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Memuat data SOP untuk diedit...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Background dekoratif */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar Navigasi */}
      <Sidebar activeMenu="management" />

      {/* Main Content Area */}
      <div className="ml-0 lg:ml-64 flex-1 min-w-0 flex flex-col min-h-screen w-full lg:w-[calc(100vw-16rem)] max-w-full lg:max-w-[calc(100vw-16rem)]">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6 w-full max-w-full">
          {/* Header Bar */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/management")}
                className="mb-2 text-gray-600 hover:text-blue-600 p-0 flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Manajemen SOP
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Edit SOP: {formData.title || formData.code}
                </h1>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-normal">
                  <Save className="h-3 w-3" /> Auto-Save Aktif
                </Badge>
                {draftRestored && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToOriginalServerData}
                    className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 h-7 px-2 flex items-center gap-1"
                    title="Reset ke data awal di server"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset ke Data Asli
                  </Button>
                )}
              </div>
              <p className="text-gray-600 mt-1 text-sm">
                Perbarui formulir COP, kelola langkah flowchart dengan panah orthogonal otomatis, serta atur label simbol
              </p>
            </div>
          </div>

          {approvalStatus === 'rejected' && (
            <Alert className="mb-6 border-red-300 bg-red-50/95 text-red-900 shadow-xl rounded-xl">
              <AlertDescription className="text-sm font-medium flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-red-600 text-white p-2 rounded-lg mt-0.5">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-base text-red-900">⚠️ SOP Ini Ditolak oleh Verifikator / Kepala Bagian</p>
                    <p className="text-red-700 mt-1">
                      <span className="font-semibold">Alasan Penolakan:</span> {rejectionReason || "SOP perlu diperbaiki sebelum dipublikasikan ulang."}
                    </p>
                    <p className="text-xs text-red-600 mt-1 font-semibold">
                      Silakan perbarui formulir/flowchart di bawah ini, lalu klik tombol "Simpan & Ajukan Ulang SOP" untuk dikirim kembali.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {showSuccess && (
            <Alert className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
              <AlertDescription className="text-green-800 font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                ✨ SOP berhasil diperbarui! Data telah disimpan ke sistem.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-4 bg-white/80 backdrop-blur-md border border-white/20 p-1 rounded-xl shadow-md">
              <TabsTrigger
                value="generate"
                disabled={isManual}
                title={isManual ? "Dokumen bertipe Upload PDF manual tidak dapat diubah menjadi generate PDF form" : ""}
                className="rounded-lg font-medium text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="h-4 w-4 mr-2" />
                Edit Form & Flowchart SOP
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="rounded-lg font-medium text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Ganti File PDF Manual
              </TabsTrigger>
            </TabsList>

            {isManual ? (
              <Alert className="mb-6 bg-purple-50/90 border border-purple-200 text-purple-900 rounded-xl shadow-sm">
                <AlertDescription className="flex items-center gap-2 font-medium text-sm">
                  <Upload className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>
                    Dokumen ini bertipe <strong>Upload PDF Manual</strong>. Sesuai ketentuan, dokumen upload manual tidak dapat diubah menjadi PDF form/flowchart otomatis. Silakan perbarui data atau unggah berkas PDF baru pada form di bawah.
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-6 bg-blue-50/90 border border-blue-200 text-blue-900 rounded-xl shadow-sm">
                <AlertDescription className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    Dokumen ini bertipe <strong>Form & Flowchart SOP</strong>. Anda dapat memperbarui form/flowchart di bawah, atau beralih ke tab <strong>"Ganti File PDF Manual"</strong> untuk mengganti dokumen ini dengan berkas PDF manual.
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* ===== TAB GENERATE/EDIT BUILDER ===== */}
            <TabsContent value="generate" className="w-full">
              <div className="space-y-6 w-full">
                {/* ===== CARD 1: INFORMASI HEADER COP ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-blue-200 w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Informasi Header COP
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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

                      <div className="md:col-span-2">
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700">Judul / Nama SOP *</Label>
                        <Input
                          id="title"
                          placeholder="Contoh: Prosedur Pengajuan Cuti Pegawai"
                          value={formData.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          className="mt-1.5 h-10"
                        />
                      </div>

                      <div>
                        <Label htmlFor="department" className="text-sm font-medium text-gray-700">Tim Penanggung Jawab *</Label>
                        <Select
                          value={formData.department}
                          onValueChange={(val) => handleInputChange("department", val)}
                        >
                          <SelectTrigger className="mt-1.5 h-10">
                            <SelectValue placeholder="Pilih Tim" />
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
                        <Label htmlFor="responsiblePerson" className="text-sm font-medium text-gray-700">Penanggung Jawab (Nama/Jabatan)</Label>
                        <Input
                          id="responsiblePerson"
                          placeholder="Contoh: Kasubbag Umum / Ketua Tim"
                          value={formData.responsiblePerson}
                          onChange={(e) => handleInputChange("responsiblePerson", e.target.value)}
                          className="mt-1.5 h-10"
                        />
                      </div>
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

                {/* ===== CARD 2: DASAR HUKUM & KUALIFIKASI PELAKSANA ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-purple-200 w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-purple-600" />
                      Dasar Hukum & Kualifikasi Pelaksana
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <Label htmlFor="dasarHukum" className="text-sm font-medium text-gray-700">Dasar Hukum</Label>
                        <Textarea
                          id="dasarHukum"
                          placeholder="1. UU No. 16 Tahun 1997 tentang Statistik&#10;2. Perka BPS No. 7 Tahun 2020"
                          value={formData.dasarHukum}
                          onChange={(e) => handleInputChange("dasarHukum", e.target.value)}
                          className="mt-1.5 min-h-[90px]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="kualifikasiPelaksana" className="text-sm font-medium text-gray-700">Kualifikasi Pelaksana</Label>
                        <Textarea
                          id="kualifikasiPelaksana"
                          placeholder="1. Memahami alur kerja pengajuan&#10;2. Mampu mengoperasikan sistem SOP"
                          value={formData.kualifikasiPelaksana}
                          onChange={(e) => handleInputChange("kualifikasiPelaksana", e.target.value)}
                          className="mt-1.5 min-h-[90px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ===== CARD 3: KETERKAITAN & PERALATAN ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-indigo-200 w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-indigo-600" />
                      Keterkaitan & Peralatan/Perlengkapan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <Label htmlFor="keterkaitan" className="text-sm font-medium text-gray-700">Keterkaitan SOP Lain</Label>
                        <Textarea
                          id="keterkaitan"
                          placeholder="1. SOP Pengelolaan Surat Masuk&#10;2. SOP Verifikasi Dokumen"
                          value={formData.keterkaitan}
                          onChange={(e) => handleInputChange("keterkaitan", e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="peralatanPerlengkapan" className="text-sm font-medium text-gray-700">Peralatan / Perlengkapan</Label>
                        <Textarea
                          id="peralatanPerlengkapan"
                          placeholder="1. Komputer / Laptop&#10;2. Jaringan Internet, ATK"
                          value={formData.peralatanPerlengkapan}
                          onChange={(e) => handleInputChange("peralatanPerlengkapan", e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ===== CARD 4: PERINGATAN & PENCATATAN ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-amber-200 w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-amber-600" />
                      Peringatan & Pencatatan/Pendataan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <Label htmlFor="peringatan" className="text-sm font-medium text-gray-700">Peringatan</Label>
                        <Textarea
                          id="peringatan"
                          placeholder="Jika SOP tidak dilaksanakan, proses verifikasi akan terhambat..."
                          value={formData.peringatan}
                          onChange={(e) => handleInputChange("peringatan", e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pencatatanPendataan" className="text-sm font-medium text-gray-700">Pencatatan & Pendataan</Label>
                        <Textarea
                          id="pencatatanPendataan"
                          placeholder="Disimpan dalam arsip elektronik dan buku kendali SOP"
                          value={formData.pencatatanPendataan}
                          onChange={(e) => handleInputChange("pencatatanPendataan", e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ===== CARD 5: MAKSUD & TUJUAN ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-teal-200 w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      Maksud & Tujuan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <Label htmlFor="maksud" className="text-sm font-medium text-gray-700">Maksud</Label>
                        <Textarea
                          id="maksud"
                          placeholder="Memberikan pedoman baku dalam pelaksanaan alur SOP..."
                          value={formData.maksud}
                          onChange={(e) => handleInputChange("maksud", e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tujuan" className="text-sm font-medium text-gray-700">Tujuan</Label>
                        <Textarea
                          id="tujuan"
                          placeholder="Mewujudkan tertib administrasi dan efisiensi waktu kerja..."
                          value={formData.tujuan}
                          onChange={(e) => handleInputChange("tujuan", e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ===== CARD 6: KELOLA KOLOM PELAKSANA ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-green-200 w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-green-600" />
                      Kolom Pelaksana (Daftar Aktor Flowchart)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nama pelaksana baru (contoh: Kepala BPS, Staf IPDS)..."
                        value={newPelaksanaName}
                        onChange={(e) => setNewPelaksanaName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addPelaksanaColumn();
                          }
                        }}
                        className="flex-1 h-10"
                      />
                      <Button
                        type="button"
                        onClick={addPelaksanaColumn}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Tambah Kolom
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {pelaksanaColumns.map((col, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="pl-3 pr-2 py-1.5 text-sm flex items-center gap-2 bg-green-50 text-green-800 border border-green-200"
                        >
                          <span>{col}</span>
                          <button
                            type="button"
                            onClick={() => removePelaksanaColumn(col)}
                            className="text-green-600 hover:text-red-600 hover:bg-red-50 rounded-full p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* ===== CARD 7: TABEL LANGKAH-LANGKAH FLOWCHART & LIVE SIMULATOR ===== */}
                <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-blue-200 w-full">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Workflow className="h-5 w-5 text-blue-600" />
                          Flowchart & Mutu Baku
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                          Centang aktor pelaksana, pilih bentuk simbol, dan ketikkan teks singkat di dalam simbol
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
                          type="button"
                          size="sm"
                          onClick={addFlowchartStep}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Tambah Langkah
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="overflow-x-auto w-full border border-gray-200 rounded-lg">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700">
                            <th className="border border-gray-200 p-2.5 w-12 text-center">No</th>
                            <th className="border border-gray-200 p-2.5 min-w-[200px]">Aktivitas</th>
                            {pelaksanaColumns.map((col, idx) => (
                              <th key={idx} className="border border-gray-200 p-2.5 min-w-[150px] text-center">
                                {col}
                              </th>
                            ))}
                            <th className="border border-gray-200 p-2.5 min-w-[140px]">Persyaratan</th>
                            <th className="border border-gray-200 p-2.5 min-w-[120px]">Output</th>
                            <th className="border border-gray-200 p-2.5 min-w-[100px]">Waktu</th>
                            <th className="border border-gray-200 p-2.5 min-w-[140px]">Keterangan</th>
                            <th className="border border-gray-200 p-2.5 w-28 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flowchartSteps.map((step, stepIdx) => (
                            <tr key={stepIdx} className="hover:bg-blue-50/30">
                              <td className="border border-gray-200 p-2 text-center font-semibold">
                                {step.no}
                              </td>
                              <td className="border border-gray-200 p-2">
                                <div className="relative">
                                  <Textarea
                                    value={step.aktivitas}
                                    onChange={(e) => updateFlowchartStep(stepIdx, "aktivitas", e.target.value)}
                                    placeholder="Uraian aktivitas..."
                                    className="min-h-[60px] text-xs pr-7"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openTextEditor(stepIdx, "aktivitas", `Aktivitas — Langkah ${step.no}`)}
                                    className="absolute top-1 right-1 p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Perbesar editor teks"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>

                              {pelaksanaColumns.map((col, colIdx) => {
                                return (
                                  <td key={colIdx} className="border border-gray-200 p-2 text-center align-middle bg-slate-50/30">
                                    <div className="flex flex-col items-center gap-1.5 p-1 bg-white rounded border border-gray-100 shadow-xs">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="checkbox"
                                          checked={!!step.pelaksana[col]}
                                          onChange={(e) => updateFlowchartStep(stepIdx, `pelaksana.${col}`, e.target.checked)}
                                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[11px] font-medium text-gray-700">Aktif</span>
                                      </div>

                                      {step.pelaksana[col] && (
                                        <div className="w-full pt-1.5 border-t border-gray-100">
                                          <FlowchartSymbolPicker
                                            currentSymbol={step.shapes?.[col] || (stepIdx === 0 || stepIdx === flowchartSteps.length - 1 ? "terminator" : "process")}
                                            onSymbolChange={(newSymbol) => updateFlowchartStep(stepIdx, `shapes.${col}`, newSymbol)}
                                            executorName={col}
                                            stepIndex={stepIdx}
                                            totalSteps={flowchartSteps.length}
                                            connections={step.connections?.[col]}
                                            onConnectionsChange={(newConns) => updateFlowchartStep(stepIdx, `connections.${col}`, newConns)}
                                            routeData={step.executorRoutes?.[col]}
                                            onRouteChange={(newRoute) => updateFlowchartStep(stepIdx, `executorRoutes.${col}`, newRoute)}
                                            allColumns={pelaksanaColumns}
                                            allSteps={flowchartSteps}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              <td className="border border-gray-200 p-2">
                                <div className="relative">
                                  <Input
                                    value={step.mutuBaku.persyaratan}
                                    onChange={(e) => updateFlowchartStep(stepIdx, "mutuBaku.persyaratan", e.target.value)}
                                    placeholder="Syarat/kelengkapan"
                                    className="h-8 text-xs pr-7"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openTextEditor(stepIdx, "mutuBaku.persyaratan", `Persyaratan — Langkah ${step.no}`)}
                                    className="absolute top-1 right-1 p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Perbesar editor teks"
                                  >
                                    <Maximize2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="border border-gray-200 p-2">
                                <div className="relative">
                                  <Input
                                    value={step.mutuBaku.output}
                                    onChange={(e) => updateFlowchartStep(stepIdx, "mutuBaku.output", e.target.value)}
                                    placeholder="Output dokumen"
                                    className="h-8 text-xs pr-7"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openTextEditor(stepIdx, "mutuBaku.output", `Output — Langkah ${step.no}`)}
                                    className="absolute top-1 right-1 p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Perbesar editor teks"
                                  >
                                    <Maximize2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="border border-gray-200 p-2">
                                <div className="relative">
                                  <Input
                                    value={step.mutuBaku.waktu}
                                    onChange={(e) => updateFlowchartStep(stepIdx, "mutuBaku.waktu", e.target.value)}
                                    placeholder="5 Menit"
                                    className="h-8 text-xs pr-7"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openTextEditor(stepIdx, "mutuBaku.waktu", `Waktu — Langkah ${step.no}`)}
                                    className="absolute top-1 right-1 p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Perbesar editor teks"
                                  >
                                    <Maximize2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="border border-gray-200 p-2">
                                <div className="relative">
                                  <Input
                                    value={step.keterangan}
                                    onChange={(e) => updateFlowchartStep(stepIdx, "keterangan", e.target.value)}
                                    placeholder="Keterangan..."
                                    className="h-8 text-xs pr-7"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openTextEditor(stepIdx, "keterangan", `Keterangan — Langkah ${step.no}`)}
                                    className="absolute top-1 right-1 p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Perbesar editor teks"
                                  >
                                    <Maximize2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="border border-gray-200 p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveStepUp(stepIdx)}
                                    disabled={stepIdx === 0}
                                    className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                                    title="Pindah ke Atas"
                                  >
                                    <MoveUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveStepDown(stepIdx)}
                                    disabled={stepIdx === flowchartSteps.length - 1}
                                    className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                                    title="Pindah ke Bawah"
                                  >
                                    <MoveDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeFlowchartStep(stepIdx)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                    title="Hapus Langkah"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Live Preview Simulator */}
                    <FlowchartLivePreview steps={flowchartSteps} columns={pelaksanaColumns} />

                    <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFlowchartStep}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Tambah Langkah Baru
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ===== BOTTOM ACTION BUTTONS ===== */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestPDF}
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-medium"
                  >
                    <Eye className="h-4 w-4 mr-1.5" /> Test PDF Flowchart
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 font-medium"
                  >
                    <Save className="h-4 w-4 mr-1.5" /> Simpan Draft
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className={`${
                      approvalStatus === 'rejected'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    } text-white shadow-md font-medium`}
                  >
                    <Send className="h-4 w-4 mr-1.5" /> {isSaving ? "Menyimpan..." : approvalStatus === 'rejected' ? "Simpan & Ajukan Ulang SOP" : "Perbarui & Publikasikan SOP"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ===== TAB UPLOAD MANUAL ===== */}
            <TabsContent value="upload" className="w-full">
              <Card className="bg-white/90 backdrop-blur-md shadow-xl border border-gray-200 w-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5 text-purple-600" />
                    Ganti Berkas Dokumen PDF SOP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Pilih File PDF Baru (Opsional)</Label>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="mt-1.5"
                    />
                    {uploadedFile && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        ✓ File dipilih: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                    {!isManual && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        ⚠️ Catatan: Jika Anda mengunggah file PDF di sini, dokumen ini akan beralih menjadi <strong>Upload PDF Manual</strong> dan PDF manual inilah yang akan digunakan.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Judul SOP</Label>
                      <Input
                        value={uploadFormData.title}
                        onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Tim Penanggung Jawab</Label>
                      <Select
                        value={uploadFormData.department}
                        onValueChange={(val) => setUploadFormData({ ...uploadFormData, department: val })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Pilih Tim" />
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
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleUploadSubmit(true)}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-1.5" /> Simpan Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleUploadSubmit(false)}
                      disabled={isSaving}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-1.5" /> {isSaving ? "Menyimpan..." : "Perbarui Dokumen SOP"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>

      {/* ===== POP-UP TEXT EDITOR MODAL ===== */}
      <Dialog open={textEditorModal.open} onOpenChange={(open) => {
        if (!open) saveTextEditor();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <FileText className="h-5 w-5" />
              {textEditorModal.label}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={textEditorModal.value}
              onChange={(e) => setTextEditorModal(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Ketik teks di sini..."
              className="min-h-[200px] text-sm leading-relaxed resize-y"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-2">
              {textEditorModal.value.length} karakter
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTextEditorModal({ open: false, stepIndex: -1, field: "", label: "", value: "" })}
            >
              Batal
            </Button>
            <Button
              onClick={saveTextEditor}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" /> Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}