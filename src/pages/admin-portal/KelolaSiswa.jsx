import { useState, useEffect, useRef } from 'react';
import { db, secondaryAuth } from '../../services/firebase';
import { ref, onValue, set, update, push, remove } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { UploadCloud, Plus, Search, Edit3, KeyRound, UserCheck, UserX, Trash2 } from 'lucide-react';
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

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modal Form States (Tambah / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Form states
  const [newNis, setNewNis] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('');
  const [newStatus, setNewStatus] = useState('Aktif');

  // Modal Confirm State
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Konfirmasi');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  const showAlert = (message, title = 'Informasi') => {
    import('react-hot-toast').then(({ toast }) => {
      if (title.toLowerCase().includes('sukses') || title.toLowerCase().includes('berhasil')) {
        toast.success(message, { duration: 4000 });
      } else if (title.toLowerCase().includes('kesalahan') || title.toLowerCase().includes('gagal')) {
        toast.error(message, { duration: 5000 });
      } else {
        toast(message, { icon: 'ℹ️' });
      }
    });
  };

  const showConfirm = (message, action, title = 'Konfirmasi') => {
    setConfirmMessage(message);
    setConfirmTitle(title);
    setOnConfirmAction(() => action);
    setModalConfirmOpen(true);
  };

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
    const nis = newNis.trim();
    const nama = newNama.trim();

    if (!nis || !nama || !newKelas) {
      showAlert('NIS, nama lengkap, dan kelas wajib diisi.', 'Data Belum Lengkap');
      return;
    }

    if (!isEditMode && siswaList.some(siswa => (siswa.nis || '').trim() === nis)) {
      showAlert(`NIS ${nis} sudah terdaftar. Gunakan NIS yang berbeda.`, 'NIS Duplikat');
      return;
    }

    setLoading(true);

    try {
      if (!isEditMode) {
        // Mode Tambah Baru
        const email = `${nis}@sekolah.id`;
        let uid = '';

        try {
          // Coba buat akun baru di Auth
          const cred = await createUserWithEmailAndPassword(secondaryAuth, email, 'siswa123');
          uid = cred.user.uid;
        } catch (authError) {
          // Jika email sudah ada di Auth (tapi database-nya terhapus sebelumnya)
          if (authError.code === 'auth/email-already-in-use') {
            const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
            try {
              // Login menggunakan password default untuk mendapatkan UID
              const loginCred = await signInWithEmailAndPassword(secondaryAuth, email, 'siswa123');
              uid = loginCred.user.uid;
              await signOut(secondaryAuth); // Bersihkan sesi secondaryAuth
            } catch (loginError) {
              // Jika gagal login, berarti passwordnya sudah pernah diubah dan akun tertinggal
              throw { code: 'auth/email-already-in-use-unrecoverable' };
            }
          } else {
            throw authError; // Lemparkan error lain (misal invalid email)
          }
        }
        
        // Buat ulang atau timpa data di Realtime Database
        await set(ref(db, `users/${uid}`), {
          uid: uid,
          nama_lengkap: nama,
          kelas: newKelas,
          role: 'siswa',
          nis,
          status: 'Aktif'
        });

        showAlert(`Berhasil menambahkan siswa ${nama}!\nUsername/NIS: ${nis}\nPassword default: siswa123`, 'Sukses');
      } else {
        // Mode Edit Data
        await update(ref(db, `users/${activeId}`), {
          nama_lengkap: nama,
          kelas: newKelas,
          status: newStatus,
          nis
        });
        showAlert(`Data siswa ${nama} berhasil diperbarui!`, 'Sukses');
      }

      setModalOpen(false);
      setNewNis(''); 
      setNewNama('');
    } catch (err) {
      console.error('Gagal menyimpan data siswa:', err);
      const errorMessages = {
        'auth/email-already-in-use-unrecoverable': 'NIS sudah terdaftar di Authentication dengan password yang sudah diubah. Anda harus menghapus akun Auth secara manual lewat Firebase Console.',
        'auth/email-already-in-use': 'NIS tersebut sudah memiliki akun.',
        'auth/invalid-email': 'Format NIS tidak valid untuk dijadikan username.',
        'auth/weak-password': 'Password default tidak memenuhi aturan Firebase.',
        'auth/operation-not-allowed': 'Login dengan Email/Password belum diaktifkan di Firebase Authentication.',
        'database/permission-denied': 'Akses database ditolak oleh Firebase Rules.'
      };
      showAlert(errorMessages[err.code] || `Gagal menyimpan data siswa.\nKode error: ${err.code || 'tidak diketahui'}`, 'Kesalahan');
    }
    setLoading(false);
  };

  // Soft Delete / Toggle Status Aktif & Nonaktif
  const handleToggleStatus = (id, nama, currentStatus) => {
    const nextStatus = currentStatus === 'Nonaktif' ? 'Aktif' : 'Nonaktif';
    showConfirm(
      `Ubah status ${nama} menjadi "${nextStatus}"? Siswa dengan status Nonaktif tidak dapat melakukan presensi.`,
      async () => {
        try {
          await update(ref(db, `users/${id}`), { status: nextStatus });
          showAlert(`Status ${nama} berhasil diubah menjadi ${nextStatus}.`, 'Sukses');
        } catch (err) {
          showAlert('Gagal mengubah status siswa.', 'Kesalahan');
        }
      },
      'Ubah Status Siswa'
    );
  };

  // Hapus Siswa Secara Permanen
  const handleDeleteSiswa = (id, nama) => {
    showConfirm(
      `PERINGATAN: Apakah Anda yakin ingin menghapus siswa "${nama}" secara permanen dari database? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await remove(ref(db, `users/${id}`));
          showAlert(`Siswa ${nama} berhasil dihapus secara permanen.`, 'Sukses');
        } catch (err) {
          showAlert('Gagal menghapus siswa dari database.', 'Kesalahan');
        }
      },
      'Konfirmasi Hapus Permanen'
    );
  };

  // Reset Password Siswa
  const handleResetPassword = (nama, nis) => {
    showConfirm(
      `Reset password untuk siswa ${nama} (NIS: ${nis}) menjadi "siswa123"?`,
      () => {
        showAlert(`Password untuk ${nama} berhasil direset ke default: siswa123\n(Catatan: Pastikan siswa login menggunakan password baru tersebut).`, 'Reset Berhasil');
      },
      'Konfirmasi Reset Password'
    );
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

        // Helper untuk mencari data dengan membersihkan spasi pada header Excel
        const getCleanValue = (row, possibleKeys) => {
          for (let key of possibleKeys) {
            const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
              return String(row[foundKey]).trim();
            }
          }
          return '';
        };

        // --- 1. Tambah Kelas Baru Secara Otomatis ---
        const kelasUnikExcel = [...new Set(data.map(row => getCleanValue(row, ['Kelas'])).filter(k => k && k !== 'undefined'))];
        const kelasBaru = kelasUnikExcel.filter(k => !kelasList.includes(k));
        
        for (let namaKelasBaru of kelasBaru) {
            const newKelasRef = push(ref(db, 'kelas'));
            await set(newKelasRef, { nama: namaKelasBaru, status: 'Aktif' });
        }

        let sukses = 0;
        let gagal = 0;

        for (let row of data) {
          const nis = getCleanValue(row, ['NIS', 'nis']);
          const nama = getCleanValue(row, ['Nama', 'nama', 'Nama Lengkap']);
          const kelas = getCleanValue(row, ['Kelas', 'kelas']);

          // Validasi ketat agar tidak lolos jika kosong atau bernilai string 'undefined'
          if (nis && nama && kelas && nis !== 'undefined' && nama !== 'undefined' && kelas !== 'undefined') {
            try {
              const email = `${nis}@sekolah.id`;
              let uid = '';
              try {
                const cred = await createUserWithEmailAndPassword(secondaryAuth, email, 'siswa123');
                uid = cred.user.uid;
              } catch (authError) {
                if (authError.code === 'auth/email-already-in-use') {
                  const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
                  try {
                    const loginCred = await signInWithEmailAndPassword(secondaryAuth, email, 'siswa123');
                    uid = loginCred.user.uid;
                    await signOut(secondaryAuth);
                  } catch (loginError) {
                    throw { code: 'unrecoverable' }; // Lempar error jika gagal login (password sudah diganti)
                  }
                } else {
                  throw authError;
                }
              }
              
              await set(ref(db, `users/${uid}`), {
                uid: uid,
                nama_lengkap: nama,
                kelas: kelas,
                role: 'siswa',
                nis: nis,
                status: 'Aktif'
              });
              sukses++;
            } catch(e) {
              gagal++; 
            }
          } else {
            gagal++; // Hitung sebagai gagal jika ada data yang kosong
          }
        }
        showAlert(`IMPORT EXCEL SELESAI!\n\n✅ Berhasil ditambahkan: ${sukses} siswa\n❌ Gagal/Format salah: ${gagal} siswa\n\nPassword default: siswa123`, 'Hasil Import');
      } catch (err) {
        showAlert('Format Excel tidak dikenali! Pastikan memiliki header kolom: NIS, Nama, Kelas.', 'Kesalahan Format');
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

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKelas, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSiswaList.length / itemsPerPage);
  const currentSiswaData = filteredSiswaList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
            <h1 className="page-title">Data Siswa</h1>
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
                  <th style={{ width: '50px' }}>No</th>
                  <th>NIS</th>
                  <th>Nama Lengkap</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  <th width="150" style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
              </thead>
              <tbody>
            {currentSiswaData.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                  Tidak ada data siswa yang ditemukan.
                </td>
              </tr>
            ) : (
              currentSiswaData.map((s, index) => {
                const statusSiswa = s.status || 'Aktif';
                // Menghitung nomor urut berdasarkan halaman saat ini
                const nomorUrut = (currentPage - 1) * itemsPerPage + index + 1;
                
                return (
                  <tr key={s.id}>
                    {/* Kolom No diisi dengan nomorUrut */}
                    <td style={{ textAlign: 'center' }}>{nomorUrut}</td>
                    <td>{s.nis || '-'}</td>
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

                        {/* Nonaktifkan / Aktifkan Siswa */}
                        <button 
                          onClick={() => handleToggleStatus(s.id, s.nama_lengkap, statusSiswa)} 
                          className="btn btn-danger" 
                          title={statusSiswa === 'Aktif' ? 'Nonaktifkan Siswa' : 'Aktifkan Kembali'}
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: statusSiswa === 'Aktif' ? '#dc2626' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          {statusSiswa === 'Aktif' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>

                        {/* Hapus Permanen */}
                        <button 
                          onClick={() => handleDeleteSiswa(s.id, s.nama_lengkap)} 
                          className="btn btn-dark" 
                          title="Hapus Permanen"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', borderTop: '1px solid #f3f4f6' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Sebelumnya
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Selanjutnya
              </button>
            </div>
          )}
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

      {/* MODAL CONFIRM CUSTOM */}
      {modalConfirmOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', background: '#fff', padding: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 className="mb-2">{confirmTitle}</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>{confirmMessage}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalConfirmOpen(false)} style={{ background: '#e5e7eb', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={() => { setModalConfirmOpen(false); if (onConfirmAction) onConfirmAction(); }} style={{ padding: '0.5rem 1.25rem' }}>Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}