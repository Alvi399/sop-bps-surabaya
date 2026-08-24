import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { AuthService } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";

import { DEPARTMENTS } from "@/lib/departments";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const daftarSeksi = DEPARTMENTS;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.endsWith("@bps-surabaya.go.id")) {
      setError("Gunakan email resmi BPS (bps-surabaya.go.id)");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    if (!department) {
      setError("Silakan pilih Seksi/Tim Anda");
      return;
    }

    setLoading(true);

    try {
      await AuthService.register({
        fullName,
        email,
        department,
        phone,
        password,
      });

      toast.success("Pendaftaran berhasil! Silakan login.");
      navigate("/login");
    } catch (err: any) {
      const errorMsg = err.message || "Terjadi kesalahan saat registrasi";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-10">
      {/* 🖼️ Background Image - clearly visible with gentle mode-aware overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: "url('/images/pegawai.JPG')" }}
      />
      <div className="absolute inset-0 bg-black/20 dark:bg-slate-950/50 backdrop-blur-[1px] transition-colors duration-300" />

      {/* 🌓 Top-Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 shadow-lg transition-all"
          title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400 mr-2 animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-600 mr-2 animate-in spin-in-180 duration-300" />
          )}
          <span className="text-xs font-semibold">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
        </Button>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Branding */}
        <div className="text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <img
            src="/bps-logo.svg"
            onError={(e) => {
              e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/1200px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png";
            }}
            alt="Logo BPS"
            className="h-16 w-16 mx-auto mb-3 bg-white/95 dark:bg-slate-900/90 p-2.5 rounded-2xl border border-white/60 dark:border-slate-700 shadow-xl object-contain drop-shadow-lg"
          />
          <h1 className="text-3xl font-black text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Pendaftaran Akun
          </h1>
          <p className="text-white text-sm font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Sistem SOP BPS Kota Surabaya
          </p>
        </div>

        {/* 📋 Register Card */}
        <Card className="bg-white/90 dark:bg-slate-900/90 shadow-2xl border border-white/70 dark:border-slate-700/80 backdrop-blur-md rounded-2xl transition-all duration-200">
          <CardHeader className="space-y-1.5 pb-4 text-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Buat Akun Baru
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300 text-xs font-medium">
              Daftarkan diri Anda untuk mendapatkan akses ke sistem SOP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Nama Lengkap
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Email BPS
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@bps-surabaya.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Seksi / Tim
                </Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-10 w-full bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium">
                    <SelectValue placeholder="Pilih Seksi/Tim Anda" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {daftarSeksi.map((seksi, index) => (
                      <SelectItem key={index} value={seksi} className="text-slate-900 dark:text-slate-100">
                        {seksi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No. Telepon (Opsional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08xx-xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10 bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Konfirmasi Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 pr-10 bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 focus:outline-none transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-2.5 bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-150 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mendaftarkan...
                  </>
                ) : (
                  "Daftar Akun"
                )}
              </Button>

              <div className="text-center text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  Masuk di sini
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login")}
            className="text-white hover:text-white hover:bg-white/20 text-xs font-semibold drop-shadow"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Kembali ke Halaman Login
          </Button>
        </div>
      </div>
    </div>
  );
}