import { useState, useEffect, useRef } from 'react';
import { db, secondaryAuth } from '../../services/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Trash2, UploadCloud, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function KelolaSiswa() {
  const [siswaList, setSiswaList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [newNis, setNewNis] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('');

  useEffect(() => {
    // Ambil data siswa
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(u => u.role === 'siswa')
          .sort((a,b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
        setSiswaList(list);
      } else {
        setSiswaList([]);
      }
    });

    // Ambil data kelas
    const kelasRef = ref(db, 'kelas');
    const unsubKelas = onValue(kelasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => data[key].nama).sort();
        setKelasList(list);
        if (list.length > 0) setNewKelas(list[0]);
      } else {
        setKelasList([]);
      }
    });

    return () => {
      unsubUsers();
      unsubKelas();
    };
  }, []);

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!newNis || !newNama || !newKelas) return;
    setLoading(true);
    
    try {
      const email = `${newNis.trim()}@sekolah.id`;
      // Pakai secondaryAuth agar admin tidak ter-logout
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, 'siswa123');
      
      await set(ref(db, `users/${cred.user.uid}`), {
        uid: cred.user.uid,
        nama_lengkap: newNama.trim(),
        kelas: newKelas,
        role: 'siswa',
        nis: newNis.trim()
      });

      alert(`Berhasil menambahkan siswa ${newNama}!\nUsername: ${newNis}\nPassword default: siswa123`);
      setNewNis(''); setNewNama('');
    } catch (err) {
      alert('Gagal! Mungkin NIS tersebut sudah terdaftar.');
    }
    setLoading(false);
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let sukses = 0;
        let gagal = 0;

        for (let row of data) {
          const nis = String(row['NIS'] || row['nis']);
          const nama = String(row['Nama'] || row['nama']);
          const kelas = String(row['Kelas'] || row['kelas']);

          if (nis && nama && kelas && nis !== 'undefined') {
            try {
              const email = `${nis.trim()}@sekolah.id`;
              const cred = await createUserWithEmailAndPassword(secondaryAuth, email, 'siswa123');
              
              await set(ref(db, `users/${cred.user.uid}`), {
                uid: cred.user.uid,
                nama_lengkap: nama.trim(),
                kelas: kelas.trim(),
                role: 'siswa',
                nis: nis.trim()
              });
              sukses++;
            } catch(e) {
              gagal++; // NIS mungkin sudah ada
            }
          }
        }
        alert(`IMPORT EXCEL SELESAI!\n\n✅ Berhasil ditambahkan: ${sukses} siswa\n❌ Gagal/Duplikat NIS: ${gagal} siswa\n\nPassword default untuk semua siswa baru adalah: siswa123`);
      } catch (err) {
        alert('Format Excel tidak dikenali! Pastikan memiliki header kolom: NIS, Nama, Kelas.');
      }
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id, nama) => {
    if (window.confirm(`Yakin ingin menghapus ${nama} dari sistem?`)) {
      await remove(ref(db, `users/${id}`));
      // Idealnya kita juga menghapus dari Firebase Auth via Admin SDK, 
      // tapi via Web SDK kita cukup hapus profilnya agar tidak bisa masuk portal
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
            <h1 className="page-title">Master Data: Siswa</h1>
            <p className="text-muted">Kelola data siswa, tambah manual, atau import massal.</p>
        </div>
        
        {/* Fitur Spesial: Import Excel */}
        <div>
            <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImportExcel} 
            />
            <button 
                className="btn btn-success" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#10b981' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
            >
                <UploadCloud size={20} />
                {loading ? 'Memproses...' : 'Import dari Excel'}
            </button>
            <p className="text-muted mt-2" style={{ fontSize: '0.8rem', textAlign: 'right' }}>Format Excel: Kolom NIS, Nama, Kelas</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Form Tambah Manual */}
        <div style={{ flex: '1 1 300px' }}>
            <div className="card">
                <h3 className="mb-4">Tambah Siswa Manual</h3>
                <form onSubmit={handleAddSingle}>
                    <div className="form-group">
                        <label className="form-label">NIS (Sebagai Username)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={newNis}
                            onChange={(e) => setNewNis(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nama Lengkap</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={newNama}
                            onChange={(e) => setNewNama(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group mb-6">
                        <label className="form-label">Kelas</label>
                        <select 
                            className="form-control"
                            value={newKelas}
                            onChange={(e) => setNewKelas(e.target.value)}
                            required
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading || kelasList.length === 0}>
                        <Plus size={18} /> Simpan Siswa
                    </button>
                    {kelasList.length === 0 && <p className="text-danger mt-2 text-center" style={{ fontSize: '0.8rem' }}>Isi Master Kelas terlebih dahulu!</p>}
                </form>
            </div>
        </div>

        {/* Tabel Siswa */}
        <div style={{ flex: '2 1 500px' }}>
            <div className="card">
                <h3 className="mb-4">Daftar Siswa Terdaftar</h3>
                <div className="table-responsive">
                <table className="table">
                    <thead>
                    <tr>
                        <th>NIS</th>
                        <th>Nama Siswa</th>
                        <th>Kelas</th>
                        <th width="80" style={{ textAlign: 'center' }}>Aksi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {siswaList.length === 0 ? (
                        <tr><td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>Belum ada data siswa.</td></tr>
                    ) : (
                        siswaList.map((s) => (
                        <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{s.nis || '-'}</td>
                            <td>{s.nama_lengkap}</td>
                            <td><span className="badge badge-info">{s.kelas}</span></td>
                            <td style={{ textAlign: 'center' }}>
                            <button onClick={() => handleDelete(s.id, s.nama_lengkap)} className="btn-icon text-danger" style={{ margin: '0 auto' }}>
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
