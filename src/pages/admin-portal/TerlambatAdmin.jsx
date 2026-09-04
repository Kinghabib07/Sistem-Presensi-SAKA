import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, push, get, child, serverTimestamp } from 'firebase/database';

export default function Terlambat() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [alasan, setAlasan] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snapshot = await get(child(ref(db), 'terlambat'));
      if (snapshot.exists()) {
        const dataObj = snapshot.val();
        const dataArr = Object.keys(dataObj).map(key => ({
          id: key,
          ...dataObj[key]
        }));
        // Sort descending based on timestamp if exists
        dataArr.reverse(); 
        setData(dataArr);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await push(ref(db, 'terlambat'), {
        nama,
        kelas,
        alasan,
        waktu: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
      setNama('');
      setKelas('');
      setAlasan('');
      fetchData(); // Refresh data
      alert("Data keterlambatan berhasil disimpan!");
    } catch (error) {
      alert("Gagal menyimpan data.");
    }
  };

  return (
    <div>
      <h1 className="page-title mb-6">Pencatatan Siswa Terlambat</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Formulir Input Baru</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Nama Siswa</label>
            <input type="text" className="form-control" value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Misal: Budi Santoso" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Kelas</label>
            <input type="text" className="form-control" value={kelas} onChange={(e) => setKelas(e.target.value)} required placeholder="Misal: X MIPA 1" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '0' }}>
            <label className="form-label">Alasan Keterlambatan</label>
            <input type="text" className="form-control" value={alasan} onChange={(e) => setAlasan(e.target.value)} required placeholder="Misal: Macet parah di jalan / Bangun kesiangan" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Simpan Catatan Keterlambatan</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Riwayat Keterlambatan</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted">Belum ada catatan keterlambatan.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.9rem' }}>{new Date(item.waktu).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}</td>
                    <td><strong>{item.nama}</strong></td>
                    <td><span className="badge badge-warning">{item.kelas}</span></td>
                    <td>{item.alasan}</td>
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
