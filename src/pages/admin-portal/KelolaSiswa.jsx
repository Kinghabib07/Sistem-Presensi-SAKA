import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, get, child } from 'firebase/database';

export default function KelolaSiswa() {
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    setLoading(true);
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, 'siswa'));
      if (snapshot.exists()) {
        const dataObj = snapshot.val();
        // Convert object to array
        const dataArr = Object.keys(dataObj).map(key => ({
          id: key,
          ...dataObj[key]
        }));
        setSiswa(dataArr);
      } else {
        setSiswa([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data siswa:", error);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title">Kelola Data Siswa</h1>
        <button className="btn btn-primary">
          + Tambah Siswa Baru
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>NIS</th>
                <th>Nama Lengkap</th>
                <th>Kelas</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center">Memuat data...</td></tr>
              ) : siswa.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted">Belum ada data siswa di database.</td></tr>
              ) : (
                siswa.map((s) => (
                  <tr key={s.id}>
                    <td>{s.nis}</td>
                    <td><strong>{s.nama}</strong></td>
                    <td>{s.kelas}</td>
                    <td>
                      <button className="badge badge-info" style={{ border: 'none', cursor: 'pointer' }}>Edit</button>
                      <button className="badge badge-danger" style={{ border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}>Hapus</button>
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
