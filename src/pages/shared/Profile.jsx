import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { User, Mail, Shield, BookOpen, Lock, Key } from 'lucide-react';

export default function Profile() {
  const { userData } = useOutletContext();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Regex: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 symbol
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      setMsg({ text: "Kata sandi harus minimal 8 karakter dan mengandung kombinasi huruf besar, huruf kecil, angka, serta simbol.", type: 'danger' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMsg({ text: "Konfirmasi kata sandi tidak cocok.", type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMsg({ text: "Kata sandi berhasil diperbarui dengan aman!", type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error(error);
      setMsg({ text: "Gagal mengubah password. Silakan logout dan login kembali terlebih dahulu untuk alasan keamanan.", type: 'danger' });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: '#fff', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
        }}>
          <User size={40} />
        </div>
        <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Profil Pengguna</h1>
        <p className="text-muted">Kelola informasi pribadi dan keamanan akun Anda.</p>
      </div>
      
      <div className="card mb-6" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
        <h3 className="mb-6" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
          <User size={20} className="text-muted" /> Informasi Akun
        </h3>
        
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '12px', color: '#4b5563' }}>
              <User size={22} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: 600 }}>Nama Lengkap</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>{userData?.nama_lengkap || 'Belum diatur'}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '12px', color: '#4b5563' }}>
              <Mail size={22} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: 600 }}>Email / Username</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#374151' }}>{auth.currentUser?.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: userData?.kelas ? '1.25rem' : '0', borderBottom: userData?.kelas ? '1px solid #f3f4f6' : 'none' }}>
            <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '12px', color: '#4b5563' }}>
              <Shield size={22} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', fontWeight: 600 }}>Tingkat Akses</div>
              <div>
                <span className={`badge badge-${userData?.role === 'admin' ? 'info' : 'success'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '20px' }}>
                  {userData?.role === 'admin' ? 'Administrator (Admin)' : 'Siswa Aktif'}
                </span>
              </div>
            </div>
          </div>

          {userData?.kelas && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '12px', color: '#4b5563' }}>
                <BookOpen size={22} />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: 600 }}>Kelas Anda</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>{userData.kelas}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
          <Key size={20} className="text-muted" /> Ubah Kata Sandi
        </h3>
        <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
          Kata sandi harus minimal 8 karakter (terdiri dari huruf besar, kecil, angka, dan simbol).
        </p>

        {msg.text && (
          <div className={`badge badge-${msg.type}`} style={{ display: 'block', marginBottom: '1.5rem', padding: '1rem', whiteSpace: 'normal', fontSize: '0.9rem', borderRadius: '8px', lineHeight: '1.4' }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Kata Sandi Baru</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', color: '#9ca3af' }} />
              <input 
                type="password" 
                className="form-control" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                placeholder="Kata sandi baru..." 
                disabled={loading}
                style={{ paddingLeft: '2.75rem', height: '3.2rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Konfirmasi Kata Sandi Baru</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', color: '#9ca3af' }} />
              <input 
                type="password" 
                className="form-control" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                placeholder="Ketik ulang kata sandi baru..." 
                disabled={loading}
                style={{ paddingLeft: '2.75rem', height: '3.2rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading}
            style={{ height: '3.2rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600 }}
          >
            {loading ? 'Menyimpan Perubahan...' : 'Perbarui Kata Sandi'}
          </button>
        </form>
      </div>
    </div>
  );
}
