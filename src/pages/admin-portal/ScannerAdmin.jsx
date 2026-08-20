import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ref, push, set, get } from 'firebase/database';
import { db } from '../../services/firebase';
import { CheckCircle, XCircle, AlertTriangle, Camera, StopCircle } from 'lucide-react';

export default function ScannerAdmin() {
  const [status, setStatus] = useState({ type: '', msg: '', detail: null });
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  // Fungsi untuk memulai pemindaian
  const startScanning = async () => {
    setStatus({ type: '', msg: '', detail: null });
    
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader");
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
            const now = Date.now();
            const diff = now - decoded.time;

            if (diff > 30000 || diff < -5000) {
              setStatus({ type: 'danger', msg: 'QR CODE KEDALUWARSA / TIDAK VALID!', detail: 'Diduga menggunakan foto/screenshot (Indikasi Titip Absen).' });
            } else {
              const today = new Date().toISOString().split('T')[0];
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
                 const jam = new Date().getHours();
                 const menit = new Date().getMinutes();
                 let kehadiranStatus = 'Hadir';
                 if (jam > 7 || (jam === 7 && menit > 15)) {
                   kehadiranStatus = 'Terlambat';
                 }
                 const newRecordRef = push(ref(db, `presensi/${decoded.uid}`));
                 await set(newRecordRef, {
                   tanggal: today, waktu: new Date().toISOString(), status: kehadiranStatus, nama: decoded.nama, kelas: decoded.kelas, uid: decoded.uid
                 });
                 setStatus({ type: 'success', msg: kehadiranStatus.toUpperCase(), detail: `Berhasil mencatat presensi untuk ${decoded.nama} (${decoded.kelas})` });
              }
            }
          } catch (err) {
            setStatus({ type: 'danger', msg: 'FORMAT QR SALAH', detail: 'QR Code ini tidak berasal dari sistem Portal Siswa.' });
          }

          // Jeda beberapa detik sebelum lanjut scan berikutnya
          setTimeout(async () => {
            setStatus({ type: '', msg: '', detail: null });
            if (scannerRef.current && scannerRef.current.isScanning) {
              await scannerRef.current.resume();
              setIsScanning(true);
            }
          }, 3000);
        },
        (error) => {
          // Ignore error scanning frame harian
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

  return (
    <div>
      <style>{`
        #qr-reader {
          border: none !important;
          width: 100% !important;
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          aspect-ratio: 1 / 1 !important; /* Memaksa video selalu KOTAK Sempurna! */
          border-radius: 12px !important;
        }
        #qr-reader__scan_region {
          border-radius: 12px;
          overflow: hidden;
          background-color: transparent !important;
        }
        /* Menyembunyikan tombol/fitur scan file gambar bawaan */
        #qr-reader__dashboard_section_swaplink {
          display: none !important;
        }
        /* Percantik tombol bawaan kamera jika ada */
        #qr-reader__dashboard_section_csr button {
          background: #4f46e5 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
          margin: 4px !important;
          cursor: pointer !important;
          font-weight: 600 !important;
        }
        #qr-reader__dashboard_section_csr button:hover {
          background: #4338ca !important;
        }
      `}</style>

      <h1 className="page-title mb-6">Pemindai Presensi (Scanner)</h1>
      <p className="text-muted mb-8">Arahkan kamera ke QR Code di HP Siswa. Sistem otomatis menolak QR berupa <em>screenshot</em>.</p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Kolom Kamera */}
        <div style={{ flex: '1 1 400px', maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="qr-reader" style={{ width: '100%', border: 'none' }}></div>
            
            {/* Tombol Kontrol Tunggal (Start / Stop) */}
            <div style={{ marginTop: '1.5rem' }}>
              {!isScanning ? (
                <button 
                  onClick={startScanning}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Camera size={18} /> Start Scanning
                </button>
              ) : (
                <button 
                  onClick={stopScanning}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <StopCircle size={18} /> Stop Scanning
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
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                   {/* Ikon Hand Holding Phone */}
                   <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                     <rect x="7" y="3" width="10" height="16" rx="2" />
                     <rect x="9" y="6" width="3" height="3" fill="currentColor" opacity="0.7"/>
                     <rect x="13" y="6" width="2" height="2" fill="currentColor" opacity="0.7"/>
                     <rect x="9" y="10" width="2" height="2" fill="currentColor" opacity="0.7"/>
                     <rect x="13" y="10" width="2" height="2" fill="currentColor" opacity="0.7"/>
                     <path d="M5 12c-1 0-2 1-2 2v2c0 2 1 3 3 3h4" />
                     <path d="M12 19v2a2 2 0 0 0 2 2h3c2 0 4-2 4-4v-3" />
                   </svg>
                 </div>
                 <h2>Siap Memindai...</h2>
                 <p>Tekan tombol <strong>Start Scanning</strong> dan arahkan QR Code ke kamera.</p>
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