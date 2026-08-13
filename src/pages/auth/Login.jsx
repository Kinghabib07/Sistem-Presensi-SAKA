import { useState } from 'react';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [nis, setNis] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      setError('NIS atau password salah.');
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
              placeholder="Masukkan NIS Anda"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              required
            />
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Kata Sandi</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}
