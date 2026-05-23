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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import axios from "axios";
import { toast } from "sonner";

const API_URL = "http://localhost:8000/api";

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
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Load user data dan notifications
  useEffect(() => {
    loadUserData();
    loadNotifications();
  }, []);

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

      setUser(response.data);
    } catch (error: any) {
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

      // Filter only recent activities (last 24 hours)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentActivities = response.data.filter((activity: ActivityLog) => {
        const activityDate = new Date(activity.created_at);
        return activityDate >= oneDayAgo;
      });

      setNotifications(recentActivities.slice(0, 5)); // Latest 5
      setUnreadCount(recentActivities.length);
    } catch (error) {
      console.error("Error loading notifications:", error);
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
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {/* 🔍 Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari SOP, dokumen, atau aktivitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>
        </form>

        {/* 🔔 Notifications & User Menu */}
        <div className="flex items-center space-x-4">
          {/* 🔔 Notifikasi */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative hover:bg-gray-100 transition-colors"
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
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifikasi Terbaru</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} baru
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Tidak ada notifikasi baru</p>
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
                        className="flex items-start gap-3 py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 ${actionStyle.bg} rounded-full flex items-center justify-center text-base`}>
                          {actionStyle.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
                            {notif.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${actionStyle.color} font-medium`}>
                              {notif.action}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                    onClick={() => navigate("/management")}
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
                className="flex items-center space-x-2 hover:bg-gray-100 transition-colors"
              >
                <Avatar className="h-8 w-8 border-2 border-gray-200">
                  <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name || "Loading..."}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role ? getRoleLabel(user.role) : ""}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-gray-200">
                    <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {user?.full_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    {user?.department && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {user.department}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => navigate("/settings")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
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