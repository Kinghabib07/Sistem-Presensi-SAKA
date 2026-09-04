import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, push, get, child, serverTimestamp } from 'firebase/database';

export default function Izin() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [alasan, setAlasan] = useState('');
  const [penjemput, setPenjemput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snapshot = await get(child(ref(db), 'izin'));
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
      await push(ref(db, 'izin'), {
        nama,
        kelas,
        alasan,
        penjemput,
        waktu: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
      setNama('');
      setKelas('');
      setAlasan('');
      setPenjemput('');
      fetchData(); // Refresh data
      alert("Surat izin berhasil diterbitkan!");
    } catch (error) {
      alert("Gagal menyimpan data.");
    }
  };

  return (
    <div>
      <h1 className="page-title mb-6">Penerbitan Surat Izin</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Formulir Izin Pulang / Keluar</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Nama Siswa</label>
            <input type="text" className="form-control" value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Misal: Siti Aminah" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Kelas</label>
            <input type="text" className="form-control" value={kelas} onChange={(e) => setKelas(e.target.value)} required placeholder="Misal: XII Bahasa" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Alasan Izin</label>
            <input type="text" className="form-control" value={alasan} onChange={(e) => setAlasan(e.target.value)} required placeholder="Misal: Sakit perut / Acara keluarga" />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Nama Penjemput (Opsional)</label>
            <input type="text" className="form-control" value={penjemput} onChange={(e) => setPenjemput(e.target.value)} placeholder="Misal: Ayah (Bpk. Joko)" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, var(--success) 0%, #047857 100%)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>Terbitkan Surat Izin</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Riwayat Izin Diterbitkan</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu Keluar</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Alasan</th>
                <th>Penjemput</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">Belum ada catatan izin.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.9rem' }}>{new Date(item.waktu).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}</td>
                    <td><strong>{item.nama}</strong></td>
                    <td>{item.kelas}</td>
                    <td><span className="badge badge-success">{item.alasan}</span></td>
                    <td>{item.penjemput || '-'}</td>
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
