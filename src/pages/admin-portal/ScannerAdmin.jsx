import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ref, push, set, get, child } from 'firebase/database';
import { db } from '../../services/firebase';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ScannerAdmin() {
  const [status, setStatus] = useState({ type: '', msg: '', detail: null });
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let scanner = new Html5QrcodeScanner("qr-reader", {
      qrbox: { width: 250, height: 250 },
      fps: 10,
    });

    scanner.render(async (decodedText) => {
      if (!isScanning) return;
      
      // Jeda scanning agar tidak dobel scan berulang-ulang dengan cepat
      setIsScanning(false);
      scanner.pause(true);

      try {
        const decoded = JSON.parse(atob(decodedText));
        const now = Date.now();
        const diff = now - decoded.time;

        // Cek kedaluwarsa (Toleransi 30 detik untuk menghindari jeda jaringan)
        if (diff > 30000 || diff < -5000) {
          setStatus({ 
            type: 'danger', 
            msg: 'QR CODE KEDALUWARSA / TIDAK VALID!', 
            detail: 'Diduga menggunakan foto/screenshot (Indikasi Titip Absen).' 
          });
        } else {
          // Validasi berhasil, proses presensi
          const today = new Date().toISOString().split('T')[0];
          
          // Cek apakah siswa ini sudah absen hari ini (mencegah duplikat absen di hari yg sama)
          const presensiRef = ref(db, `presensi/${decoded.uid}`);
          const snapshot = await get(presensiRef);
          
          let sudahAbsen = false;
          if (snapshot.exists()) {
             const records = snapshot.val();
             sudahAbsen = Object.values(records).some(r => r.tanggal === today);
          }

          if (sudahAbsen) {
             setStatus({ type: 'warning', msg: 'SUDAH PRESENSI', detail: `${decoded.nama} sudah melakukan presensi hari ini.` });
          } else {
             // Tentukan status Terlambat atau Hadir berdasarkan Jam (Misal batas jam 07:15)
             const jam = new Date().getHours();
             const menit = new Date().getMinutes();
             let kehadiranStatus = 'Hadir';
             if (jam > 7 || (jam === 7 && menit > 15)) {
               kehadiranStatus = 'Terlambat';
             }
             // Simpan ke DB
             const newRecordRef = push(ref(db, `presensi/${decoded.uid}`));
             await set(newRecordRef, {
               tanggal: today,
               waktu: new Date().toISOString(),
               status: kehadiranStatus,
               nama: decoded.nama,
               kelas: decoded.kelas,
               uid: decoded.uid
             });

             setStatus({ 
               type: 'success', 
               msg: kehadiranStatus.toUpperCase(), 
               detail: `Berhasil mencatat presensi untuk ${decoded.nama} (${decoded.kelas})` 
             });
          }
        }
      } catch (err) {
        setStatus({ type: 'danger', msg: 'FORMAT QR SALAH', detail: 'QR Code ini tidak berasal dari sistem Portal Siswa.' });
      }

      // Resume scanner setelah 3 detik
      setTimeout(() => {
        setStatus({ type: '', msg: '', detail: null });
        setIsScanning(true);
        if(scanner) scanner.resume();
      }, 3000);

    }, (error) => {
      // Abaikan error saat tidak ada QR yang terdeteksi
    });

    return () => {
      try {
        if (scanner) {
          scanner.clear().catch(e => console.log("Abaikan error clear scanner", e));
        }
      } catch (err) {
        console.log("Abaikan error unmount:", err);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <style>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader video {
          object-fit: cover !important;
          max-height: 350px !important;
          width: 100% !important;
          border-radius: 8px;
        }
        #qr-reader__scan_region {
          background-color: #000 !important;
          border-radius: 8px;
          overflow: hidden;
        }
        #qr-reader__dashboard_section_csr span {
          color: #fff !important;
        }
      `}</style>
      <h1 className="page-title mb-6">Pemindai Presensi (Scanner)</h1>
      <p className="text-muted mb-8">Arahkan kamera ke QR Code di HP Siswa. Sistem otomatis menolak QR berupa *screenshot*.</p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Kolom Kamera */}
        <div style={{ flex: '1 1 400px', maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '0.5rem', background: '#000', overflow: 'hidden', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
            <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', border: 'none' }}></div>
          </div>
        </div>

        {/* Kolom Hasil */}
        <div style={{ flex: '1 1 300px' }}>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
            
            {!status.type ? (
               <div style={{ color: 'var(--text-muted)' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><CheckCircle size={48} opacity={0.2} /></div>
                 <h2>Siap Memindai...</h2>
                 <p>Menunggu QR Code masuk ke area kamera.</p>
               </div>
            ) : status.type === 'success' ? (
               <div style={{ color: 'var(--success)', animation: 'popIn 0.3s ease-out' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><CheckCircle size={64} /></div>
                 <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{status.msg}</h1>
                 <p style={{ color: 'var(--text)', fontSize: '1.2rem' }}>{status.detail}</p>
               </div>
            ) : status.type === 'warning' ? (
               <div style={{ color: 'var(--warning)', animation: 'popIn 0.3s ease-out' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><AlertTriangle size={64} /></div>
                 <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{status.msg}</h1>
                 <p style={{ color: 'var(--text)', fontSize: '1.1rem' }}>{status.detail}</p>
               </div>
            ) : (
               <div style={{ color: 'var(--danger)', animation: 'popIn 0.3s ease-out' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><XCircle size={64} /></div>
                 <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{status.msg}</h1>
                 <p style={{ color: 'var(--text)', fontSize: '1.1rem', fontWeight: 600 }}>{status.detail}</p>
               </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
