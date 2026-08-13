import { useOutletContext } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const { userData } = useOutletContext();

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Ringkasan Hari Ini</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>
          Selamat datang kembali, <strong>{userData ? userData.nama_lengkap : 'Memuat...'}</strong>
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Total Siswa Terdaftar</div>
              <div className="stat-value">0</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: 'var(--radius-full)', color: 'var(--primary)' }}>
              <Users size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Pelanggaran Baru</div>
              <div className="stat-value">0</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-full)', color: 'var(--danger)' }}>
              <AlertTriangle size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Log Terkini (Dummy)</h2>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="2" className="text-muted text-center">Belum ada aktivitas. Silakan kelola data siswa terlebih dahulu.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
