import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';

// Layouts & Security
import DashboardLayout from './layouts/DashboardLayout';
import StudentLayout from './layouts/StudentLayout';
import RoleBasedRoute from './components/RoleBasedRoute';
import RoleRedirector from './components/RoleRedirector';

// Shared
import Login from './pages/auth/Login';
import Profile from './pages/shared/Profile';

// Admin Portal
import DashboardAdmin from './pages/admin-portal/DashboardAdmin';
import QRCodeAdmin from './pages/admin-portal/QRCodeAdmin';
import KelolaSiswa from './pages/admin-portal/KelolaSiswa';
import KelolaKelas from './pages/admin-portal/KelolaKelas';
import KelolaPresensi from './pages/admin-portal/KelolaPresensi';
import KoreksiPresensi from './pages/admin-portal/KoreksiPresensi';
import LaporanAdmin from './pages/admin-portal/LaporanAdmin';

// Siswa Portal
import DashboardSiswa from './pages/siswa-portal/DashboardSiswa';
import PresensiSiswa from './pages/siswa-portal/PresensiSiswa';
import RiwayatSiswa from './pages/siswa-portal/RiwayatSiswa';
import RekapSiswa from './pages/siswa-portal/RekapSiswa';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><h2>Memuat Sistem...</h2></div>;
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            padding: '16px',
            color: '#374151',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={!user ? <Login /> : <Navigate to="/redirect" />} />
          <Route path="/redirect" element={<RoleRedirector user={user} />} />
          
          {/* Portal Admin */}
          <Route element={<RoleBasedRoute user={user} allowedRole="admin" />}>
            <Route element={<DashboardLayout user={user} />}>
              <Route path="/admin/dashboard" element={<DashboardAdmin />} />
              <Route path="/admin/QRCode" element={<QRCodeAdmin />} />
              <Route path="/admin/siswa" element={<KelolaSiswa />} />
              <Route path="/admin/kelas" element={<KelolaKelas />} />
              <Route path="/admin/presensi" element={<KelolaPresensi />} />
              <Route path="/admin/koreksi" element={<KoreksiPresensi />} />
              <Route path="/admin/laporan" element={<LaporanAdmin />} />
              <Route path="/admin/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Portal Siswa */}
          <Route element={<RoleBasedRoute user={user} allowedRole="siswa" />}>
            <Route element={<StudentLayout user={user} />}>
              <Route path="/siswa/dashboard" element={<DashboardSiswa />} />
              <Route path="/siswa/presensi" element={<PresensiSiswa />} />
              <Route path="/siswa/riwayat" element={<RiwayatSiswa />} />
              <Route path="/siswa/rekap" element={<RekapSiswa />} />
              <Route path="/siswa/profile" element={<Profile />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
