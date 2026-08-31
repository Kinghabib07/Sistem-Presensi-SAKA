import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { ref, get, child } from 'firebase/database';
import { LogOut, LayoutDashboard, Users, User, Menu, X, BookOpen, QrCode, FileSpreadsheet, Edit3, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) return;
      try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${user.uid}`));
        
        if (snapshot.exists()) {
          setUserData(snapshot.val());
        }
      } catch (error) {
        console.error("Gagal mengambil data user:", error);
      }
    }
    fetchUserRole();
  }, [user]);

  // Tutup sidebar setiap kali pindah halaman di HP
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin keluar dari sistem?");
    if (confirm) {
      await signOut(auth);
      navigate('/');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'QR Code', path: '/admin/QRCode', icon: <QrCode size={20} /> },
    { name: 'Kelola Siswa', path: '/admin/siswa', icon: <Users size={20} /> },
    { name: 'Kelola Kelas', path: '/admin/kelas', icon: <BookOpen size={20} /> },
    { name: 'Kelola Presensi', path: '/admin/presensi', icon: <FileSpreadsheet size={20} /> },
    { name: 'Koreksi Presensi', path: '/admin/koreksi', icon: <Edit3 size={20} /> },
    { name: 'Laporan / Rekap', path: '/admin/laporan', icon: <FileText size={20} /> },
    { name: 'Profil Saya', path: '/admin/profile', icon: <User size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
      
      {/* Mobile Header (Topbar khusus HP) */}
      <div className="mobile-header" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="/logo_saka.png" 
            alt="Logo SMAN 1 Karangmojo" 
            style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
          />
          <h2 style={{ 
              fontFamily: 'Outfit', 
              fontSize: '1.25rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
          }}>SIPRES SAKA</h2>
        </div>
        <button className="btn-icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay Background (ketika Sidebar terbuka di HP) */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ 
        width: '280px', 
        flexShrink: 0,
        background: 'var(--surface-glass)', 
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border)',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <img 
              src="/logo_saka.png" 
              alt="Logo" 
              style={{ width: '54px', height: '54px', objectFit: 'contain' }} 
            />
            <div>
              <h2 style={{ 
                fontFamily: 'Outfit', 
                fontSize: '1.45rem',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
                whiteSpace: 'nowrap'
              }}>SIPRES SAKA</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem', whiteSpace: 'nowrap' }}>Dashboard Admin</p>
            </div>
          </div>
          {/* Tombol Silang (X) hanya muncul di HP saat sidebar terbuka */}
          <button 
            className="btn-icon" 
            style={{ display: window.innerWidth > 1024 ? 'none' : 'flex' }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
          {navItems.map((item) => {
            if (item.hideFor && userData && item.hideFor.includes(userData.role)) return null;
            
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  textDecoration: 'none',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  transition: 'var(--transition)'
                }}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-solid)' }}>
          {userData && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600 }}>{userData.nama_lengkap}</div>
              <div className="badge badge-info" style={{ marginTop: '0.25rem' }}>{userData.role}</div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
              border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600,
              cursor: 'pointer', transition: 'var(--transition)'
            }}
          >
            <LogOut size={20} />
            Keluar Sistem
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ flex: 1, padding: '3rem', position: 'relative', overflowX: 'hidden' }}>
        <div className="bg-shape shape-1" style={{ position: 'absolute' }}></div>
        <div className="bg-shape shape-2" style={{ position: 'absolute' }}></div>
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <Outlet context={{ userData }} />
        </div>
      </div>
    </div>
  );
}
