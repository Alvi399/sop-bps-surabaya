import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Users, Calendar } from "lucide-react";
import { SOPDocument } from "@/types";

interface StatsCardsProps {
  sopDocuments: SOPDocument[];
  onCardClick: (cardType: string) => void;
}

export default function StatsCards({
  sopDocuments,
  onCardClick,
}: StatsCardsProps) {
  // ✅ FIX: Hitung SOP Aktif dengan status "active"
  const totalSOPs = sopDocuments.length;
  const activeSOPs = sopDocuments.filter((doc) => doc.status === "active").length;
  
  // ✅ FIX: Hitung jumlah department unik
  const uniqueDepartments = new Set(sopDocuments.map((doc) => doc.department));
  const departmentCount = uniqueDepartments.size;

  // ✅ FIX: Hitung rata-rata usia SOP
  const calculateAverageAge = () => {
    if (sopDocuments.length === 0) return 0;

    const today = new Date();
    const totalMonths = sopDocuments.reduce((sum, doc) => {
      if (!doc.effectiveDate) return sum;
      
      const effectiveDate = new Date(doc.effectiveDate);
      const diffTime = today.getTime() - effectiveDate.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
      
      return sum + Math.max(0, diffMonths);
    }, 0);

    return (totalMonths / sopDocuments.length).toFixed(1);
  };

  const averageAge = calculateAverageAge();

  // ✅ Hitung persentase perubahan (comparison dengan tahun lalu - bisa di-mock dulu)
  const calculateGrowth = () => {
    // Mock data: anggap tahun lalu ada 1 SOP, sekarang 2
    const lastYearCount = 1; // Nanti bisa diganti dengan data real
    const growth = ((totalSOPs - lastYearCount) / lastYearCount) * 100;
    return growth > 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`;
  };

  const activePercentage = totalSOPs > 0 
    ? ((activeSOPs / totalSOPs) * 100).toFixed(0) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Card 1: Total SOP */}
      <Card
        className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={() => onCardClick("total")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Total
            </span>
          </div>
          <p className="text-sm text-blue-100 mb-1">Total SOP</p>
          <p className="text-4xl font-bold mb-2">{totalSOPs}</p>
          <p className="text-xs text-blue-100">
            📈 {calculateGrowth()} dari tahun lalu
          </p>
        </CardContent>
      </Card>

      {/* Card 2: SOP Aktif */}
      <Card
        className="bg-gradient-to-br from-green-500 to-green-700 text-white border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={() => onCardClick("aktif")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <CheckCircle className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Aktif
            </span>
          </div>
          <p className="text-sm text-green-100 mb-1">SOP Aktif</p>
          <p className="text-4xl font-bold mb-2">{activeSOPs}</p>
          <p className="text-xs text-green-100">
            {activePercentage}% dari total SOP
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Tim Terlibat */}
      <Card
        className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={() => onCardClick("bidang")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Tim
            </span>
          </div>
          <p className="text-sm text-purple-100 mb-1">Tim Terlibat</p>
          <p className="text-4xl font-bold mb-2">{departmentCount}</p>
          <p className="text-xs text-purple-100">Departemen aktif</p>
        </CardContent>
      </Card>

      {/* Card 4: Rata-rata Usia */}
      <Card
        className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={() => onCardClick("usia")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Avg
            </span>
          </div>
          <p className="text-sm text-orange-100 mb-1">Rata-rata Usia</p>
          <p className="text-4xl font-bold mb-2">{averageAge}</p>
          <p className="text-xs text-orange-100">Bulan per SOP</p>
        </CardContent>
      </Card>
    </div>
  );
}