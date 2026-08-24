import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthService } from "@/lib/auth";
import { Loader2, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await AuthService.login(email, password);
      if (user) {
        toast.success(`Selamat datang, ${user.fullName || user.full_name}!`);
        navigate("/");
      }
    } catch (err: any) {
      let errorMsg = err.message || "Login gagal. Periksa email dan password Anda.";
      if (errorMsg.toLowerCase().includes("invalid credentials")) {
        errorMsg = "User tidak ditemukan atau password salah. Silakan periksa kembali.";
      }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* 🖼️ Background Image - clearly visible with gentle mode-aware overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: "url('/images/pegawai.JPG')" }}
      />
      {/* Subtle overlay: gentle in light mode, comfortable translucent tint in dark mode */}
      <div className="absolute inset-0 bg-black/20 dark:bg-slate-950/50 backdrop-blur-[1px] transition-colors duration-300" />

      {/* 🌓 Top-Right Theme Toggle Button */}
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
            E-SOPRA
          </h1>
          <p className="text-white text-sm font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Electronic SOP BPS Kota Surabaya
          </p>
        </div>

        {/* 📋 Login Card - Glassmorphism adapting to Light and Dark Mode */}
        <Card className="bg-white/90 dark:bg-slate-900/90 shadow-2xl border border-white/70 dark:border-slate-700/80 backdrop-blur-md rounded-2xl transition-all duration-200">
          <CardHeader className="space-y-1.5 pb-4 text-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Masuk ke Sistem
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300 text-xs font-medium">
              Masukkan kredensial akun BPS Anda untuk mengakses sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10 bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 font-medium"
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

              {error && (
                <Alert variant="destructive" className="py-2.5 bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-150"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>

              <div className="text-center text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  Daftar di sini
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}