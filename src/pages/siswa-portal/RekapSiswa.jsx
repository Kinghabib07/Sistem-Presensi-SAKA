import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ref, get, child } from 'firebase/database';
import { db } from '../../services/firebase';

export default function RekapSiswa() {
  const { userData } = useOutletContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [bulan, setBulan] = useState(new Date().getMonth() + 1); // 1-12
  const [tahun, setTahun] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchRiwayat() {
      if (!userData) return;
      setLoading(true);
      try {
        const snapshot = await get(ref(db, 'presensi'));
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const arr = [];
          Object.keys(rawData).forEach(date => {
            const dateData = rawData[date];
            if (dateData[userData.uid]) {
              arr.push({ id: date, ...dateData[userData.uid] });
            }
          });
          setData(arr);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
      setLoading(false);
    }
    fetchRiwayat();
  }, [userData]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dateObj = new Date(item.tanggal);
      return (dateObj.getMonth() + 1) === Number(bulan) && dateObj.getFullYear() === Number(tahun);
    }).sort((a, b) => new Date(a.waktu) - new Date(b.waktu));
  }, [data, bulan, tahun]);

  const stats = useMemo(() => {
    const hadir = filteredData.filter(i => i.status === 'Hadir').length;
    const lambat = filteredData.filter(i => i.status === 'Terlambat').length;
    const absen = filteredData.filter(i => i.status === 'Absen').length;
    return { hadir, lambat, absen, total: filteredData.length };
  }, [filteredData]);

  return (
    <div>
      <h1 className="page-title mb-6">Rekap Presensi Bulanan</h1>
      
      <div className="card mb-6">
        <h3 className="mb-4">Filter Pencarian</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Bulan</label>
            <select className="form-control" value={bulan} onChange={e => setBulan(e.target.value)}>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Tahun</label>
            <select className="form-control" value={tahun} onChange={e => setTahun(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
          <div className="stat-title">Hadir Tepat Waktu</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.hadir}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--warning)' }}>
          <div className="stat-title">Terlambat</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.lambat}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--danger)' }}>
          <div className="stat-title">Absen / Tidak Valid</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.absen}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Waktu Scan</th>
                <th>Status Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="text-center">Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="3" className="text-center text-muted">Tidak ada data di bulan ini.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.tanggal}</strong></td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {new Date(item.waktu).toLocaleTimeString('id-ID')} WIB
                    </td>
                    <td>
                      <span className={`badge badge-${item.status === 'Hadir' ? 'success' : item.status === 'Terlambat' ? 'warning' : 'danger'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
