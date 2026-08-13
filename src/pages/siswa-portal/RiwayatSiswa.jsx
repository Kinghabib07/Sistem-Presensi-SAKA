import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ref, get, child } from 'firebase/database';
import { db } from '../../services/firebase';

export default function RiwayatSiswa() {
  const { userData } = useOutletContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRiwayat() {
      if (!userData) return;
      setLoading(true);
      try {
        const snapshot = await get(child(ref(db), `presensi/${userData.uid}`));
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const arr = Object.keys(rawData).map(key => ({ id: key, ...rawData[key] }));
          // Urutkan dari yang terbaru (descending)
          arr.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
          setData(arr);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Gagal mengambil riwayat:", error);
      }
      setLoading(false);
    }
    fetchRiwayat();
  }, [userData]);

  return (
    <div>
      <h1 className="page-title mb-6">Riwayat Presensi</h1>
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
              ) : data.length === 0 ? (
                <tr><td colSpan="3" className="text-center text-muted">Belum ada riwayat presensi.</td></tr>
              ) : (
                data.map((item) => (
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
