import React, { useState } from "react";
import { FLOWCHART_SYMBOLS, FlowchartSymbolIcon } from "@/lib/flowchartSymbols";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Route, Shapes, Check, Plus, Trash2, ArrowRight } from "lucide-react";

export interface FlowchartConnection {
  targetStep: number; // 0 = Selesai, 1..N = Nomor langkah (bisa langkah saat ini, sebelumnya, atau sesudahnya!)
  targetPelaksana?: string; // Nama pelaksana tujuan (e.g. "Staf", "Ketua Tim", dll.)
}

export interface ExecutorRouteData {
  targetStep?: number;
  targetPelaksana?: string;
  returnStep?: number;
  returnPelaksana?: string;
  returnLabel?: string;
}

interface FlowchartSymbolPickerProps {
  currentSymbol: string;
  onSymbolChange: (newSymbol: string) => void;
  executorName: string;
  stepIndex: number;
  totalSteps: number;
  connections?: FlowchartConnection[];
  onConnectionsChange: (newConnections: FlowchartConnection[]) => void;
  // Fallback props untuk kompatibilitas
  routeData?: ExecutorRouteData;
  onRouteChange?: (newRoute: ExecutorRouteData) => void;
  allColumns?: string[];
  allSteps?: { no: number; aktivitas?: string; pelaksana?: { [key: string]: boolean } }[];
}

