import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { Search, Eye, Trash2, AlertCircle } from 'lucide-react';

export default function KelolaPresensi() {
  const [presensiList, setPresensiList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedKelas, setSelectedKelas] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedDelete, setSelectedDelete] = useState(null); // State untuk konfirmasi hapus
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' }); // State untuk alert pop-up

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

    // 2. Ambil data presensi & data user/siswa
    const usersRef = ref(db, 'users');
    const presensiRef = ref(db, 'presensi');

    const unsubData = onValue(presensiRef, (snapPresensi) => {
      const presensiData = snapPresensi.val() || {};
      
      onValue(usersRef, (snapUsers) => {
        const usersData = snapUsers.val() || {};
        
        const dateData = presensiData[selectedDate] || {};
        
        const listSiswa = Object.keys(usersData)
          .map(uid => ({ id: uid, ...usersData[uid] }))
          .filter(u => u.role === 'siswa')
          .map(siswa => {
            const absensiSiswa = dateData[siswa.id] || null;
            // Jika belum ada data presensi atau status kosong, otomatis masuk ke 'Tanpa Keterangan'
            const statusFinal = absensiSiswa ? absensiSiswa.status : 'Tanpa Keterangan';
            
            return {
              uid: siswa.id,
              nis: siswa.nis || '-',
              nama_lengkap: siswa.nama_lengkap || 'Tanpa Nama',
              kelas: siswa.kelas || '-',
              status: statusFinal, 
              waktu: absensiSiswa ? absensiSiswa.waktu : '-',
              keterangan: absensiSiswa ? absensiSiswa.keterangan : '-',
              foto: absensiSiswa ? absensiSiswa.foto : null,
              hasAbsen: !!absensiSiswa // Penanda apakah siswa sudah melakukan presensi
            };
          })
          .sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));

        setPresensiList(listSiswa);
        setLoading(false);
      }, { onlyOnce: true });
    });

    return () => {
      unsubKelas();
      unsubData();
    };
  }, [selectedDate]);

  // Fungsi Hapus Presensi Siswa
  const handleConfirmDelete = async () => {
    if (!selectedDelete) return;

    try {
      const presensiRef = ref(db, `presensi/${selectedDate}/${selectedDelete.uid}`);
      await remove(presensiRef);
      
      setSelectedDelete(null);
      setAlertModal({
        show: true,
        title: 'Berhasil',
        message: `Data presensi ${selectedDelete.nama_lengkap} pada tanggal ${selectedDate} berhasil dihapus.`
      });
    } catch (error) {
      console.error("Gagal menghapus presensi:", error);
      setSelectedDelete(null);
      setAlertModal({
        show: true,
        title: 'Gagal',
        message: 'Terjadi kesalahan saat menghapus data presensi.'
      });
    }
  };

  // Logika Filter & Pencarian
  const filteredPresensi = presensiList.filter(item => {
    const matchKelas = selectedKelas === 'Semua' || item.kelas === selectedKelas;
    const matchStatus = selectedStatus === 'Semua' || item.status === selectedStatus;
    const matchSearch = item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.nis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKelas && matchStatus && matchSearch;
  });

  // Hitung Rekap Harian (Hadir, Terlambat, Tanpa Keterangan)
  const totalSiswa = presensiList.length;
  const totalHadir = presensiList.filter(i => i.status === 'Hadir').length;
  const totalTerlambat = presensiList.filter(i => i.status === 'Terlambat').length;
  const totalTanpaKeterangan = presensiList.filter(i => i.status === 'Tanpa Keterangan').length;

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedKelas, selectedStatus, searchQuery]);

  const totalPages = Math.ceil(filteredPresensi.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPresensi.slice(indexOfFirstItem, indexOfLastItem);

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'Hadir': return <span className="badge badge-success" style={{ background: '#10b981', color: '#fff' }}>Hadir</span>;
      case 'Terlambat': return <span className="badge badge-warning" style={{ background: '#ef4444', color: '#fff' }}>Terlambat</span>;
      case 'Tanpa Keterangan': return <span className="badge badge-danger" style={{ background: '#f59e0b', color: '#fff' }}>Tanpa Keterangan</span>;
      default: return <span className="badge badge-secondary" style={{ background: '#9ca3af', color: '#fff' }}>Tanpa Keterangan</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Kelola Presensi Siswa</h1>
          <p className="text-muted">Monitor dan kelola kehadiran harian siswa secara real-time.</p>
        </div>
      </div>

      {/* REKAP HARIAN (Cards Summary - 4 Kolom) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Total Siswa</p>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{totalSiswa}</h3>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Hadir</p>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: '#10b981' }}>{totalHadir}</h3>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Terlambat</p>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: '#ef4444' }}>{totalTerlambat}</h3>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanpa Keterangan</p>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: '#f59e0b' }}>{totalTanpaKeterangan}</h3>
        </div>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div className="card mb-6" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Filter Tanggal */}
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Tanggal Presensi</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="date" 
                className="form-control" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Kelas */}
          <div style={{ flex: '1 1 180px' }}>
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

          {/* Filter Status */}
          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter Status</label>
            <select 
              className="form-control"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Tanpa Keterangan">Tanpa Keterangan</option>
            </select>
          </div>

          {/* Cari Siswa */}
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

      {/* TABEL DATA PRESENSI */}
      <div className="card">
        <h3 className="mb-4">Data Kehadiran ({selectedDate})</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th width="50">No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Status</th>
                <th>Waktu Masuk</th>
                <th width="120" style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Memuat data presensi...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Tidak ada data presensi yang sesuai filter.</td></tr>
              ) : (
                currentItems.map((item, index) => (
                  <tr key={item.uid}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.nis}</td>
                    <td>{item.nama_lengkap}</td>
                    <td><span className="badge badge-info">{item.kelas}</span></td>
                    <td>{getBadgeStatus(item.status)}</td>
                    <td>{item.waktu === '-' ? '-' : item.waktu.includes('T') ? new Date(item.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') : item.waktu}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                        
                        <button 
                          onClick={() => setSelectedDetail(item)} 
                          className="btn-icon" 
                          title="Lihat Detail"
                          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                        >
                          <Eye size={18} />
                        </button>

                        <button 
                          onClick={() => item.hasAbsen ? setSelectedDelete(item) : null} 
                          className="btn-icon" 
                          title={item.hasAbsen ? "Hapus Presensi" : "Belum Ada Presensi"}
                          style={{ 
                            color: item.hasAbsen ? '#ef4444' : '#d1d5db', 
                            background: 'none', 
                            border: 'none', 
                            cursor: item.hasAbsen ? 'pointer' : 'not-allowed', 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '0.25rem'
                          }}
                          disabled={!item.hasAbsen}
                        >
                          <Trash2 size={18} />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', background: currentPage === 1 ? '#f3f4f6' : '#e5e7eb', color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Sebelumnya
            </button>
            <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: 500 }}>Halaman {currentPage} dari {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', background: currentPage === totalPages ? '#f3f4f6' : '#e5e7eb', color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      {/* MODAL DETAIL PRESENSI */}
      {selectedDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: '#fff', position: 'relative' }}>
            <h3 className="mb-4">Detail Presensi Siswa</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              <div><strong>Nama:</strong> {selectedDetail.nama_lengkap}</div>
              <div><strong>NIS:</strong> {selectedDetail.nis}</div>
              <div><strong>Kelas:</strong> {selectedDetail.kelas}</div>
              <div><strong>Tanggal:</strong> {selectedDate}</div>
              <div><strong>Status:</strong> {getBadgeStatus(selectedDetail.status)}</div>
              <div><strong>Waktu Absen:</strong> {selectedDetail.waktu === '-' ? '-' : selectedDetail.waktu.includes('T') ? new Date(selectedDetail.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') : selectedDetail.waktu}</div>
              <div><strong>Keterangan / Catatan:</strong> {selectedDetail.keterangan !== '-' ? selectedDetail.keterangan : 'Tidak ada keterangan'}</div>
              
              {selectedDetail.foto && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Bukti Foto / Lokasi:</strong><br />
                  <img src={selectedDetail.foto} alt="Bukti Presensi" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }} />
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => setSelectedDetail(null)} 
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.5rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {selectedDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', background: '#fff', textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
            <h3 className="mb-2">Hapus Data Presensi?</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              Apakah Anda yakin ingin menghapus catatan presensi <strong>{selectedDelete.nama_lengkap}</strong> pada tanggal <strong>{selectedDate}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setSelectedDelete(null)} 
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERT POP-UP UMUM */}
      {alertModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '380px', background: '#fff', textAlign: 'center', padding: '1.75rem' }}>
            <h3 className="mb-2">{alertModal.title}</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>{alertModal.message}</p>
            <button 
              onClick={() => setAlertModal({ show: false, title: '', message: '' })} 
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.5rem', width: '100%' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}