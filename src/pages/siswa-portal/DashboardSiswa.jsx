import { useOutletContext, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ref, query, orderByChild, equalTo, get, child } from 'firebase/database';
import { db } from '../../services/firebase';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

export default function DashboardSiswa() {
  const { userData } = useOutletContext();
  const [statusHariIni, setStatusHariIni] = useState(null); // null = belum, 'Hadir', 'Terlambat', 'Absen'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkTodayAttendance() {
      if (!userData) return;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      try {
        const presensiRef = ref(db, `presensi/${userData.uid}`);
        const snapshot = await get(presensiRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Cari apakah ada presensi hari ini
          const recordHariIni = Object.values(data).find(item => item.tanggal === today);
          if (recordHariIni) {
            setStatusHariIni(recordHariIni.status);
          } else {
            setStatusHariIni(null); // Belum presensi
          }
        }
      } catch (error) {
        console.error("Gagal mengecek presensi", error);
      }
      setLoading(false);
    }
    checkTodayAttendance();
  }, [userData]);

  if (loading) return <div>Memuat...</div>;

  return (
    <div>
      <h1 className="page-title mb-2">Halo, {userData?.nama_lengkap || 'Siswa'}! 👋</h1>
      <p className="text-muted mb-8">Selamat datang di portal presensi digital.</p>

      <div className="card text-center" style={{ padding: '3rem 2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Status Presensi Hari Ini</h3>
        
        {statusHariIni === null ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <Clock size={64} color="var(--warning)" />
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Belum Melakukan Presensi</h2>
            <Link to="/siswa/presensi" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
              Lakukan Presensi Sekarang
            </Link>
          </div>
        ) : statusHariIni === 'Hadir' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={64} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '2rem', color: 'var(--success)', marginBottom: '0.5rem' }}>Hadir Tepat Waktu</h2>
            <p className="text-muted">Terima kasih telah datang tepat waktu!</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <XCircle size={64} color="var(--danger)" />
            </div>
            <h2 style={{ fontSize: '2rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>{statusHariIni}</h2>
            <p className="text-muted">Data presensi Anda telah tercatat.</p>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Kelas Anda</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{userData?.kelas || 'Belum diatur'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">NIS / UID</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{userData?.uid?.substring(0, 8) || '-'}</div>
        </div>
      </div>
    </div>
  );
}
