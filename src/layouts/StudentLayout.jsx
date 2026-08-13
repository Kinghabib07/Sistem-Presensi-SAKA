import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { ref, get, child } from 'firebase/database';
import { LogOut, LayoutDashboard, QrCode, History, CalendarDays, User, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StudentLayout({ user }) {
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

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard Siswa', path: '/siswa/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Tambah Presensi', path: '/siswa/presensi', icon: <QrCode size={20} /> },
    { name: 'Riwayat Presensi', path: '/siswa/riwayat', icon: <History size={20} /> },
    { name: 'Rekap Presensi', path: '/siswa/rekap', icon: <CalendarDays size={20} /> },
    { name: 'Profil Saya', path: '/siswa/profile', icon: <User size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
      
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2 style={{ 
            fontFamily: 'Outfit', 
            fontSize: '1.25rem',
            background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
        }}>Portal Siswa</h2>
        <button className="btn-icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ 
        width: '280px', 
        background: 'var(--surface-glass)', 
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border)',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ 
              fontFamily: 'Outfit', 
              fontSize: '1.5rem',
              background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Portal Siswa</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Area Siswa</p>
          </div>
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
                  background: isActive ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
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
              <div style={{ fontWeight: 600 }}>{userData.nama_lengkap || 'Siswa'}</div>
              <div className="badge badge-success" style={{ marginTop: '0.25rem' }}>{userData.kelas || 'Siswa'}</div>
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
