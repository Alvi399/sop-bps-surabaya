import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Settings,
  LogOut,
  Search,
  FileText,
  User as UserIcon,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/context/ThemeContext";
import { useRealtimeSubscription } from "@/lib/realtime";
import axios from "axios";
import { toast } from "sonner";

import { API_URL } from "@/lib/api";

interface ActivityLog {
  id: string;
  user_id: string;
  sop_id: string | null;
  action: string;
  description: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  avatar_url?: string;
}

export default function Header() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Load user data dan notifications
  useEffect(() => {
    loadUserData();
    loadNotifications();
  }, []);

  useRealtimeSubscription(() => {
    loadNotifications();
  }, 3000);

  // ✅ Load current user
  const loadUserData = async () => {
    try {
      const token = AuthService.getToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (typeof response.data === 'string' && response.data.includes('<html')) {
        throw new Error('STATIC_HOSTING_FALLBACK');
      }

      setUser(response.data);
    } catch (error: any) {
      const isStatic = error.message === 'STATIC_HOSTING_FALLBACK' || error.response?.status === 404;
      
      if (isStatic) {
        setUser(AuthService.getCurrentUser());
        return;
      }

      console.error("Error loading user:", error);
      if (error.response?.status === 401) {
        AuthService.logout();
        navigate("/login");
      }
    }
  };

  // ✅ Load recent activity logs as notifications
  const loadNotifications = async () => {
    try {
      const token = AuthService.getToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/activities?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle static hosting HTML fallback
      if (typeof response.data === 'string' && response.data.includes('<html')) {
        throw new Error('STATIC_HOSTING_FALLBACK');
      }

      const recentActivities = Array.isArray(response.data) ? response.data : [];
      setNotifications(recentActivities);
      setUnreadCount(recentActivities.length);
    } catch (error) {
      console.warn("Error loading notifications, likely static hosting fallback", error);
      // Optional: mock notifications for static view
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // ✅ Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/management?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(""); // Clear after search
    }
  };

  // ✅ Handle logout
  const handleLogout = () => {
    AuthService.logout();
    toast.success("Berhasil logout");
    navigate("/login");
  };

  // ✅ Get role label
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrator",
      kepala_bagian: "Kepala Bagian",
      ketua_tim: "Ketua Tim",
      staf: "Staf",
    };
    return roles[role] || "Pengguna";
  };

  // ✅ Get action icon and color
  const getActionStyle = (action: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes("create")) {
      return { icon: "📝", color: "text-green-600", bg: "bg-green-50" };
    } else if (actionLower.includes("update") || actionLower.includes("edit")) {
      return { icon: "✏️", color: "text-blue-600", bg: "bg-blue-50" };
    } else if (actionLower.includes("delete")) {
      return { icon: "🗑️", color: "text-red-600", bg: "bg-red-50" };
    } else if (actionLower.includes("approve")) {
      return { icon: "✅", color: "text-green-600", bg: "bg-green-50" };
    } else if (actionLower.includes("reject")) {
      return { icon: "❌", color: "text-red-600", bg: "bg-red-50" };
    }
    
    return { icon: "📋", color: "text-gray-600", bg: "bg-gray-50" };
  };

  // ✅ Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <header className="sticky top-0 z-20 h-16 md:h-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-slate-800 px-3 md:px-6 flex items-center transition-colors duration-200">
      <div className="flex items-center justify-between w-full gap-2 md:gap-4">
        {/* Hamburger Mobile + 🔍 Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
            className="lg:hidden h-9 w-9 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 shrink-0"
            aria-label="Buka Menu Navigasi"
            title="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <form onSubmit={handleSearch} className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 h-4 w-4" />
              <Input
                placeholder="Cari SOP, dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-9 h-9 sm:h-10 text-xs sm:text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors w-full"
              />
            </div>
          </form>
        </div>

        {/* 🔔 Notifications, Theme & User Menu */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* 🌓 Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors"
            title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 animate-in spin-in-180 duration-300" />
            )}
          </Button>

          {/* 🔔 Notifikasi */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifikasi Terbaru</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs dark:bg-slate-800 dark:text-slate-300">
                    {unreadCount} baru
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">Tidak ada notifikasi baru</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const actionStyle = getActionStyle(notif.action);
                    
                    return (
                      <DropdownMenuItem
                        key={notif.id}
                        onClick={() => {
                          if (notif.sop_id) {
                            navigate(`/management`);
                          }
                        }}
                        className="flex items-start gap-3 py-3 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 ${actionStyle.bg} rounded-full flex items-center justify-center text-base`}>
                          {actionStyle.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {notif.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${actionStyle.color} font-medium`}>
                              {notif.action}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">•</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {getRelativeTime(notif.created_at)}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator className="dark:bg-slate-800" />
                  <DropdownMenuItem
                    className="text-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 font-medium"
                    onClick={() => {
                      navigate("/");
                      setTimeout(() => {
                        document.getElementById("aktivitas-sistem")?.scrollIntoView({ behavior: "smooth" });
                      }, 200);
                    }}
                  >
                    Lihat semua aktivitas
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 👤 User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Avatar className="h-8 w-8 border-2 border-gray-200 dark:border-slate-700">
                  <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.full_name || "Loading..."}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {user?.role ? getRoleLabel(user.role) : ""}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-slate-700">
                    <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {user?.full_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                    {user?.department && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                        {user.department}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              
              <DropdownMenuItem 
                onClick={() => navigate("/settings")}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}