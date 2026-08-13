import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, onValue, update } from 'firebase/database';
import { Search, Edit3, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function KoreksiPresensi() {
  const [presensiRaw, setPresensiRaw] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedKelas, setSelectedKelas] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Koreksi State
  const [modalKoreksiOpen, setModalKoreksiOpen] = useState(false);
  const [activeSiswa, setActiveSiswa] = useState(null);
  const [formStatus, setFormStatus] = useState('Hadir');
  const [formWaktu, setFormWaktu] = useState('07:00');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Ambil data kelas untuk dropdown filter
    const kelasRef = ref(db, 'kelas');
    const unsubKelas = onValue(kelasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => data[key].nama).sort();
        setKelasList(list);
      } else {
        setKelasList([]);
      }
    });

    // 2. Ambil data users (siswa)
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(uid => ({ id: uid, ...data[uid] }))
          .filter(u => u.role === 'siswa')
          .sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
        setUsersList(list);
      } else {
        setUsersList([]);
      }
    });

    // 3. Ambil data presensi
    const presensiRef = ref(db, 'presensi');
    const unsubPresensi = onValue(presensiRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPresensiRaw(data);
      setLoading(false);
    });

    return () => {
      unsubKelas();
      unsubUsers();
      unsubPresensi();
    };
  }, []);

  // Gabungkan data siswa dengan status presensinya pada tanggal terpilih
  const combinedList = usersList.map(siswa => {
    const dateData = presensiRaw[selectedDate] || {};
    const absensi = dateData[siswa.id] || null;

    return {
      uid: siswa.id,
      nis: siswa.nis || '-',
      nama_lengkap: siswa.nama_lengkap || 'Tanpa Nama',
      kelas: siswa.kelas || '-',
      status: absensi ? absensi.status : 'Tanpa Keterangan',
      waktu: absensi ? absensi.waktu : '-',
      keterangan: absensi ? absensi.keterangan : '-',
      auditTrail: absensi ? absensi.auditTrail : null
    };
  });

  // Filter & Pencarian
  const filteredList = combinedList.filter(item => {
    const matchKelas = selectedKelas === 'Semua' || item.kelas === selectedKelas;
    const matchSearch = item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.nis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });

  // Buka Modal Koreksi
  const handleOpenKoreksi = (siswa) => {
    setActiveSiswa(siswa);
    setFormStatus(siswa.status === 'Tanpa Keterangan' ? 'Hadir' : siswa.status);
    setFormWaktu(siswa.waktu !== '-' ? siswa.waktu : '07:00');
    setFormKeterangan(siswa.keterangan !== '-' ? siswa.keterangan : '');
    setModalKoreksiOpen(true);
  };

  // Handler Perubahan Status di Form untuk mengontrol Waktu Masuk
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setFormStatus(newStatus);
    if (newStatus === 'Tanpa Keterangan') {
      setFormWaktu('-');
    } else if (formWaktu === '-') {
      setFormWaktu('07:00');
    }
  };

  // Simpan Perubahan Koreksi Presensi & Audit Trail
  const handleSaveKoreksi = async (e) => {
    e.preventDefault();
    if (!activeSiswa) return;

    setSubmitting(true);
    try {
      const now = new Date();
      const optionsDate = { day: 'numeric', month: 'long', year: 'numeric' };
      const formattedDate = now.toLocaleDateString('id-ID', optionsDate);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const formattedTime = `${hours}.${minutes}`;
      
      const adminName = 'Admin Sekolah'; 
      const auditString = `Diubah oleh ${adminName} pada ${formattedDate} pukul ${formattedTime}`;

      const dbRef = ref(db, `presensi/${selectedDate}/${activeSiswa.uid}`);
      
      await update(dbRef, {
        status: formStatus,
        waktu: formStatus === 'Tanpa Keterangan' ? '-' : formWaktu,
        keterangan: formKeterangan,
        auditTrail: auditString
      });

      alert('Koreksi presensi berhasil disimpan!');
      setModalKoreksiOpen(false);
      setActiveSiswa(null);
    } catch (error) {
      console.error('Gagal menyimpan koreksi:', error);
      alert('Terjadi kesalahan saat menyimpan koreksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'Hadir': return <span className="badge badge-success" style={{ background: '#10b981', color: '#fff' }}>Hadir</span>;
      case 'Terlambat': return <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#fff' }}>Terlambat</span>;
      case 'Tanpa Keterangan': return <span className="badge badge-danger" style={{ background: '#ef4444', color: '#fff' }}>Tanpa Keterangan</span>;
      default: return <span className="badge badge-secondary" style={{ background: '#9ca3af', color: '#fff' }}>Tanpa Keterangan</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Koreksi Presensi Siswa</h1>
          <p className="text-muted">Lakukan penyesuaian atau koreksi data kehadiran siswa lengkap dengan riwayat audit trail.</p>
        </div>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div className="card mb-6" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 220px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Pilih Tanggal Koreksi</label>
            <input 
              type="date" 
              className="form-control" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter Kelas</label>
            <select 
              className="form-control"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
            >
              <option value="Semua">Semua Kelas</option>
              {kelasList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '2 1 250px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Cari Siswa</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Cari nama atau NIS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            </div>
          </div>

        </div>
      </div>

      {/* TABEL DATA KOREKSI */}
      <div className="card">
        <h3 className="mb-4">Daftar Kehadiran Tanggal: {selectedDate}</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th width="50">No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Status Saat Ini</th>
                <th>Waktu & Keterangan</th>
                <th>Audit Trail (Riwayat Ubah)</th>
                <th width="110" style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center text-muted" style={{ padding: '2rem' }}>Memuat data...</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted" style={{ padding: '2rem' }}>Tidak ada data siswa yang ditemukan.</td></tr>
              ) : (
                filteredList.map((item, index) => (
                  <tr key={item.uid}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.nis}</td>
                    <td>{item.nama_lengkap}</td>
                    <td><span className="badge badge-info">{item.kelas}</span></td>
                    <td>{getBadgeStatus(item.status)}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div><strong>Waktu:</strong> {item.waktu}</div>
                        <div className="text-muted"><strong>Ket:</strong> {item.keterangan}</div>
                      </div>
                    </td>
                    <td>
                      {item.auditTrail ? (
                        <span style={{ fontSize: '0.75rem', color: '#4b5563', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                          {item.auditTrail}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Belum ada koreksi</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenKoreksi(item)} 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Edit3 size={14} /> Koreksi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM KOREKSI */}
      {modalKoreksiOpen && activeSiswa && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: '#fff', position: 'relative' }}>
            <h3 className="mb-2">Koreksi Presensi Siswa</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              Mengubah data presensi untuk <strong>{activeSiswa.nama_lengkap}</strong> ({activeSiswa.kelas}) pada tanggal {selectedDate}.
            </p>

            <form onSubmit={handleSaveKoreksi}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                
                {/* Status Baru */}
                <div>
                  <label className="form-label">Status Kehadiran</label>
                  <select 
                    className="form-control"
                    value={formStatus}
                    onChange={handleStatusChange}
                    required
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Tanpa Keterangan">Tanpa Keterangan</option>
                  </select>
                </div>

                {/* Waktu Masuk (Disabled jika Tanpa Keterangan) */}
                <div>
                  <label className="form-label">Waktu Masuk</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: 07:15"
                    value={formWaktu}
                    onChange={(e) => setFormWaktu(e.target.value)}
                    disabled={formStatus === 'Tanpa Keterangan'}
                    style={{ backgroundColor: formStatus === 'Tanpa Keterangan' ? '#f3f4f6' : '#fff', cursor: formStatus === 'Tanpa Keterangan' ? 'not-allowed' : 'text' }}
                    required={formStatus !== 'Tanpa Keterangan'}
                  />
                  {formStatus === 'Tanpa Keterangan' && (
                    <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Waktu masuk dikunci karena status "Tanpa Keterangan".
                    </small>
                  )}
                </div>

                {/* Keterangan / Catatan Admin */}
                <div>
                  <label className="form-label">Keterangan / Alasan Koreksi</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    placeholder="Masukkan alasan atau keterangan koreksi (misal: Izin sakit dengan surat dokter)..."
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                  ></textarea>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setModalKoreksiOpen(false)}
                  style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}