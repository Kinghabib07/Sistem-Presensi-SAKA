import { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ref, push, set, get } from 'firebase/database';
import { db } from '../../services/firebase';
import { CheckCircle, XCircle, AlertTriangle, Camera, StopCircle } from 'lucide-react';

export default function PresensiSiswa() {
  const { userData } = useOutletContext();
  const [status, setStatus] = useState({ type: '', msg: '', detail: null });
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  // Fungsi untuk memulai pemindaian
  const startScanning = async () => {
    setStatus({ type: '', msg: '', detail: null });
    
    if (!userData?.uid) {
      alert("Data siswa belum dimuat. Mohon tunggu sebentar.");
      return;
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader-siswa");
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Hentikan sementara pemindaian saat QR terbaca
          await scannerRef.current.pause(true);
          setIsScanning(false);

          try {
            const decoded = JSON.parse(atob(decodedText));

            // Validasi apakah ini QR Code dari Admin yang sah
            if (decoded.type !== 'ADMIN_PRESENSI_QR') {
              setStatus({ type: 'danger', msg: 'QR CODE TIDAK VALID', detail: 'QR Code ini bukan QR Presensi Admin.' });
              return;
            }

            const now = Date.now();
            const diff = now - decoded.time;

            // Validasi waktu kedaluwarsa QR (misal lebih dari 30 detik)
            if (diff > 30000 || diff < -5000) {
              setStatus({ type: 'danger', msg: 'QR CODE KEDALUWARSA!', detail: 'QR Code Admin sudah kadaluarsa. Minta admin memperbarui.' });
            } else {
              const today = new Date().toISOString().split('T')[0];
              const presensiRef = ref(db, `presensi/${today}/${userData.uid}`);
              const snapshot = await get(presensiRef);
              
              let sudahAbsen = snapshot.exists();

              if (sudahAbsen) {
                 setStatus({ type: 'warning', msg: 'SUDAH PRESENSI', detail: `Kamu sudah melakukan presensi hari ini.` });
              } else {
                 const jam = new Date().getHours();
                 const menit = new Date().getMinutes();
                 let kehadiranStatus = 'Hadir';
                 if (jam > 7 || (jam === 7 && menit > 15)) {
                   kehadiranStatus = 'Terlambat';
                 }

                 await set(presensiRef, {
                   tanggal: today, 
                   waktu: new Date().toISOString(), 
                   status: kehadiranStatus, 
                   nama: userData.nama_lengkap, 
                   kelas: userData.kelas, 
                   uid: userData.uid
                 });

                 setStatus({ type: 'success', msg: kehadiranStatus.toUpperCase(), detail: `Berhasil mencatat presensi untuk ${userData.nama_lengkap}` });
              }
            }
          } catch (err) {
            setStatus({ type: 'danger', msg: 'FORMAT QR SALAH', detail: 'Gagal membaca data QR Code.' });
          }

          // Jeda beberapa detik sebelum lanjut scan berikutnya (jika diperlukan)
          setTimeout(async () => {
            setStatus({ type: '', msg: '', detail: null });
            if (scannerRef.current && scannerRef.current.isScanning) {
              await scannerRef.current.resume();
              setIsScanning(true);
            }
          }, 3000);
        },
        (error) => {
          // Abaikan error frame harian saat scanning
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Gagal memulai kamera:", err);
    }
  };

  // Fungsi untuk menghentikan pemindaian secara manual
  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Gagal menghentikan scanner:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  if (!userData?.uid) return <div>Memuat data siswa...</div>;

  return (
    <div>
      <style>{`
        #qr-reader-siswa {
          border: none !important;
          width: 100% !important;
        }
        #qr-reader-siswa video {
          object-fit: cover !important;
          width: 100% !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 12px !important;
        }
        #qr-reader-siswa__scan_region {
          border-radius: 12px;
          overflow: hidden;
          background-color: transparent !important;
        }
        #qr-reader-siswa__dashboard_section_swaplink {
          display: none !important;
        }
      `}</style>

      <h1 className="page-title mb-6">Scan QR Kehadiran</h1>
      <p className="text-muted mb-8">Arahkan kamera HP kamu ke QR Code yang ditampilkan oleh Admin.</p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Kolom Kamera */}
        <div style={{ flex: '1 1 400px', maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="qr-reader-siswa" style={{ width: '100%', border: 'none' }}></div>
            
            <div style={{ marginTop: '1.5rem' }}>
              {!isScanning ? (
                <button 
                  onClick={startScanning}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Camera size={18} /> Buka Kamera & Scan
                </button>
              ) : (
                <button 
                  onClick={stopScanning}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <StopCircle size={18} /> Tutup Kamera
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Hasil */}
        <div style={{ flex: '1 1 300px' }}>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
            
            {!status.type ? (
               <div style={{ color: 'var(--text-muted)' }}>
                 <h2>Halo, {userData.nama_lengkap}</h2>
                 <p style={{ marginTop: '0.5rem' }}>Tekan tombol <strong>Buka Kamera & Scan</strong> lalu arahkan ke QR Admin untuk melakukan presensi.</p>
               </div>
            ) : status.type === 'success' ? (
               <div style={{ color: 'var(--success)' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><CheckCircle size={64} /></div>
                 <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{status.msg}</h1>
                 <p style={{ color: 'var(--text)', fontSize: '1.1rem' }}>{status.detail}</p>
               </div>
            ) : status.type === 'warning' ? (
               <div style={{ color: 'var(--warning)' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><AlertTriangle size={64} /></div>
                 <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{status.msg}</h1>
                 <p style={{ color: 'var(--text)', fontSize: '1rem' }}>{status.detail}</p>
               </div>
            ) : (
               <div style={{ color: 'var(--danger)' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><XCircle size={64} /></div>
                 <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{status.msg}</h1>
                 <p style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 600 }}>{status.detail}</p>
               </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}