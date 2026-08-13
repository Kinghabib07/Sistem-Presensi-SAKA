import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../services/firebase';

export default function Profile() {
  const { userData } = useOutletContext();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg({ text: "Password minimal 6 karakter.", type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMsg({ text: "Password berhasil diperbarui!", type: 'success' });
        setNewPassword('');
      }
    } catch (error) {
      console.error(error);
      setMsg({ text: "Gagal mengubah password. Silakan logout dan login kembali terlebih dahulu untuk alasan keamanan.", type: 'danger' });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="page-title mb-6">Profil Saya</h1>
      
      <div className="card mb-6">
        <h3 className="mb-4">Informasi Akun</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <div className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama Lengkap</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{userData?.nama_lengkap || 'Belum diatur'}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email / Username</div>
            <div style={{ fontSize: '1.1rem' }}>{auth.currentUser?.email}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peran (Role)</div>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`badge badge-${userData?.role === 'admin' ? 'info' : 'success'}`}>
                {userData?.role || 'Siswa'}
              </span>
            </div>
          </div>
          {userData?.kelas && (
            <div>
              <div className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kelas</div>
              <div style={{ fontSize: '1.1rem' }}>{userData.kelas}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Ubah Kata Sandi</h3>
        {msg.text && (
          <div className={`badge badge-${msg.type}`} style={{ display: 'block', marginBottom: '1.5rem', padding: '1rem', whiteSpace: 'normal', fontSize: '0.9rem' }}>
            {msg.text}
          </div>
        )}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Kata Sandi Baru</label>
            <input 
              type="password" 
              className="form-control" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
              placeholder="Minimal 6 karakter" 
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
          </button>
        </form>
      </div>
    </div>
  );
}
