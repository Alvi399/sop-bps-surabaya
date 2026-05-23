import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Index from './pages/Index';
import Management from './pages/Management';
import CreateSOP from './pages/CreateSOP';
import Revision from './pages/Revision';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import EditPDF from './pages/EditPDF';
import EditSOP from './pages/EditSOP'; // ✅ halaman baru untuk edit metadata + PDF

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* 🔐 Halaman autentikasi */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 🏠 Dashboard utama */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />

          {/* 📄 Manajemen SOP */}
          <Route
            path="/management"
            element={
              <ProtectedRoute>
                <Management />
              </ProtectedRoute>
            }
          />

          {/* ➕ Buat SOP Baru */}
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateSOP />
              </ProtectedRoute>
            }
          />

          {/* ✏️ Edit SOP (metadata & PDF) */}
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'kepala_bagian']}>
                <EditSOP />
              </ProtectedRoute>
            }
          />

          {/* 📝 Edit PDF langsung (opsional) */}
          <Route
            path="/edit-pdf/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'kepala_bagian']}>
                <EditPDF />
              </ProtectedRoute>
            }
          />

          {/* 🧾 Halaman Revisi */}
          <Route
            path="/revision"
            element={
              <ProtectedRoute requiredRoles={['admin', 'kepala_bagian']}>
                <Revision />
              </ProtectedRoute>
            }
          />

          {/* ⚙️ Pengaturan */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* 🚫 Halaman tidak ditemukan */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
