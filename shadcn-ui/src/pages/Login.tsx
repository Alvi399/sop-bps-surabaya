import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthService } from "@/lib/auth";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      const errorMsg = err.message || "Login gagal. Periksa email dan password Anda.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: "admin@bps-surabaya.go.id", role: "Administrator", password: "Sby123456" },
    { email: "kepala@bps-surabaya.go.id", role: "Kepala Bagian", password: "Sby123456" },
    { email: "staf1@bps-surabaya.go.id", role: "Staf", password: "Sby123456" },
  ];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/pegawai.JPG)" }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-10" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/1200px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png"
            alt="Logo BPS"
            className="h-16 w-16 mx-auto mb-4 drop-shadow-lg bg-white p-2 rounded-full"
          />
          <h1 className="text-2xl font-bold text-white drop-shadow-md">E-SOPRA</h1>
          <p className="text-gray-100">Electronic SOP BPS Kota Surabaya</p>
        </div>

        <Card className="bg-white/70 shadow-2xl border border-white/40 backdrop-saturate-150">
          <CardHeader>
            <CardTitle className="text-black">Masuk ke Sistem</CardTitle>
            <CardDescription className="text-black">
              Masukkan kredensial Anda untuk mengakses dashboard SOP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">Email</Label>
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
                <Label htmlFor="password" className="text-black">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                Masuk
              </Button>

              <div className="text-center text-sm text-black mt-3">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-blue-600 hover:text-blue-400 font-medium"
                >
                  Daftar di sini
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* <Card className="bg-white/80 shadow-lg border border-white/40">
          <CardHeader>
            <CardTitle className="text-sm">Akun Demo</CardTitle>
            <CardDescription className="text-xs">
              Klik email untuk auto-fill
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demoAccounts.map((account, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-left"
                  >
                    {account.email}
                  </button>
                  <span className="text-gray-500 text-xs">{account.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}