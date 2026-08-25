import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import { Search, Calendar, FileText, Download, Printer } from 'lucide-react';

export default function LaporanPresensi() {
  const [presensiRaw, setPresensiRaw] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Mode States
  const todayStr = new Date().toISOString().split('T')[0];
  const [modeRekap, setModeRekap] = useState('harian'); // 'harian' | 'mingguan' | 'bulanan'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7)); // YYYY-MM
  const [selectedKelas, setSelectedKelas] = useState('Semua');
  const [selectedAngkatan, setSelectedAngkatan] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 1. Ambil data kelas
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

    // 3. Ambil data seluruh presensi
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

  // Helper: Mendapatkan daftar tanggal dalam rentang 1 minggu ke belakang dari selectedDate
  const getWeeklyDates = (dateStr) => {
    const dates = [];
    const curr = new Date(dateStr);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(curr);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Proses Kalkulasi Data Berdasarkan Mode Rekap
  const generateReportData = () => {
    if (usersList.length === 0) return [];

    if (modeRekap === 'harian') {
      const dateData = presensiRaw[selectedDate] || {};
      return usersList.map(siswa => {
        const absensi = dateData[siswa.id] || null;
        return {
          uid: siswa.id,
          nis: siswa.nis || '-',
          nama_lengkap: siswa.nama_lengkap || 'Tanpa Nama',
          kelas: siswa.kelas || '-',
          periode: selectedDate,
          status: absensi ? absensi.status : 'Tanpa Keterangan',
          waktu: absensi ? absensi.waktu : '-',
          keterangan: absensi ? absensi.keterangan : '-'
        };
      });
    } 
    
    else if (modeRekap === 'mingguan') {
      const weekDates = getWeeklyDates(selectedDate);
      return usersList.map(siswa => {
        let hadir = 0, terlambat = 0, tanpaKeterangan = 0;
        weekDates.forEach(date => {
          const status = presensiRaw[date]?.[siswa.id]?.status;
          if (status === 'Hadir') hadir++;
          else if (status === 'Terlambat') terlambat++;
          else tanpaKeterangan++;
        });
        return {
          uid: siswa.id,
          nis: siswa.nis || '-',
          nama_lengkap: siswa.nama_lengkap || 'Tanpa Nama',
          kelas: siswa.kelas || '-',
          periode: `${weekDates[0]} s/d ${weekDates[weekDates.length - 1]}`,
          hadir,
          terlambat,
          tanpaKeterangan,
          status: 'Rekap Mingguan'
        };
      });
    } 
    
    else if (modeRekap === 'bulanan') {
      // Menyaring tanggal-tanggal yang berawalan YYYY-MM
      const monthlyDates = Object.keys(presensiRaw).filter(date => date.startsWith(selectedMonth));
      return usersList.map(siswa => {
        let hadir = 0, terlambat = 0, tanpaKeterangan = 0;
        
        // Untuk bulanan, kita hitung akumulasi dari semua tanggal di bulan tersebut yang tercatat di DB
        monthlyDates.forEach(date => {
          const status = presensiRaw[date]?.[siswa.id]?.status;
          if (status === 'Hadir') hadir++;
          else if (status === 'Terlambat') terlambat++;
          else tanpaKeterangan++;
        });

        return {
          uid: siswa.id,
          nis: siswa.nis || '-',
          nama_lengkap: siswa.nama_lengkap || 'Tanpa Nama',
          kelas: siswa.kelas || '-',
          periode: `Bulan ${selectedMonth}`,
          hadir,
          terlambat,
          tanpaKeterangan,
          status: 'Rekap Bulanan'
        };
      });
    }

    return [];
  };

  const getAngkatanFromKelas = (kelas) => {
    if (!kelas) return 'Lainnya';
    const match = String(kelas).match(/\b(X|XI|XII)\b/i);
    if (match) return match[1].toUpperCase();
    return 'Lainnya';
  };

  const rawReportList = generateReportData();

  // Filter & Pencarian
  const filteredReportList = rawReportList.filter(item => {
    const matchKelas = selectedKelas === 'Semua' || item.kelas === selectedKelas;
    const matchAngkatan = selectedAngkatan === 'Semua' || getAngkatanFromKelas(item.kelas) === selectedAngkatan;
    const matchStatus = modeRekap !== 'harian' || selectedStatus === 'Semua' || item.status === selectedStatus;
    const matchSearch = item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.nis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKelas && matchAngkatan && matchStatus && matchSearch;
  });

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedMonth, selectedKelas, selectedAngkatan, selectedStatus, searchQuery, modeRekap]);

  const totalPages = Math.ceil(filteredReportList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReportList.slice(indexOfFirstItem, indexOfLastItem);

  // Handler Export Excel
  const handleExportExcel = () => {
    const exportRowsFor = (rows) => {
      if (modeRekap === 'harian') {
        return rows.map(row => ({
          NIS: row.nis,
          'Nama Siswa': row.nama_lengkap,
          Kelas: row.kelas,
          Tanggal: row.periode,
          Status: row.status,
          'Waktu Masuk': row.waktu,
          Keterangan: row.keterangan,
        }));
      }

      return rows.map(row => ({
        NIS: row.nis,
        'Nama Siswa': row.nama_lengkap,
        Kelas: row.kelas,
        Periode: row.periode,
        Hadir: row.hadir,
        'Terlambat': row.terlambat,
        'Tanpa Keterangan': row.tanpaKeterangan,
      }));
    };

    const buildRowsForAngkatan = (angkatanValue) => {
      const rows = rawReportList.filter(item => {
        const matchKelas = selectedKelas === 'Semua' || item.kelas === selectedKelas;
        const matchAngkatan = getAngkatanFromKelas(item.kelas) === angkatanValue;
        const matchStatus = modeRekap !== 'harian' || selectedStatus === 'Semua' || item.status === selectedStatus;
        const matchSearch = item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.nis.toLowerCase().includes(searchQuery.toLowerCase());
        return matchKelas && matchAngkatan && matchStatus && matchSearch;
      });
      return exportRowsFor(rows);
    };

    const workbook = XLSX.utils.book_new();
    const baseFileName = `Laporan_Presensi_${modeRekap}_${modeRekap === 'bulanan' ? selectedMonth : selectedDate}`;

    if (selectedKelas === 'Semua' && selectedAngkatan === 'Semua') {
      const sheetGroups = [
        { name: 'Kelas X', value: 'X' },
        { name: 'Kelas XI', value: 'XI' },
        { name: 'Kelas XII', value: 'XII' },
      ];

      sheetGroups.forEach(({ name, value }) => {
        const rows = buildRowsForAngkatan(value);
        const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ NIS: '', 'Nama Siswa': '', Kelas: '', Tanggal: '', Status: '', 'Waktu Masuk': '', Keterangan: '' }]);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      });
    } else {
      const rows = exportRowsFor(filteredReportList);
      if (!rows.length) {
        alert('Tidak ada data untuk diexport.');
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const sheetName = selectedAngkatan === 'Semua' ? 'Data' : `Kelas ${selectedAngkatan}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    if (selectedKelas === 'Semua' && selectedAngkatan === 'Semua' && workbook.SheetNames.length === 0) {
      alert('Tidak ada data untuk diexport.');
      return;
    }

    const fileName = selectedKelas === 'Semua' && selectedAngkatan === 'Semua'
      ? `${baseFileName}_3Sheet.xlsx`
      : `${baseFileName}_${selectedKelas === 'Semua' ? 'Semua-Kelas' : selectedKelas}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // Handler Export PDF (Menggunakan fitur print window browser yang distyling rapi)
  const handleExportPDF = () => {
    window.print();
  };

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'Hadir': return <span className="badge" style={{ background: '#10b981', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Hadir</span>;
      case 'Terlambat': return <span className="badge" style={{ background: '#f59e0b', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Terlambat</span>;
      case 'Tanpa Keterangan': return <span className="badge" style={{ background: '#ef4444', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Tanpa Keterangan</span>;
      default: return <span className="badge" style={{ background: '#9ca3af', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{status}</span>;
    }
  };

  const reportTitle = modeRekap === 'harian'
    ? `Laporan Rekap Harian`
    : modeRekap === 'mingguan'
      ? `Laporan Rekap Mingguan`
      : `Laporan Rekap Bulanan`;

  const reportSubtitle = modeRekap === 'harian'
    ? `Tanggal: ${selectedDate}`
    : modeRekap === 'mingguan'
      ? `Periode 7 Hari terakhir hingga: ${selectedDate}`
      : `Bulan: ${selectedMonth}`;

  return (
    <div className="laporan-print-area">
      {/* Header & Tombol Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }} className="no-print">
        <div>
          <h1 className="page-title">Laporan & Rekap Presensi</h1>
          <p className="text-muted">Generate laporan kehadiran siswa secara Harian, Mingguan, atau Bulanan.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportExcel} className="btn" style={{ background: '#059669', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            <Download size={16} /> Export Excel
          </button>
          <button onClick={handleExportPDF} className="btn" style={{ background: '#dc2626', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            <Printer size={16} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* TAB PILIHAN MODE REKAP */}
      <div className="card mb-4 no-print" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setModeRekap('harian')}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer', background: modeRekap === 'harian' ? '#2563eb' : '#f3f4f6', color: modeRekap === 'harian' ? '#fff' : '#374151' }}
          >
            Rekap Harian
          </button>
          <button 
            onClick={() => setModeRekap('mingguan')}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer', background: modeRekap === 'mingguan' ? '#2563eb' : '#f3f4f6', color: modeRekap === 'mingguan' ? '#fff' : '#374151' }}
          >
            Rekap Mingguan
          </button>
          <button 
            onClick={() => setModeRekap('bulanan')}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer', background: modeRekap === 'bulanan' ? '#2563eb' : '#f3f4f6', color: modeRekap === 'bulanan' ? '#fff' : '#374151' }}
          >
            Rekap Bulanan
          </button>
        </div>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div className="card mb-6 no-print" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Input Tanggal / Bulan Berdasarkan Mode */}
          {modeRekap === 'bulanan' ? (
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Pilih Bulan</label>
              <input 
                type="month" 
                className="form-control" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          ) : (
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>
                {modeRekap === 'mingguan' ? 'Pilih Tanggal Acuan (7 Hari Terakhir)' : 'Tanggal Presensi'}
              </label>
              <input 
                type="date" 
                className="form-control" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* Filter Angkatan */}
          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Filter Angkatan</label>
            <select 
              className="form-control"
              value={selectedAngkatan}
              onChange={(e) => setSelectedAngkatan(e.target.value)}
            >
              <option value="Semua">Semua</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
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

          {/* Filter Status (Hanya aktif di Mode Harian) */}
          {modeRekap === 'harian' && (
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
          )}

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

      {/* TABEL LAPORAN */}
      <div className="card">
        <div className="print-header" style={{ display: 'none' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.35rem' }}>
            Portal Kesiswaan
          </div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#111827' }}>{reportTitle}</h2>
          <p style={{ margin: '0.4rem 0 0', color: '#4b5563', fontSize: '0.92rem' }}>
            {reportSubtitle} | Angkatan: {selectedAngkatan === 'Semua' ? 'Semua' : `Kelas ${selectedAngkatan}`} | Kelas: {selectedKelas}
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ textTransform: 'capitalize' }}>Laporan Rekap {modeRekap}</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            {reportSubtitle} | Angkatan: {selectedAngkatan === 'Semua' ? 'Semua' : `Kelas ${selectedAngkatan}`} | Kelas: {selectedKelas}
          </p>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th width="50">No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                {modeRekap === 'harian' ? (
                  <>
                    <th>Status</th>
                    <th>Waktu Masuk</th>
                    <th>Keterangan</th>
                  </>
                ) : (
                  <>
                    <th style={{ textAlign: 'center' }}>Hadir</th>
                    <th style={{ textAlign: 'center' }}>Terlambat</th>
                    <th style={{ textAlign: 'center' }}>Tanpa Keterangan</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Memuat data laporan...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Tidak ada data laporan yang sesuai.</td></tr>
              ) : (
                currentItems.map((item, index) => (
                  <tr key={item.uid}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.nis}</td>
                    <td>{item.nama_lengkap}</td>
                    <td><span className="badge badge-info">{item.kelas}</span></td>
                    
                    {modeRekap === 'harian' ? (
                      <>
                        <td>{getBadgeStatus(item.status)}</td>
                        <td>{item.waktu}</td>
                        <td>{item.keterangan}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{item.hadir}</td>
                        <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{item.terlambat}</td>
                        <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{item.tanpaKeterangan}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
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

      {/* CSS Khusus Cetak/PDF agar bersih dari elemen navigasi/filter */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 7mm 8mm 7mm;
          }

          html, body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .sidebar,
          .sidebar-overlay,
          .mobile-header,
          .bg-shape,
          .no-print {
            display: none !important;
          }

          .main-content {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
          }

          .laporan-print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-header {
            display: block !important;
            padding-bottom: 0.5rem;
            margin-bottom: 0.75rem;
            border-bottom: 2px solid #111827;
          }

          .card {
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            padding: 0 !important;
          }

          .table-responsive {
            overflow: visible !important;
            width: 100% !important;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            font-size: 9.5pt !important;
            border-collapse: collapse !important;
            word-break: break-word !important;
          }

          th, td {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          thead th {
            background: #f3f4f6 !important;
            color: #111827 !important;
            font-weight: 700 !important;
            border: 1px solid #d1d5db !important;
            padding: 6px !important;
            text-align: center !important;
          }

          tbody td {
            border: 1px solid #e5e7eb !important;
            padding: 6px !important;
            vertical-align: middle !important;
          }

          thead th:nth-child(1), tbody td:nth-child(1) { width: 6% !important; }
          thead th:nth-child(2), tbody td:nth-child(2) { width: 14% !important; }
          thead th:nth-child(3), tbody td:nth-child(3) { width: 20% !important; }
          thead th:nth-child(4), tbody td:nth-child(4) { width: 12% !important; }
          thead th:nth-child(5), tbody td:nth-child(5) { width: 12% !important; }
          thead th:nth-child(6), tbody td:nth-child(6) { width: 18% !important; }
          thead th:nth-child(7), tbody td:nth-child(7) { width: 18% !important; }

          .badge {
            box-shadow: none !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
    </div>
  );
}