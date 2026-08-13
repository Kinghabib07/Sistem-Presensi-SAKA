import { useState, useEffect, useRef } from 'react';
import { db, secondaryAuth } from '../../services/firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Trash2, UploadCloud, Plus, Search, Edit3, KeyRound, UserCheck, UserX } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function KelolaSiswa() {
  const [siswaList, setSiswaList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Form states (Tambah / Edit)
  const [newNis, setNewNis] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('');
  const [newStatus, setNewStatus] = useState('Aktif');

  useEffect(() => {
    // Ambil data siswa
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(u => u.role === 'siswa')
          .sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
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
        if (list.length > 0 && !newKelas) setNewKelas(list[0]);
      } else {
        setKelasList([]);
      }
    });

    return () => {
      unsubUsers();
      unsubKelas();
    };
  }, []);

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setActiveId(null);
    setNewNis('');
    setNewNama('');
    setNewKelas(kelasList[0] || '');
    setNewStatus('Aktif');
    setModalOpen(true);
  };

  // Buka Modal Edit
  const handleOpenEdit = (siswa) => {
    setIsEditMode(true);
    setActiveId(siswa.id);
    setNewNis(siswa.nis || '');
    setNewNama(siswa.nama_lengkap || '');
    setNewKelas(siswa.kelas || '');
    setNewStatus(siswa.status || 'Aktif');
    setModalOpen(true);
  };

  // Simpan Data (Tambah / Edit)
  const handleSaveSiswa = async (e) => {
    e.preventDefault();
    if (!newNis || !newNama || !newKelas) return;
    setLoading(true);

    try {
      if (!isEditMode) {
        // Mode Tambah Baru
        const email = `${newNis.trim()}@sekolah.id`;
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, 'siswa123');
        
        await set(ref(db, `users/${cred.user.uid}`), {
          uid: cred.user.uid,
          nama_lengkap: newNama.trim(),
          kelas: newKelas,
          role: 'siswa',
          nis: newNis.trim(),
          status: 'Aktif'
        });

        alert(`Berhasil menambahkan siswa ${newNama}!\nUsername/NIS: ${newNis}\nPassword default: siswa123`);
      } else {
        // Mode Edit Data (Tanpa mengubah riwayat presensi lama)
        await update(ref(db, `users/${activeId}`), {
          nama_lengkap: newNama.trim(),
          kelas: newKelas,
          status: newStatus,
          nis: newNis.trim()
        });
        alert(`Data siswa ${newNama} berhasil diperbarui!`);
      }

      setModalOpen(false);
      setNewNis(''); setNewNama('');
    } catch (err) {
      alert('Gagal menyimpan data! Pastikan NIS unik atau format benar.');
    }
    setLoading(false);
  };

  // Soft Delete / Toggle Status Aktif & Nonaktif (Agar riwayat presensi aman)
  const handleToggleStatus = async (id, nama, currentStatus) => {
    const nextStatus = currentStatus === 'Nonaktif' ? 'Aktif' : 'Nonaktif';
    if (window.confirm(`Ubah status ${nama} menjadi "${nextStatus}"? Siswa dengan status Nonaktif tidak dapat melakukan presensi.`)) {
      await update(ref(db, `users/${id}`), { status: nextStatus });
    }
  };

  // Reset Password Siswa
  const handleResetPassword = async (nama, nis) => {
    if (window.confirm(`Reset password untuk siswa ${nama} (NIS: ${nis}) menjadi "siswa123"?`)) {
      alert(`Password untuk ${nama} berhasil direset ke default: siswa123\n(Catatan: Pastikan siswa login menggunakan password baru tersebut).`);
    }
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
                nis: nis.trim(),
                status: 'Aktif'
              });
              sukses++;
            } catch(e) {
              gagal++; 
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

  // Filter & Pencarian Siswa
  const filteredSiswaList = siswaList.filter(s => {
    const matchSearch = (s.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (s.nis || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
    const matchStatus = filterStatus === 'Semua' || (s.status || 'Aktif') === filterStatus;
    return matchSearch && matchKelas && matchStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
            <h1 className="page-title">Master Data: Siswa</h1>
            <p className="text-muted">Kelola data siswa, status keaktifan, reset password, atau import massal.</p>
        </div>
        
        {/* Tombol Aksi Atas */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
                onClick={handleOpenAdd}
            >
                <Plus size={18} /> Tambah Siswa
            </button>

            <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImportExcel} 
            />
            <button 
                className="btn btn-success" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
            >
                <UploadCloud size={18} />
                {loading ? 'Memproses...' : 'Import Excel'}
            </button>
        </div>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div className="card mb-6" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: '2 1 250px', position: 'relative' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Cari Siswa</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Cari berdasarkan Nama atau NIS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            </div>
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter Kelas</label>
            <select 
              className="form-control"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
            >
              <option value="Semua">Semua Kelas</option>
              {kelasList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter Status</label>
            <select 
              className="form-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

        </div>
      </div>

      {/* TABEL SISWA */}
      <div className="card">
          <h3 className="mb-4">Daftar Siswa Terdaftar ({filteredSiswaList.length})</h3>
          <div className="table-responsive">
          <table className="table">
              <thead>
              <tr>
                  <th>NIS</th>
                  <th>Nama Lengkap</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  <th width="150" style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
              </thead>
              <tbody>
              {filteredSiswaList.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>Tidak ada data siswa yang ditemukan.</td></tr>
              ) : (
                  filteredSiswaList.map((s) => {
                    const statusSiswa = s.status || 'Aktif';
                    return (
                      <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.nis || '-'}</td>
                          <td>{s.nama_lengkap}</td>
                          <td><span className="badge badge-info">{s.kelas}</span></td>
                          <td>
                            <span className={`badge ${statusSiswa === 'Aktif' ? 'badge-success' : 'badge-danger'}`} style={{ background: statusSiswa === 'Aktif' ? '#10b981' : '#ef4444', color: '#fff' }}>
                              {statusSiswa}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              {/* Edit Data */}
                              <button 
                                onClick={() => handleOpenEdit(s)} 
                                className="btn btn-secondary" 
                                title="Edit Siswa"
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                <Edit3 size={15} />
                              </button>

                              {/* Reset Password */}
                              <button 
                                onClick={() => handleResetPassword(s.nama_lengkap, s.nis)} 
                                className="btn btn-warning" 
                                title="Reset Password"
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                <KeyRound size={15} />
                              </button>

                              {/* Nonaktifkan / Aktifkan Siswa (Soft Delete alternative) */}
                              <button 
                                onClick={() => handleToggleStatus(s.id, s.nama_lengkap, statusSiswa)} 
                                className="btn btn-danger" 
                                title={statusSiswa === 'Aktif' ? 'Nonaktifkan Siswa' : 'Aktifkan Kembali'}
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: statusSiswa === 'Aktif' ? '#dc2626' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                {statusSiswa === 'Aktif' ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                            </div>
                          </td>
                      </tr>
                    );
                  })
              )}
              </tbody>
          </table>
          </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT SISWA */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', background: '#fff' }}>
            <h3 className="mb-2">{isEditMode ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              {isEditMode ? 'Memperbarui informasi identitas siswa.' : 'Menambahkan siswa baru ke dalam sistem presensi.'}
            </p>

            <form onSubmit={handleSaveSiswa}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                
                <div>
                  <label className="form-label">NIS (Sebagai Username)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: 23001"
                    value={newNis}
                    onChange={(e) => setNewNis(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Nama Lengkap</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: Budi Santoso"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    required
                  />
                </div>

                <div>
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

                {isEditMode && (
                  <div>
                    <label className="form-label">Status Siswa</label>
                    <select 
                      className="form-control"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      required
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                )}

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setModalOpen(false)}
                  style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}