import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { AuthService } from "@/lib/auth";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  const daftarSeksi = [
    "Umum",
    "Humas, Pojok Statistik dan PSS",
    "IPDS",
    "Statistik Sosial",
    "Statistik Produksi",
    "Nerwilis",
    "SAKIP, ZI dan EPSS",
    "Statistik Harga",
    "Statistik Distribusi dan Jasa Keuangan",
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi email
    if (!email.endsWith("@bps-surabaya.go.id")) {
      setError("Gunakan email resmi BPS (bps-surabaya.go.id)");
      return;
    }

    // Validasi password
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    // Validasi departemen
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
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
      style={{ backgroundImage: `url('/images/pegawai.JPG')` }}
    >
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/1200px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png"
            alt="Logo BPS"
            className="h-16 w-16 mx-auto mb-4 bg-white p-2 rounded-full shadow-md"
          />
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Pendaftaran Akun</h1>
          <p className="text-gray-100">Sistem SOP BPS Kota Surabaya</p>
        </div>

        <Card className="bg-white/80 shadow-2xl border border-white/40 backdrop-saturate-150">
          <CardHeader>
            <CardTitle>Buat Akun Baru</CardTitle>
            <CardDescription className="text-black">
              Daftarkan diri Anda untuk mendapatkan akses sistem SOP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email BPS</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@bps-surabaya.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Seksi / Tim</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Seksi/Tim Anda" />
                  </SelectTrigger>
                  <SelectContent>
                    {daftarSeksi.map((seksi, index) => (
                      <SelectItem key={index} value={seksi}>
                        {seksi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon (Opsional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08xx-xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Daftar
              </Button>

              <div className="text-center text-sm text-black mt-3">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-blue-600 hover:text-blue-400 font-medium"
                >
                  Masuk di sini
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="bg-white/50 backdrop-blur-sm hover:bg-white/90"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Login
          </Button>
        </div>
      </div>
    </div>
  );
}