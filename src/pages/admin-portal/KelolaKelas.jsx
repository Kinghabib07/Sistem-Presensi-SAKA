import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { Trash2 } from 'lucide-react';

export default function KelolaKelas() {
  const [kelasList, setKelasList] = useState([]);
  const [newKelas, setNewKelas] = useState('');

  useEffect(() => {
    const kelasRef = ref(db, 'kelas');
    const unsubscribe = onValue(kelasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Mengurutkan kelas berdasarkan abjad
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a,b) => a.nama.localeCompare(b.nama));
        setKelasList(list);
      } else {
        setKelasList([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddKelas = async (e) => {
    e.preventDefault();
    if (!newKelas.trim()) return;
    
    // Cek duplikat
    if (kelasList.find(k => k.nama.toLowerCase() === newKelas.trim().toLowerCase())) {
        alert('Kelas ini sudah ada!');
        return;
    }

    const kelasRef = ref(db, 'kelas');
    const newRef = push(kelasRef);
    await set(newRef, { nama: newKelas.trim() });
    setNewKelas('');
  };

  const handleDelete = async (id, nama) => {
    if (window.confirm(`Yakin ingin menghapus kelas ${nama}?\nPastikan tidak ada siswa yang masih berada di kelas ini.`)) {
      await remove(ref(db, `kelas/${id}`));
    }
  };

  return (
    <div>
      <h1 className="page-title mb-6">Master Data: Kelola Kelas</h1>
      <p className="text-muted mb-8">Tambahkan daftar kelas sebelum menginput data siswa.</p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
            <div className="card">
                <h3 className="mb-4">Tambah Kelas Baru</h3>
                <form onSubmit={handleAddKelas}>
                    <div className="form-group">
                        <label className="form-label">Nama Kelas</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Contoh: X IPA 1"
                            value={newKelas}
                            onChange={(e) => setNewKelas(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Simpan Kelas</button>
                </form>
            </div>
        </div>

        <div style={{ flex: '2 1 500px' }}>
            <div className="card">
                <h3 className="mb-4">Daftar Kelas Aktif</h3>
                <div className="table-responsive">
                <table className="table">
                    <thead>
                    <tr>
                        <th width="50">No</th>
                        <th>Nama Kelas</th>
                        <th width="100" style={{ textAlign: 'center' }}>Aksi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {kelasList.length === 0 ? (
                        <tr><td colSpan="3" className="text-center text-muted" style={{ padding: '2rem' }}>Belum ada data kelas.</td></tr>
                    ) : (
                        kelasList.map((k, index) => (
                        <tr key={k.id}>
                            <td>{index + 1}</td>
                            <td style={{ fontWeight: 600 }}>{k.nama}</td>
                            <td style={{ textAlign: 'center' }}>
                            <button onClick={() => handleDelete(k.id, k.nama)} className="btn-icon" style={{ color: 'var(--danger)', margin: '0 auto' }}>
                                <Trash2 size={18} />
                            </button>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
