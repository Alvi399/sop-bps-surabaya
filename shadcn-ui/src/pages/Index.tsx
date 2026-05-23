import { useState, useEffect } from "react";
import { AuthService } from "@/lib/auth";
import { SOPDocument } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StatsCards from "@/components/dashboard/StatsCards";
import SOPChart from "@/components/dashboard/SOPChart";
import ActivityList from "@/components/dashboard/ActivityList";
import { toast } from "sonner";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

export default function Dashboard() {
  const [sopDocuments, setSOPDocuments] = useState<SOPDocument[]>([]);
  const [filteredSOPDocuments, setFilteredSOPDocuments] = useState<SOPDocument[]>([]); // ✅ TAMBAH state untuk filtered data
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString()); // ✅ Default tahun sekarang
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    documents: SOPDocument[];
    departments?: Array<{ name: string; count: number }>;
  } | null>(null);

  // Fetch SOPs from API
  useEffect(() => {
    fetchSOPs();
  }, []);

  // ✅ TAMBAH: Filter SOPs by selected year
  useEffect(() => {
    filterSOPsByYear();
  }, [selectedYear, sopDocuments]);

  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      const response = await axios.get(`${API_URL}/sops`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Transform data dari backend ke format frontend
      const transformedData: SOPDocument[] = response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description || "",
        department: item.department,
        responsiblePerson: item.responsible_person,
        status: item.status,
        approvalStatus: item.approval_status || 'pending',
        effectiveDate: item.effective_date,
        expiryDate: item.expiry_date,
        version: item.version,
        fileUrl: item.file_url,
        createdBy: item.created_by,
        approvedBy: item.approved_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setSOPDocuments(transformedData);
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching SOPs:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        window.location.href = "/login";
      } else {
        toast.error("Failed to load SOP data");
      }
      
      setLoading(false);
    }
  };

  // ✅ TAMBAH: Function untuk filter SOP by year
  const filterSOPsByYear = () => {
    if (selectedYear === "all") {
      setFilteredSOPDocuments(sopDocuments);
      return;
    }

    const filtered = sopDocuments.filter(doc => {
      if (!doc.effectiveDate) return false;
      const year = new Date(doc.effectiveDate).getFullYear();
      return year.toString() === selectedYear;
    });

    setFilteredSOPDocuments(filtered);
  };

  // ✅ TAMBAH: Generate available years from SOPs
  const getAvailableYears = (): string[] => {
    const years = new Set<string>();
    
    sopDocuments.forEach(doc => {
      if (doc.effectiveDate) {
        const year = new Date(doc.effectiveDate).getFullYear().toString();
        years.add(year);
      }
    });

    // Sort descending
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  };

  const availableYears = getAvailableYears();

  const handleCardClick = (cardType: string) => {
    let filteredDocs: SOPDocument[] = [];
    let title = "";
    let departments: Array<{ name: string; count: number }> | undefined;

    // ✅ GUNAKAN filteredSOPDocuments (yang sudah di-filter by year)
    switch (cardType) {
      case "total":
        title = `Semua SOP (${selectedYear === "all" ? "Semua Tahun" : selectedYear})`;
        filteredDocs = filteredSOPDocuments;
        break;
      
      case "aktif":
        title = `SOP Aktif (${selectedYear === "all" ? "Semua Tahun" : selectedYear})`;
        filteredDocs = filteredSOPDocuments.filter((doc) => doc.status === "active");
        break;
      
      case "bidang":
        title = `Daftar Tim Terlibat (${selectedYear === "all" ? "Semua Tahun" : selectedYear})`;
        const deptMap = filteredSOPDocuments.reduce((acc, doc) => {
          acc[doc.department] = (acc[doc.department] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        departments = Object.entries(deptMap).map(([name, count]) => ({
          name,
          count,
        })).sort((a, b) => b.count - a.count);
        
        filteredDocs = [];
        break;
      
      case "usia":
        title = `Detail Usia SOP (${selectedYear === "all" ? "Semua Tahun" : selectedYear})`;
        filteredDocs = filteredSOPDocuments.map(doc => ({
          ...doc,
          age: calculateSOPAge(doc.effectiveDate),
        }));
        break;
      
      default:
        filteredDocs = [];
    }

    setModalData({ title, documents: filteredDocs, departments });
    setIsModalOpen(true);
  };

  const calculateSOPAge = (effectiveDate: string): number => {
    if (!effectiveDate) return 0;
    
    const effective = new Date(effectiveDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - effective.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.floor(diffDays / 365);
  };

  const handleDepartmentClick = (deptName: string) => {
    setSelectedDepartment(deptName);
    setModalData(null);
    setIsModalOpen(true);
  };

  const getDepartmentDetails = (deptName: string) => {
    // ✅ GUNAKAN filteredSOPDocuments
    const deptDocs = filteredSOPDocuments.filter((doc) => doc.department === deptName);
    
    const statusBreakdown = deptDocs.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: deptDocs.length,
      aktif: statusBreakdown.active || 0,
      draft: statusBreakdown.draft || 0,
      archived: statusBreakdown.archived || 0,
      documents: deptDocs,
    };
  };

  const selectedDeptDetails = selectedDepartment
    ? getDepartmentDetails(selectedDepartment)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Background animasi */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] bg-top"></div>
      </div>

      {/* Sidebar tetap di kiri */}
      <aside className="fixed left-0 top-0 h-full w-64 z-30">
        <Sidebar activeMenu="dashboard" />
      </aside>

      {/* Konten utama */}
      <div className="ml-64 flex-1 flex flex-col relative z-10">
        <Header />

        {/* Bagian utama yang scrollable */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-6">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Selamat Datang di Dashboard SOP
              </h1>
              <p className="text-gray-600">
                Kelola dan pantau Standard Operating Procedure BPS Kota Surabaya
              </p>
              {/* ✅ TAMBAH: Info SOP yang ditampilkan */}
              {selectedYear !== "all" && (
                <p className="text-sm text-gray-500 mt-1">
                  Menampilkan {filteredSOPDocuments.length} dari {sopDocuments.length} SOP untuk tahun {selectedYear}
                </p>
              )}
            </div>
            
            {/* ✅ UPDATE: Filter Tahun */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-40 bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all">
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {availableYears.length > 0 ? (
                  availableYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={new Date().getFullYear().toString()}>
                    {new Date().getFullYear()}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ✅ PASS filteredSOPDocuments ke semua component */}
          <StatsCards
            sopDocuments={filteredSOPDocuments}
            onCardClick={handleCardClick}
          />
          <SOPChart
            sopDocuments={filteredSOPDocuments}
            onDepartmentClick={handleDepartmentClick}
            selectedYear={selectedYear}
          />
          <ActivityList sopDocuments={filteredSOPDocuments} />
        </main>

        <Footer />
      </div>

      {/* Modal Detail */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {modalData?.title ||
                (selectedDepartment
                  ? `Detail SOP: ${selectedDepartment}`
                  : "Detail SOP")}
            </DialogTitle>
          </DialogHeader>

          {selectedDeptDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total SOP" value={selectedDeptDetails.total} color="blue" />
                <StatBox label="Aktif" value={selectedDeptDetails.aktif} color="green" />
                <StatBox label="Draft" value={selectedDeptDetails.draft} color="orange" />
                <StatBox label="Archived" value={selectedDeptDetails.archived} color="red" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Daftar SOP</h3>
                <div className="space-y-2">
                  {selectedDeptDetails.documents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Tidak ada SOP</p>
                  ) : (
                    selectedDeptDetails.documents.map((doc) => (
                      <SOPItem key={doc.id} doc={doc} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {modalData && modalData.departments && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                Total: {modalData.departments.length} Tim
              </h3>
              {modalData.departments.map((dept, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 hover:bg-white/80 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    setIsModalOpen(false);
                    setTimeout(() => handleDepartmentClick(dept.name), 300);
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{dept.name}</p>
                    <p className="text-xs text-gray-500">Klik untuk lihat detail</p>
                  </div>
                  <span className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-sm">
                    {dept.count} SOP
                  </span>
                </div>
              ))}
            </div>
          )}

          {modalData && modalData.documents && modalData.documents.length > 0 && !modalData.departments && (
            <div className="space-y-3">
              {modalData.title.includes("Detail Usia SOP") ? (
                modalData.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 hover:bg-white/80 hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">{doc.title}</p>
                      <p className="text-xs text-gray-500">Kode: {doc.code}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Efektif sejak: {new Date(doc.effectiveDate).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-sm">
                      {doc.age || calculateSOPAge(doc.effectiveDate)} tahun
                    </span>
                  </div>
                ))
              ) : (
                modalData.documents.map((doc) => (
                  <SOPItem key={doc.id} doc={doc} />
                ))
              )}
            </div>
          )}

          {modalData && 
           modalData.documents.length === 0 && 
           !modalData.departments && 
           !selectedDeptDetails && (
            <p className="text-gray-500 text-center py-6">
              Tidak ada data untuk kategori ini pada tahun {selectedYear}.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-700",
    green: "from-green-50 to-green-100 border-green-200 text-green-700",
    orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-700",
    red: "from-red-50 to-red-100 border-red-200 text-red-700",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorMap[color]} p-4 rounded-xl border shadow-lg hover:shadow-xl transition-all`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function SOPItem({ doc }: { doc: SOPDocument }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-green-400 to-green-600 text-white";
      case "draft":
        return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
      case "archived":
        return "bg-gradient-to-r from-red-400 to-red-600 text-white";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "draft":
        return "Draft";
      case "archived":
        return "Archived";
      default:
        return status;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 hover:bg-white/80 hover:shadow-md transition-all">
      <div className="flex-1">
        <p className="font-medium text-sm text-gray-800">{doc.title}</p>
        <p className="text-xs text-gray-500">Kode: {doc.code}</p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(doc.status)}`}
      >
        {getStatusLabel(doc.status)}
      </span>
    </div>
  );
}