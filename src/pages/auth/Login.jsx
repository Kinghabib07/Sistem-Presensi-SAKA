import { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [nis, setNis] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Trik Firebase: Firebase mewajibkan format email, jadi kita akali
      // dengan menambahkan domain palsu di belakang NIS secara otomatis.
      // Jadi siswa cukup mengetikkan NIS (misal: 12345), tapi sistem mengirimnya sebagai 12345@sekolah.id
      let loginEmail = nis;
      if (!nis.includes('@')) {
        loginEmail = `${nis}@sekolah.id`;
      }
      
      await signInWithEmailAndPassword(auth, loginEmail, password);
      // Jika berhasil, App.js akan otomatis me-redirect ke Dashboard Siswa atau Admin
    } catch (err) {
      setError('NIS atau password salah. Cek kembali ketikan Anda.');
      console.error(err);
    }
    setLoading(false);
  };

  const buatAkunDummy = async () => {
    setLoading(true);
    try {
      // 1. Buat akun Admin
      try {
         const adminCred = await createUserWithEmailAndPassword(auth, 'admin@sekolah.id', 'admin123');
         await set(ref(db, `users/${adminCred.user.uid}`), {
             nama_lengkap: 'Administrator',
             role: 'admin',
             uid: adminCred.user.uid
         });
      } catch (e) { console.log('Admin mungkin sudah ada'); }

      // 2. Buat akun Siswa
      try {
         const siswaCred = await createUserWithEmailAndPassword(auth, '12345@sekolah.id', 'siswa123');
         await set(ref(db, `users/${siswaCred.user.uid}`), {
             nama_lengkap: 'Budi Santoso',
             role: 'siswa',
             kelas: 'X IPA 1',
             uid: siswaCred.user.uid
         });
      } catch (e) { console.log('Siswa mungkin sudah ada'); }

      alert('Berhasil! 2 Akun Dummy telah dibuat.\n\nLogin Admin:\nUsername: admin\nPassword: admin123\n\nLogin Siswa:\nUsername: 12345\nPassword: siswa123');
      setNis('admin');
      setPassword('admin123');
    } catch (err) {
      alert('GAGAL: Pastikan Anda sudah mengaktifkan fitur "Email/Password" Sign-in di Firebase Console (Menu Authentication).');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Portal Kesiswaan</h1>
          <p className="text-muted">Sistem Presensi Terpadu</p>
        </div>
        
        {error && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '1rem', padding: '1rem', whiteSpace: 'normal', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">NIS (Nomor Induk Siswa) / Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Masukkan NIS atau Email"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              required
            />
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Kata Sandi</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-control" 
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk Sistem'}
          </button>
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Bantu Testing Mode:</p>
            <button 
              type="button" 
              onClick={buatAkunDummy} 
              className="btn" 
              disabled={loading}
              style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', width: '100%' }}
            >
              Klik Untuk Buat 2 Akun Dummy (Admin & Siswa)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
