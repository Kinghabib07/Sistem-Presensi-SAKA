import { useOutletContext } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useState, useEffect } from 'react';

export default function PresensiSiswa() {
  const { userData } = useOutletContext();
  const [timestamp, setTimestamp] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(15);

  // Perbarui QR Code setiap 15 detik (Anti-Titip Absen)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimestamp(Date.now());
          return 15; // Reset ke 15 detik
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!userData?.uid) return <div>Memuat...</div>;

  const qrData = {
    uid: userData.uid,
    nama: userData.nama_lengkap,
    kelas: userData.kelas,
    time: timestamp
  };

  // Encode menjadi Base64 agar lebih ringkas dan sulit dibaca mata manusia secara langsung
  const qrValue = btoa(JSON.stringify(qrData));

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="page-title mb-2">QR Code Kehadiran</h1>
      <p className="text-muted mb-8">Tunjukkan QR Code ini ke kamera Scanner Admin. QR akan diperbarui otomatis.</p>

      <div className="card" style={{ padding: '4rem 2rem', background: 'white' }}>
        <div style={{ display: 'inline-block', padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', position: 'relative' }}>
          <QRCode 
            value={qrValue} 
            size={280}
            level="H" 
          />
          {/* Overlay Security Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--primary)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            Berubah dalam {timeLeft}d
          </div>
        </div>
        
        <h3 style={{ marginTop: '3rem', color: '#1e293b' }}>{userData?.nama_lengkap}</h3>
        <p style={{ color: '#64748b' }}>{userData?.kelas}</p>
        
        <div style={{ marginTop: '2rem' }} className="badge badge-success">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
            QR Dinamis Aktif (Aman)
          </span>
        </div>
      </div>
    </div>
  );
}
