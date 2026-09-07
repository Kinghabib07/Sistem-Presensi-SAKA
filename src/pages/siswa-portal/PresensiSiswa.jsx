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
              const dDate = new Date();
              const today = dDate.getFullYear() + '-' + String(dDate.getMonth() + 1).padStart(2, '0') + '-' + String(dDate.getDate()).padStart(2, '0');
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

                 setStatus({ type: 'success', msg: 'BERHASIL', detail: `Berhasil mencatat presensi untuk ${userData.nama_lengkap}` });
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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* Kolom Kamera */}
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="qr-reader-siswa" style={{ width: '100%', border: 'none' }}></div>
            
            <div style={{ marginTop: '1.5rem' }}>
              {!isScanning ? (
                <button 
                  onClick={startScanning}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
                >
                  <Camera size={20} /> Buka Kamera & Scan
                </button>
              ) : (
                <button 
                  onClick={stopScanning}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
                >
                  <StopCircle size={20} /> Tutup Kamera
                </button>
              )}
            </div>
            
            {!isScanning && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
                <p>Halo, <strong>{userData.nama_lengkap}</strong></p>
                <p>Tekan tombol di atas untuk memulai presensi.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL POP-UP HASIL SCAN */}
      {status.type && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.65)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 9999, padding: '1rem',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '380px', background: '#fff', textAlign: 'center', padding: '2.5rem 1.5rem', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            {status.type === 'success' ? (
               <div style={{ color: '#10b981' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}><CheckCircle size={72} /></div>
                 <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 800 }}>{status.msg}</h1>
                 <p style={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: 1.5 }}>{status.detail}</p>
               </div>
            ) : status.type === 'warning' ? (
               <div style={{ color: '#f59e0b' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}><AlertTriangle size={72} /></div>
                 <h1 style={{ fontSize: '1.8rem', marginBottom: '0.75rem', fontWeight: 800 }}>{status.msg}</h1>
                 <p style={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: 1.5 }}>{status.detail}</p>
               </div>
            ) : (
               <div style={{ color: '#ef4444' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}><XCircle size={72} /></div>
                 <h1 style={{ fontSize: '1.8rem', marginBottom: '0.75rem', fontWeight: 800 }}>{status.msg}</h1>
                 <p style={{ color: '#4b5563', fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.5 }}>{status.detail}</p>
               </div>
            )}
            
            <button 
              onClick={() => setStatus({ type: '', msg: '', detail: null })} 
              style={{ marginTop: '2rem', background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.75rem 2.5rem', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}