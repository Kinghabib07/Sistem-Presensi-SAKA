import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, push, get, child, serverTimestamp } from 'firebase/database';

export default function Pelanggaran() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [jenisPelanggaran, setJenisPelanggaran] = useState('');
  const [poin, setPoin] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snapshot = await get(child(ref(db), 'pelanggaran'));
      if (snapshot.exists()) {
        const dataObj = snapshot.val();
        const dataArr = Object.keys(dataObj).map(key => ({
          id: key,
          ...dataObj[key]
        }));
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
      await push(ref(db, 'pelanggaran'), {
        nama,
        kelas,
        jenisPelanggaran,
        poin: Number(poin),
        waktu: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
      setNama('');
      setKelas('');
      setJenisPelanggaran('');
      setPoin(0);
      fetchData(); // Refresh data
      alert("Data pelanggaran berhasil disimpan!");
    } catch (error) {
      alert("Gagal menyimpan data.");
    }
  };

  return (
    <div>
      <h1 className="page-title mb-6">Pencatatan Pelanggaran Siswa</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Formulir Input Baru</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Nama Siswa</label>
            <input type="text" className="form-control" value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Misal: Andi Wijaya" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Kelas</label>
            <input type="text" className="form-control" value={kelas} onChange={(e) => setKelas(e.target.value)} required placeholder="Misal: XI IPS 2" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Jenis Pelanggaran</label>
            <input type="text" className="form-control" value={jenisPelanggaran} onChange={(e) => setJenisPelanggaran(e.target.value)} required placeholder="Misal: Seragam tidak rapi" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Poin Pelanggaran</label>
            <input type="number" className="form-control" value={poin} onChange={(e) => setPoin(e.target.value)} required min="1" placeholder="Misal: 10" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>Simpan Catatan Pelanggaran</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Riwayat Pelanggaran</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Pelanggaran</th>
                <th>Poin</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">Belum ada catatan pelanggaran.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.9rem' }}>{new Date(item.waktu).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}</td>
                    <td><strong>{item.nama}</strong></td>
                    <td>{item.kelas}</td>
                    <td>{item.jenisPelanggaran}</td>
                    <td><span className="badge badge-danger">+{item.poin} Poin</span></td>
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