export const FlowchartSymbolPicker: React.FC<FlowchartSymbolPickerProps> = ({
  currentSymbol,
  onSymbolChange,
  executorName,
  stepIndex,
  totalSteps,
  connections,
  onConnectionsChange,
  routeData,
  onRouteChange,
  allColumns = [],
  allSteps = [],
}) => {
  const [isSymbolDialogOpen, setIsSymbolDialogOpen] = useState(false);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentDef =
    FLOWCHART_SYMBOLS.find((s) => s.id === currentSymbol) ||
    FLOWCHART_SYMBOLS.find((s) => s.id === "process") ||
    FLOWCHART_SYMBOLS[0];

  // Inisialisasi daftar koneksi aktif
  // Jika props connections sudah ada dan terisi, pakai itu.
  // Jika belum, fallback dari routeData lama atau default maju ke langkah berikutnya.
  const getActiveConnections = (): FlowchartConnection[] => {
    let list: FlowchartConnection[] = [];
    if (connections && connections.length > 0) {
      list = [...connections];
    } else if (routeData) {
      if (routeData.targetStep !== undefined) {
        list.push({
          targetStep: routeData.targetStep,
          targetPelaksana: routeData.targetPelaksana,
        });
      }
      if (routeData.returnStep && routeData.returnStep > 0) {
        list.push({
          targetStep: routeData.returnStep,
          targetPelaksana: routeData.returnPelaksana,
        });
      }
    }
    if (list.length === 0) {
      const defTarget = stepIndex + 2 <= totalSteps ? stepIndex + 2 : 0;
      list = [{ targetStep: defTarget }];
    }

    // Pastikan setiap koneksi non-0 memiliki targetPelaksana yang valid
    return list.map((c) => {
      if (c.targetStep > 0 && !c.targetPelaksana) {
        const isCur = c.targetStep === stepIndex + 1;
        const targetStepData = allSteps.find((s) => s.no === c.targetStep);
        const validPels: string[] = [];
        if (isCur) {
          allColumns.forEach((col) => {
            if (col !== executorName) validPels.push(col);
          });
        } else if (targetStepData && targetStepData.pelaksana) {
          Object.keys(targetStepData.pelaksana).forEach((col) => {
            if (targetStepData.pelaksana[col]) validPels.push(col);
          });
        }
        const fallbackPels = validPels.length > 0 ? validPels : allColumns;
        const preferred = fallbackPels.includes(executorName) ? executorName : (fallbackPels[0] || "");
        return {
          ...c,
          targetPelaksana: preferred,
        };
      }
      return c;
    });
  };

  const activeConnections = getActiveConnections();

  const handleUpdateConnection = (connIdx: number, field: keyof FlowchartConnection, value: any) => {
    const nextList = [...activeConnections];
    const updated: FlowchartConnection = {
      ...nextList[connIdx],
      [field]: value,
    };

    if (field === "targetStep") {
      const stepNum = value as number;
      if (stepNum === 0) {
        delete updated.targetPelaksana;
      } else {
        const isCur = stepNum === stepIndex + 1;
        const targetStepData = allSteps.find((s) => s.no === stepNum);
        const validPels: string[] = [];
        if (isCur) {
          allColumns.forEach((col) => {
            if (col !== executorName) validPels.push(col);
          });
        } else if (targetStepData && targetStepData.pelaksana) {
          Object.keys(targetStepData.pelaksana).forEach((col) => {
            if (targetStepData.pelaksana[col]) validPels.push(col);
          });
        }
        const fallbackPels = validPels.length > 0 ? validPels : allColumns;
        if (!updated.targetPelaksana || !fallbackPels.includes(updated.targetPelaksana)) {
          const preferred = fallbackPels.includes(executorName) ? executorName : (fallbackPels[0] || "");
          updated.targetPelaksana = preferred;
        }
      }
    }

    nextList[connIdx] = updated;
    onConnectionsChange(nextList);
  };

  const handleAddConnection = () => {
    const defaultStep = stepIndex + 2 <= totalSteps ? stepIndex + 2 : (stepIndex + 1);
    const targetStepData = allSteps.find((s) => s.no === defaultStep);
    const validPels: string[] = [];
    if (defaultStep === stepIndex + 1) {
      allColumns.forEach((col) => {
        if (col !== executorName) validPels.push(col);
      });
    } else if (targetStepData && targetStepData.pelaksana) {
      Object.keys(targetStepData.pelaksana).forEach((col) => {
        if (targetStepData.pelaksana[col]) validPels.push(col);
      });
    }
    const fallbackPels = validPels.length > 0 ? validPels : allColumns;
    const preferred = fallbackPels.includes(executorName) ? executorName : (fallbackPels[0] || "");

    const nextList = [
      ...activeConnections,
      {
        targetStep: defaultStep,
        targetPelaksana: preferred,
      },
    ];
    onConnectionsChange(nextList);
  };

  const handleRemoveConnection = (connIdx: number) => {
    if (activeConnections.length <= 1) {
      // Jika tersisa 1, set menjadi 0 (Selesai)
      const nextList = [{ targetStep: 0 }];
      onConnectionsChange(nextList);
      return;
    }
    const nextList = activeConnections.filter((_, idx) => idx !== connIdx);
    onConnectionsChange(nextList);
  };

  const categories = [
    "Semua",
    "Utama",
    "Dokumen & Data",
    "Input & Operasi",
    "Konektor & Percabangan",
    "Penyimpanan & Lainnya",
  ];

  const filteredSymbols = FLOWCHART_SYMBOLS.filter((sym) => {
    const matchCat = selectedCategory === "Semua" || sym.category === selectedCategory;
    const matchSearch =
      sym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sym.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-1.5 w-full bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md border border-slate-200 dark:border-slate-800">
      {/* 1. BUTTON PICKER SIMBOL DENGAN PREVIEW VISUAL LANGSUNG */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Bentuk Simbol
          </Label>
        </div>

        <Dialog open={isSymbolDialogOpen} onOpenChange={setIsSymbolDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 px-2 flex items-center justify-between gap-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 border-slate-300 dark:border-slate-700 text-left shadow-xs cursor-pointer"
              title="Klik untuk memilih 25 bentuk simbol diagram flowchart"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-5 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 shrink-0">
                  <FlowchartSymbolIcon symbolId={currentDef.id} className="w-5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                  {currentDef.name.split("(")[0]}
                </span>
              </div>
              <Shapes className="h-3 w-3 text-slate-400 shrink-0" />
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-4 bg-white dark:bg-slate-900">
            <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-base flex items-center gap-2">
                <Shapes className="h-5 w-5 text-blue-600" />
                Katalog Simbol Flowchart Standar BPS (25 Pilihan)
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Pilih simbol diagram untuk pelaksana <strong>{executorName}</strong> pada langkah {stepIndex + 1}. Bentuk digambar polosan dan rapi di PDF.
              </p>
            </DialogHeader>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col gap-2 pt-2">
              <Input
                placeholder="Cari simbol (contoh: keputusan, dokumen, input, dll)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of 25 Symbols */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1 my-2 max-h-[50vh]">
              {filteredSymbols.map((sym) => {
                const isSelected = currentSymbol === sym.id;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      onSymbolChange(sym.id);
                      setIsSymbolDialogOpen(false);
                    }}
                    className={`flex flex-col text-left p-2 rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 w-full">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {sym.category}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </div>

                    {/* Visual Icon */}
                    <div className="h-10 w-full flex items-center justify-center bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 my-1">
                      <FlowchartSymbolIcon symbolId={sym.id} className="w-10 h-7" />
                    </div>

                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate mt-1">
                      {sym.name}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                      {sym.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. PENGATUR ARAH ALUR FLOWCHART SPESIFIK PELAKSANA (BANYAK KONEKSI + BREAKDOWN DETAIL) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Arah Alur ({activeConnections.length})
          </Label>
        </div>

        <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-auto min-h-8 py-1 px-2 flex flex-col items-start gap-1 bg-white dark:bg-slate-800 hover:bg-emerald-50/80 border-slate-300 dark:border-slate-700 text-left shadow-xs cursor-pointer"
              title="Atur arah alur panah khusus untuk pelaksana ini (bisa lebih dari 1)"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Route className="h-3 w-3" />
                  Koneksi Keluar ({activeConnections.length})
                </span>
                <span className="text-[9px] text-blue-600 font-semibold underline">Edit</span>
              </div>

              {/* Badges preview alur */}
              <div className="flex flex-wrap gap-1 w-full">
                {activeConnections.map((conn, cIdx) => {
                  const isCurrentStep = conn.targetStep === stepIndex + 1;
                  const isFinished = conn.targetStep === 0;
                  const isBack = conn.targetStep > 0 && conn.targetStep < stepIndex + 1;
                  const targetPelText = conn.targetPelaksana ? ` (${conn.targetPelaksana})` : "";

                  return (
                    <span
                      key={cIdx}
                      className={`text-[9.5px] px-1.5 py-0.2 rounded font-medium border truncate max-w-full ${
                        isFinished
                          ? "bg-slate-100 text-slate-700 border-slate-300"
                          : isCurrentStep
                          ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300"
                          : isBack
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300"
                      }`}
                    >
                      {isFinished
                        ? "🏁 Selesai"
                        : isCurrentStep
                        ? `➔ L-${conn.targetStep}${targetPelText}`
                        : isBack
                        ? `↶ L-${conn.targetStep}${targetPelText}`
                        : `➔ L-${conn.targetStep}${targetPelText}`}
                    </span>
                  );
                })}
              </div>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg p-4 bg-white dark:bg-slate-900 max-h-[85vh] flex flex-col">
            <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Route className="h-4 w-4 text-emerald-600" />
                Atur Koneksi Alur Pelaksana: {executorName}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Langkah {stepIndex + 1} &bull; Tentukan satu atau lebih arah diagram dari pelaksana ini. Bisa ke langkah berikutnya, bolak-balik ke langkah sebelumnya, maupun antar pelaksana di langkah yang sama.
              </p>
            </DialogHeader>

            <div className="space-y-3 pt-2 overflow-y-auto pr-1 my-2 flex-1">
              {activeConnections.map((conn, cIdx) => {
                const targetStepNum = conn.targetStep;
                const isCurrentStep = targetStepNum === stepIndex + 1;

                // Tentukan daftar opsi pelaksana untuk langkah target yang dipilih
                const targetStepData = allSteps.find((s) => s.no === targetStepNum);
                const availablePelaksanas: string[] = [];

                if (isCurrentStep) {
                  // Jika langkah saat ini, tampilkan pelaksana lain selain dirinya sendiri
                  allColumns.forEach((col) => {
                    if (col !== executorName) availablePelaksanas.push(col);
                  });
                } else if (targetStepData && targetStepData.pelaksana) {
                  // Pelaksana yang aktif di langkah target tersebut
                  Object.keys(targetStepData.pelaksana).forEach((col) => {
                    if (targetStepData.pelaksana[col]) availablePelaksanas.push(col);
                  });
                }

                // Fallback jika kosong, ambil dari allColumns
                const finalPelaksanaOptions =
                  availablePelaksanas.length > 0 ? availablePelaksanas : allColumns;

                return (
                  <div
                    key={cIdx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
                        Koneksi Arah #{cIdx + 1}
                      </span>
                      {activeConnections.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveConnection(cIdx)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Hapus arah koneksi ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1. Ke Langkah / Aktivitas Berapa */}
                      <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400">
                          Ke Langkah / Aktivitas:
                        </Label>
                        <Select
                          value={String(conn.targetStep)}
                          onValueChange={(val) => {
                            const newTargetStep = parseInt(val, 10);
                            handleUpdateConnection(cIdx, "targetStep", newTargetStep);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">🏁 Selesai (Akhir Alur)</SelectItem>
                            {/* Opsi Langkah Saat Ini (Antar Pelaksana Berbeda di Langkah Tetap) */}
                            <SelectItem value={String(stepIndex + 1)}>
                              📍 Langkah {stepIndex + 1} (Langkah Saat Ini - Antar Pelaksana)
                            </SelectItem>
                            {/* Langkah Berikutnya */}
                            {stepIndex + 2 <= totalSteps && (
                              <SelectItem value={String(stepIndex + 2)}>
                                ⬇️ Langkah {stepIndex + 2} (Berikutnya)
                              </SelectItem>
                            )}
                            {/* Semua Langkah Lainnya */}
                            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((sNum) => {
                              if (sNum === stepIndex + 1 || sNum === stepIndex + 2) return null;
                              const isBack = sNum < stepIndex + 1;
                              return (
                                <SelectItem key={sNum} value={String(sNum)}>
                                  {isBack ? `↶ Balik ke Langkah ${sNum}` : `↷ Lompat ke Langkah ${sNum}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Ke Pelaksana Siapa di Langkah Tersebut */}
                      <div className="space-y-1">
                        <Label className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400">
                          Ke Pelaksana Siapa:
                        </Label>
                        {conn.targetStep === 0 ? (
                          <div className="h-8 flex items-center px-2 text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 italic">
                            Tidak menuju pelaksana (Selesai)
                          </div>
                        ) : (
                          <Select
                            value={conn.targetPelaksana || (finalPelaksanaOptions[0] || "")}
                            onValueChange={(val) => {
                              handleUpdateConnection(cIdx, "targetPelaksana", val);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                              <SelectValue placeholder="Pilih Pelaksana" />
                            </SelectTrigger>
                            <SelectContent>
                              {finalPelaksanaOptions.map((pel) => (
                                <SelectItem key={pel} value={pel}>
                                  {pel} {pel === executorName && isCurrentStep ? "(Diri Sendiri)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Tombol Tambah Arah Koneksi */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddConnection}
                className="w-full h-8 text-xs text-blue-600 border-dashed border-blue-300 hover:bg-blue-50/80 flex items-center justify-center gap-1.5 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Arah Koneksi Lagi (Percabangan / Balik)
              </Button>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Garis alur di PDF akan dibuat polosan murni berujung anak panah.
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsRouteDialogOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4"
              >
                Simpan & Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
