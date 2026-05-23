import apiClient from './api';
import { User } from '@/types';

export class AuthService {
  private static readonly AUTH_KEY = 'bps_sop_auth';

  // Login with API
  static async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, user } = response.data;

      // Store user and token
      const authData = {
        user,
        token: access_token
      };
      
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(authData));
      window.dispatchEvent(new Event('user-updated'));

      return user;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  // Register with API
  static async register(data: {
    fullName: string;
    email: string;
    department: string;
    phone?: string;
    password: string;
  }): Promise<User> {
    try {
      const response = await apiClient.post('/auth/register', {
        full_name: data.fullName,
        email: data.email,
        department: data.department,
        phone: data.phone || '',
        password: data.password,
        role: 'staf'
      });
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }

  // Get current user from localStorage
  static getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(this.AUTH_KEY);
      if (!data) return null;

      const { user } = JSON.parse(data);
      return user;
    } catch (error) {
      return null;
    }
  }

  // Get current token
  static getToken(): string | null {
    try {
      const data = localStorage.getItem(this.AUTH_KEY);
      if (!data) return null;

      const { token } = JSON.parse(data);
      return token;
    } catch (error) {
      return null;
    }
  }

  // Update user profile
  static async updateCurrentUser(updates: Partial<User>): Promise<void> {
    try {
      const response = await apiClient.put('/auth/profile', {
        full_name: updates.fullName,
        phone: updates.phone,
        avatar_url: updates.avatarUrl
      });
      
      const updatedUser = response.data;

      // Update local storage
      const data = localStorage.getItem(this.AUTH_KEY);
      if (data) {
        const { token } = JSON.parse(data);
        localStorage.setItem(
          this.AUTH_KEY,
          JSON.stringify({ user: updatedUser, token })
        );
        window.dispatchEvent(new Event('user-updated'));
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.response?.data?.detail || 'Update failed');
    }
  }

  // Check authentication
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && this.getToken() !== null;
  }

  // Check role
  static hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return !!user && roles.includes(user.role);
  }

  // Logout
  static logout(): void {
    localStorage.removeItem(this.AUTH_KEY);
    window.dispatchEvent(new Event('user-updated'));
  }

  // Get formatted join date
  static getJoinDateFormatted(user: User | null): string {
    if (!user?.joinDate) return "Jan 2024";
    const date = new Date(user.joinDate);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Get formatted last login
  static getLastLoginFormatted(): string {
    const user = this.getCurrentUser();
    if (!user?.lastLogin) return "Belum pernah login";
    const date = new Date(user.lastLogin);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}