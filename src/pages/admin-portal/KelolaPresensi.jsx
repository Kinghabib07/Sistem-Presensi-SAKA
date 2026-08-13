import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import { Search, Eye, Calendar, Filter } from 'lucide-react';

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

  // Modal Detail State
  const [selectedDetail, setSelectedDetail] = useState(null);

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
              foto: absensiSiswa ? absensiSiswa.foto : null
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
          <h1 className="page-title">Kelola Presensi Siswa</h1>
          <p className="text-muted">Monitor kehadiran harian siswa secara real-time.</p>
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
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: '#f59e0b' }}>{totalTerlambat}</h3>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tanpa Keterangan</p>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: '#ef4444' }}>{totalTanpaKeterangan}</h3>
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
                <th width="100" style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Memuat data presensi...</td></tr>
              ) : filteredPresensi.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Tidak ada data presensi yang sesuai filter.</td></tr>
              ) : (
                filteredPresensi.map((item, index) => (
                  <tr key={item.uid}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.nis}</td>
                    <td>{item.nama_lengkap}</td>
                    <td><span className="badge badge-info">{item.kelas}</span></td>
                    <td>{getBadgeStatus(item.status)}</td>
                    <td>{item.waktu}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => setSelectedDetail(item)} 
                        className="btn-icon" 
                        title="Lihat Detail"
                        style={{ color: 'var(--primary)', margin: '0 auto', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              <div><strong>Waktu Absen:</strong> {selectedDetail.waktu}</div>
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
    </div>
  );
}