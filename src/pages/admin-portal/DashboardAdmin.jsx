import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle, Clock, CalendarX } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../services/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardAdmin() {
  const { userData } = useOutletContext();
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [presensiHariIni, setPresensiHariIni] = useState({ hadir: 0, terlambat: 0, tanpaKeterangan: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [presensiList, setPresensiList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Format tanggal hari ini (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // 1. Ambil Data Users dan Presensi Secara Bersamaan
    const usersRef = ref(db, 'users');
    const presensiRef = ref(db, 'presensi');

    const unsubUsers = onValue(usersRef, (snapUsers) => {
      const usersData = snapUsers.val() || {};
      const count = Object.values(usersData).filter(u => u.role === 'siswa' && u.status === 'Aktif').length;
      setTotalSiswa(count);

      const unsubPresensi = onValue(presensiRef, (snapPresensi) => {
        const presensiData = snapPresensi.val() || {};
        
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const todayData = presensiData[todayKey] || {};
        let hadir = 0, terlambat = 0, tanpaKeterangan = 0;
        const loggedList = [];

        Object.keys(todayData).forEach(uid => {
          const absensiSiswa = todayData[uid];
          const dataSiswa = usersData[uid] || {};

          if (absensiSiswa) {
            if (absensiSiswa.status === 'Hadir') hadir++;
            else if (absensiSiswa.status === 'Terlambat') terlambat++;
            else if (absensiSiswa.status === 'Tanpa Keterangan') tanpaKeterangan++;

            loggedList.push({
              uid: uid,
              nis: dataSiswa.nis || '-',
              nama_lengkap: absensiSiswa.nama_lengkap || dataSiswa.nama_lengkap || 'Tanpa Nama',
              kelas: absensiSiswa.kelas || dataSiswa.kelas || '-',
              status: absensiSiswa.status || 'Hadir',
              waktu: absensiSiswa.waktu || '-'
            });
          }
        });

        setPresensiHariIni({ hadir, terlambat, tanpaKeterangan });
        setPresensiList(loggedList.sort((a, b) => b.waktu.localeCompare(a.waktu)));

        const weekArr = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const nameDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
          
          const dataDay = presensiData[k] || {};
          let h = 0, t = 0, a = 0;
          Object.values(dataDay).forEach(val => {
            if (val.status === 'Hadir') h++;
            if (val.status === 'Terlambat') t++;
            if (val.status === 'Tanpa Keterangan') a++;
          });
          weekArr.push({ name: nameDate, Hadir: h, Terlambat: t, 'Tanpa Keterangan': a });
        }
        setWeeklyData(weekArr);
        setLoading(false);
      }, (error) => {
        console.error("Gagal mengambil data presensi:", error);
        setLoading(false);
      });

      return () => unsubPresensi();
    }, (error) => {
      console.error("Gagal mengambil data users:", error);
      setLoading(false);
    });

    return () => unsubUsers();
  }, []);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];
  const totalPresensi = presensiHariIni.hadir + presensiHariIni.terlambat + presensiHariIni.tanpaKeterangan;
  const pieData = totalPresensi === 0 
    ? [{ name: 'Belum Ada Data', value: 1, fill: '#e5e7eb' }]
    : [
        { name: 'Hadir', value: presensiHariIni.hadir },
        { name: 'Terlambat', value: presensiHariIni.terlambat },
        { name: 'Tanpa Keterangan', value: presensiHariIni.tanpaKeterangan }
      ].filter(d => d.value > 0);

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'Hadir': return <span className="badge badge-success" style={{ background: '#10b981', color: '#fff' }}>Hadir</span>;
      case 'Terlambat': return <span className="badge badge-warning" style={{ background: '#ef4444', color: '#fff' }}>Terlambat</span>;
      case 'Tanpa Keterangan': return <span className="badge badge-danger" style={{ background: '#f59e0b', color: '#fff' }}>Tanpa Keterangan</span>;
      default: return <span className="badge badge-secondary" style={{ background: '#9ca3af', color: '#fff' }}>{status}</span>;
    }
  };

  return (
    <div className="dashboard-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .hover-scale { transition: transform 0.3s ease, box-shadow 0.3s ease; }
          .hover-scale:hover { transform: translateY(-5px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
          .chart-card { background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        `}
      </style>

      <div className="mb-8">
        <h1 className="page-title">Ringkasan Hari Ini</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>
          Selamat datang kembali, <strong>{userData ? userData.nama_lengkap : 'Admin'}</strong>
        </p>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card hover-scale">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Total Siswa Aktif</div>
              <div className="stat-value">{loading ? '...' : totalSiswa}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '50%', color: 'var(--primary)' }}>
              <Users size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card hover-scale" style={{ borderLeftColor: '#10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Hadir Hari Ini</div>
              <div className="stat-value" style={{ color: '#10b981' }}>{loading ? '...' : presensiHariIni.hadir}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981' }}>
              <CheckCircle size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card hover-scale" style={{ borderLeftColor: '#ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Terlambat Hari Ini</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>{loading ? '...' : presensiHariIni.terlambat}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#ef4444' }}>
              <Clock size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card hover-scale" style={{ borderLeftColor: '#f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Tanpa Keterangan</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>{loading ? '...' : presensiHariIni.tanpaKeterangan}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', color: '#f59e0b' }}>
              <CalendarX size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="charts-grid" style={{ display: 'grid', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* PIE CHART */}
        <div className="chart-card hover-scale">
          <h3 className="mb-4" style={{ fontSize: '1.1rem', color: '#374151' }}>Rasio Kehadiran Hari Ini</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {totalPresensi === 0 
                    ? <Cell fill="#e5e7eb" />
                    : pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))
                  }
                </Pie>
                <Tooltip 
                  formatter={(value) => [value, 'Siswa']} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                />
                {totalPresensi > 0 && <Legend verticalAlign="bottom" height={36} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
          {totalPresensi === 0 && (
            <p className="text-center text-muted" style={{ marginTop: '-2rem' }}>Belum ada data presensi hari ini.</p>
          )}
        </div>

        {/* BAR CHART */}
        <div className="chart-card hover-scale bar-chart-card">
          <h3 className="mb-4" style={{ fontSize: '1.1rem', color: '#374151' }}>Tren Presensi 7 Hari Terakhir</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(243, 244, 246, 0.4)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Hadir" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Terlambat" stackId="a" fill="#ef4444" />
                <Bar dataKey="Tanpa Keterangan" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* LOG TERKINI */}
      <div className="card hover-scale">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#374151' }}>Log Presensi Terkini ({todayStr})</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th width="50" style={{ textAlign: 'center' }}>No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Status</th>
                <th>Waktu Masuk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                    Memuat log presensi...
                  </td>
                </tr>
              ) : presensiList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <AlertTriangle size={40} color="#9ca3af" />
                      <span>Belum ada siswa yang melakukan presensi hari ini.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                presensiList.map((item, index) => (
                  <tr key={item.uid}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.nis}</td>
                    <td>{item.nama_lengkap}</td>
                    <td><span className="badge badge-info">{item.kelas}</span></td>
                    <td>{getBadgeStatus(item.status)}</td>
                    <td style={{ fontWeight: 600, color: '#4b5563' }}>
                      {item.waktu === '-' ? '-' : item.waktu.includes('T') ? new Date(item.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') : item.waktu}
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