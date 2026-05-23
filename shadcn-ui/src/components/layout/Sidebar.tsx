import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AuthService } from "@/lib/auth";
import {
  LayoutDashboard,
  FileText,
  Plus,
  History,
  Settings,
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

interface SidebarProps {
  activeMenu?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  avatar_url?: string;
}

export default function Sidebar({ activeMenu }: SidebarProps) {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch user data from backend
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = AuthService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading user:", error);
      if (error.response?.status === 401) {
        AuthService.logout();
        window.location.href = "/login";
      }
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard Utama",
      icon: LayoutDashboard,
      href: "/",
      roles: ["admin", "kepala_bagian", "ketua_tim", "staf"],
    },
    {
      id: "management",
      label: "Manajemen SOP",
      icon: FileText,
      href: "/management",
      roles: ["admin", "kepala_bagian", "ketua_tim", "staf"],
    },
    {
      id: "create",
      label: "Buat SOP Baru",
      icon: Plus,
      href: "/create",
      roles: ["admin", "kepala_bagian", "ketua_tim", "staf"],
    },
    {
      id: "revision",
      label: "Revisi & Riwayat",
      icon: History,
      href: "/revision",
      roles: ["admin", "kepala_bagian", "ketua_tim"], // ✅ Sesuaikan dengan backend
    },
    {
      id: "settings",
      label: "Pengaturan",
      icon: Settings,
      href: "/settings",
      roles: ["admin", "kepala_bagian", "ketua_tim", "staf"],
    },
  ];

  // ✅ Filter menu berdasarkan role user
  const filteredMenuItems = user 
    ? menuItems.filter((item) => item.roles.includes(user.role))
    : menuItems;

  // ✅ Check if current path is active
  const isActive = (href: string, id: string) => {
    // Jika ada activeMenu prop, prioritaskan itu
    if (activeMenu) {
      return activeMenu === id;
    }
    
    // Jika tidak, gunakan location pathname
    if (href === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  // ✅ Get role display label
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrator",
      kepala_bagian: "Kepala Bagian",
      ketua_tim: "Ketua Tim",
      staf: "Staf",
    };
    return roles[role] || role;
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col z-50">
      {/* 🔷 Logo */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/1200px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png"
            alt="Logo BPS"
            className="h-10 w-10 drop-shadow-md"
          />
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              SOP BPS
            </h2>
            <p className="text-sm text-gray-600">Kota Surabaya</p>
          </div>
        </div>
      </div>

      {/* 📋 Navigasi Menu */}
      <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.id);

              return (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50 scale-105"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:scale-102"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-transform",
                          active ? "text-white scale-110" : "text-gray-500"
                        )}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* 👤 User Info di Bawah */}
      {user && (
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100">
            <Avatar className="h-10 w-10 border-2 border-blue-200 shadow-sm">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {user.full_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {getRoleLabel(user.role)}
              </p>
              {user.department && (
                <p className="text-xs text-gray-400 truncate">
                  {user.department}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Loading state untuk user info */}
      {loading && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}