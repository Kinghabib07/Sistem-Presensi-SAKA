import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { Trash2, Edit3, Users, UserPlus, ArrowRightLeft, UserX, UserCheck } from 'lucide-react';

export default function KelolaKelas() {
  const [kelasList, setKelasList] = useState([]);
  const [siswaList, setSiswaList] = useState([]);
  const [newKelas, setNewKelas] = useState('');

  // Modal Edit State
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [activeKelas, setActiveKelas] = useState(null);
  const [editNamaKelas, setEditNamaKelas] = useState('');
  const [editStatus, setEditStatus] = useState('Aktif');

  // Modal Detail Anggota Kelas State
  const [modalAnggotaOpen, setModalAnggotaOpen] = useState(false);
  const [selectedKelasDetail, setSelectedKelasDetail] = useState(null);

  // Modal Tambah/Pindah Siswa ke Kelas State
  const [modalTambahSiswaOpen, setModalTambahSiswaOpen] = useState(false);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState([]);

  useEffect(() => {
    // 1. Ambil data kelas
    const kelasRef = ref(db, 'kelas');
    const unsubKelas = onValue(kelasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => a.nama.localeCompare(b.nama));
        setKelasList(list);
      } else {
        setKelasList([]);
      }
    });

    // 2. Ambil data siswa untuk hitung jumlah anggota & manajemen kelas siswa
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(u => u.role === 'siswa');
        setSiswaList(list);
      } else {
        setSiswaList([]);
      }
    });

    return () => {
      unsubKelas();
      unsubUsers();
    };
  }, []);

  // Tambah Kelas Baru
  const handleAddKelas = async (e) => {
    e.preventDefault();
    if (!newKelas.trim()) return;
    
    // Cek duplikat
    if (kelasList.find(k => k.nama.toLowerCase() === newKelas.trim().toLowerCase())) {
      alert('Nama kelas ini sudah ada!');
      return;
    }

    const kelasRef = ref(db, 'kelas');
    const newRef = push(kelasRef);
    await set(newRef, { 
      nama: newKelas.trim(),
      status: 'Aktif' 
    });
    setNewKelas('');
  };

  // Buka Modal Edit Kelas
  const handleOpenEdit = (kelas) => {
    setActiveKelas(kelas);
    setEditNamaKelas(kelas.nama);
    setEditStatus(kelas.status || 'Aktif');
    setModalEditOpen(true);
  };

  // Simpan Edit Kelas
  const handleSaveEditKelas = async (e) => {
    e.preventDefault();
    if (!editNamaKelas.trim() || !activeKelas) return;

    try {
      await update(ref(db, `kelas/${activeKelas.id}`), {
        nama: editNamaKelas.trim(),
        status: editStatus
      });
      alert('Data kelas berhasil diperbarui!');
      setModalEditOpen(false);
    } catch (err) {
      alert('Gagal memperbarui kelas.');
    }
  };

  // Nonaktifkan / Aktifkan Kelas (Alih-alih Hard Delete)
  const handleToggleStatusKelas = async (id, nama, currentStatus) => {
    const nextStatus = currentStatus === 'Nonaktif' ? 'Aktif' : 'Nonaktif';
    if (window.confirm(`Ubah status kelas ${nama} menjadi "${nextStatus}"?`)) {
      await update(ref(db, `kelas/${id}`), { status: nextStatus });
    }
  };

  // Buka Lihat Anggota Kelas
  const handleOpenAnggota = (kelas) => {
    setSelectedKelasDetail(kelas);
    setModalAnggotaOpen(true);
  };

  // Buka Modal Tambah/Pindahkan Siswa ke Kelas Ini
  const handleOpenTambahSiswaKeKelas = () => {
    setSelectedSiswaIds([]);
    setModalTambahSiswaOpen(true);
  };

  // Eksekusi Pindahkan / Masukkan Siswa ke Kelas Terpilih
  const handleAssignSiswaToKelas = async () => {
    if (selectedSiswaIds.length === 0) {
      alert('Pilih setidaknya satu siswa.');
      return;
    }

    try {
      for (let uid of selectedSiswaIds) {
        await update(ref(db, `users/${uid}`), {
          kelas: selectedKelasDetail.nama
        });
      }
      alert(`Berhasil memindahkan/menambahkan ${selectedSiswaIds.length} siswa ke kelas ${selectedKelasDetail.nama}!`);
      setModalTambahSiswaOpen(false);
      setSelectedSiswaIds([]);
    } catch (err) {
      alert('Gagal memindahkan siswa.');
    }
  };

  return (
    <div>
      <h1 className="page-title mb-6">Master Data: Kelola Kelas</h1>
      <p className="text-muted mb-8">Atur kelompok kelas, status keaktifan, dan lihat anggota siswa di setiap kelas.</p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* FORM TAMBAH KELAS */}
        <div style={{ flex: '1 1 300px' }}>
            <div className="card">
                <h3 className="mb-4">Tambah Kelas Baru</h3>
                <form onSubmit={handleAddKelas}>
                    <div className="form-group mb-4">
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

        {/* TABEL DAFTAR KELAS */}
        <div style={{ flex: '2 1 500px' }}>
            <div className="card">
                <h3 className="mb-4">Daftar Kelas Aktif</h3>
                <div className="table-responsive">
                <table className="table">
                    <thead>
                    <tr>
                        <th width="50">No</th>
                        <th>Nama Kelas</th>
                        <th>Jumlah Siswa</th>
                        <th>Status</th>
                        <th width="160" style={{ textAlign: 'center' }}>Aksi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {kelasList.length === 0 ? (
                        <tr><td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>Belum ada data kelas.</td></tr>
                    ) : (
                        kelasList.map((k, index) => {
                            // Hitung jumlah siswa di kelas ini secara dinamis
                            const jumlahSiswa = siswaList.filter(s => s.kelas === k.nama).length;
                            const statusKelas = k.status || 'Aktif';

                            return (
                              <tr key={k.id}>
                                  <td>{index + 1}</td>
                                  <td>
                                      <span style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb' }} onClick={() => handleOpenAnggota(k)}>
                                          {k.nama}
                                      </span>
                                  </td>
                                  <td><span className="badge badge-info">{jumlahSiswa} Siswa</span></td>
                                  <td>
                                      <span className={`badge ${statusKelas === 'Aktif' ? 'badge-success' : 'badge-danger'}`} style={{ background: statusKelas === 'Aktif' ? '#10b981' : '#ef4444', color: '#fff' }}>
                                          {statusKelas}
                                      </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                      <div style={{ display: 'flex', gap: '0.4rum', justifyContent: 'center' }}>
                                          {/* Lihat Anggota */}
                                          <button onClick={() => handleOpenAnggota(k)} className="btn btn-secondary" title="Lihat Anggota Kelas" style={{ padding: '0.3rem 0.5rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                              <Users size={15} />
                                          </button>
                                          {/* Edit Kelas */}
                                          <button onClick={() => handleOpenEdit(k)} className="btn btn-primary" title="Edit Kelas" style={{ padding: '0.3rem 0.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                              <Edit3 size={15} />
                                          </button>
                                          {/* Nonaktifkan Kelas (Soft Delete alternative) */}
                                          <button onClick={() => handleToggleStatusKelas(k.id, k.nama, statusKelas)} className="btn btn-danger" title={statusKelas === 'Aktif' ? 'Nonaktifkan Kelas' : 'Aktifkan Kelas'} style={{ padding: '0.3rem 0.5rem', background: statusKelas === 'Aktif' ? '#dc2626' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                              {statusKelas === 'Aktif' ? <UserX size={15} /> : <UserCheck size={15} />}
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
        </div>
      </div>

      {/* MODAL EDIT KELAS */}
      {modalEditOpen && activeKelas && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', background: '#fff' }}>
            <h3 className="mb-2">Edit Kelas</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Mengubah nama atau status kelas.</p>
            <form onSubmit={handleSaveEditKelas}>
              <div className="form-group mb-3">
                <label className="form-label">Nama Kelas</label>
                <input type="text" className="form-control" value={editNamaKelas} onChange={(e) => setEditNamaKelas(e.target.value)} required />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Status Kelas</label>
                <select className="form-control" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} required>
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalEditOpen(false)} style={{ background: '#e5e7eb', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT ANGGOTA KELAS */}
      {modalAnggotaOpen && selectedKelasDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: '#fff', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3>Daftar Siswa: {selectedKelasDetail.nama}</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Jumlah Siswa: {siswaList.filter(s => s.kelas === selectedKelasDetail.nama).length} orang
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenTambahSiswaKeKelas} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                <UserPlus size={15} /> Tambah / Pindahkan Siswa
              </button>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>NIS</th>
                    <th>Nama Siswa</th>
                    <th>Status Akun</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaList.filter(s => s.kelas === selectedKelasDetail.nama).length === 0 ? (
                    <tr><td colSpan="3" className="text-center text-muted" style={{ padding: '2rem' }}>Belum ada siswa di kelas ini.</td></tr>
                  ) : (
                    siswaList.filter(s => s.kelas === selectedKelasDetail.nama).map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.nis || '-'}</td>
                        <td>{s.nama_lengkap}</td>
                        <td><span className="badge badge-success">{s.status || 'Aktif'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalAnggotaOpen(false)} style={{ background: '#e5e7eb', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / PINDAHKAN SISWA KE KELAS INI */}
      {modalTambahSiswaOpen && selectedKelasDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', background: '#fff', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 className="mb-2">Masukkan Siswa ke {selectedKelasDetail.nama}</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Pilih siswa dari daftar di bawah ini untuk dimasukkan atau dipindahkan ke kelas ini.</p>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', marginBottom: '1rem' }}>
              {siswaList.length === 0 ? (
                <p className="text-center text-muted">Tidak ada data siswa.</p>
              ) : (
                siswaList.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      value={s.id}
                      checked={selectedSiswaIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSiswaIds([...selectedSiswaIds, s.id]);
                        } else {
                          setSelectedSiswaIds(selectedSiswaIds.filter(id => id !== s.id));
                        }
                      }}
                    />
                    <div style={{ fontSize: '0.9rem' }}>
                      <strong>{s.nama_lengkap}</strong> <span className="text-muted">({s.nis || 'Tanpa NIS'})</span>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Kelas saat ini: {s.kelas || 'Belum ada'}</div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalTambahSiswaOpen(false)} style={{ background: '#e5e7eb', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={handleAssignSiswaToKelas} style={{ padding: '0.5rem 1.25rem' }}>Pindahkan ke Kelas Ini</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}