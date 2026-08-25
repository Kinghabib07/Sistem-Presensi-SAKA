import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

export default function ScannerAdmin() {
  const [timestamp, setTimestamp] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(15);

  // Perbarui QR Code Admin setiap 15 detik (Anti-Titip Absen)
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

  // Data unik yang dibawa oleh QR Code Admin
  const qrData = {
    type: 'ADMIN_PRESENSI_QR',
    time: timestamp,
    validDuration: 30000 // Validasi waktu di sisi siswa
  };

  // Encode menjadi Base64
  const qrValue = btoa(JSON.stringify(qrData));

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="page-title mb-2">QR Code Presensi Admin</h1>
      <p className="text-muted mb-8">Minta siswa memindai QR Code ini menggunakan menu presensi di HP mereka.</p>

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
        
        <h3 style={{ marginTop: '3rem', color: '#1e293b' }}>Sistem Presensi Kelas</h3>
        <p style={{ color: '#64748b' }}>Arahkan kamera HP siswa ke layar ini</p>
        
        <div style={{ marginTop: '2rem' }} className="badge badge-success">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
            QR Dinamis Admin Aktif
          </span>
        </div>
      </div>
    </div>
  );
}