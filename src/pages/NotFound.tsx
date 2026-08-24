import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 text-center relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="space-y-8 max-w-2xl relative z-10">
        {/* Logo BPS */}
        <div className="flex justify-center mb-6">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/1200px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png"
            alt="Logo BPS"
            className="h-16 w-16 opacity-50"
          />
        </div>

        {/* 404 Illustration */}
        <div className="relative">
          <div className="flex items-center justify-center gap-4 mb-6">
            <FileQuestion className="h-20 w-20 text-blue-400 animate-pulse" />
            <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
              404
            </h1>
            <FileQuestion className="h-20 w-20 text-purple-400 animate-pulse" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3 bg-white/60 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
          <h2 className="text-3xl font-bold text-gray-800">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Maaf, halaman yang Anda cari tidak ada atau mungkin telah dipindahkan.
            Silakan kembali ke dashboard atau gunakan menu navigasi.
          </p>

          {/* Helpful Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-800 flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              Coba gunakan pencarian di header untuk menemukan SOP yang Anda butuhkan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate("/dashboard")}
          >
            <Home className="mr-2 h-5 w-5" />
            Kembali ke Dashboard
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="border-2 hover:bg-gray-50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Halaman Sebelumnya
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Tautan Cepat:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="link"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => navigate("/management")}
            >
              Manajemen SOP
            </Button>
            <span className="text-gray-300">•</span>
            <Button
              variant="link"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => navigate("/create")}
            >
              Buat SOP Baru
            </Button>
            <span className="text-gray-300">•</span>
            <Button
              variant="link"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => navigate("/revision")}
            >
              Riwayat Revisi
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="absolute bottom-6 text-xs text-gray-400">
        © {new Date().getFullYear()} BPS Kota Surabaya – Sistem SOP Internal
      </div>
    </div>
  );
}