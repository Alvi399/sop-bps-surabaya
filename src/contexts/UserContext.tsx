import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthService } from "@/lib/auth";
import { User } from "@/types";

// 🧩 Struktur context global untuk user
interface UserContextType {
  user: User | null;
  updateUser: (userData: Partial<User>) => void;
  updateAvatar: (avatarUrl: string) => void;
  refreshUser: () => void;
  logout: () => void;
}

// 🔧 Context utama
const UserContext = createContext<UserContextType | undefined>(undefined);

// 🧠 Provider utama (dibungkus di App atau main.tsx)
function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(AuthService.getCurrentUser());

  // 🔁 Sinkronisasi otomatis dengan localStorage & event global
  useEffect(() => {
    const handleUserUpdate = () => {
      const refreshedUser = AuthService.getCurrentUser();
      setUser(refreshedUser);
    };

    handleUserUpdate(); // Jalankan pertama kali
    window.addEventListener("user-updated", handleUserUpdate);
    window.addEventListener("storage", handleUserUpdate);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate);
      window.removeEventListener("storage", handleUserUpdate);
    };
  }, []);

  // 🧠 Update sebagian data user (nama, email, dsb)
  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser: User = { ...user, ...userData };
    setUser(updatedUser);

    // ✅ Simpan ke localStorage & update global user list
    AuthService.updateCurrentUser(updatedUser);
  };

  // 🖼️ Update foto profil user
  const updateAvatar = (avatarUrl: string) => {
    if (!user) return;
    const updatedUser: User = { ...user, avatarUrl };
    setUser(updatedUser);

    // ✅ Simpan avatar permanen di storage
    AuthService.updateCurrentUser(updatedUser);
  };

  // 🔁 Refresh manual data user
  const refreshUser = () => {
    const refreshed = AuthService.getCurrentUser();
    setUser(refreshed);
  };

  // 🚪 Logout user
  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        updateUser,
        updateAvatar,
        refreshUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// 🪄 Hook custom agar mudah digunakan di seluruh komponen
function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export { UserProvider, useUser };
