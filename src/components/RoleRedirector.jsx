import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ref, get, child } from 'firebase/database';
import { db } from '../services/firebase';

export default function RoleRedirector({ user }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      // Super Admin Fallback
      if (user.email === 'admin@sekolah.id' || user.email === 'admin@gmail.com') {
        setRole('admin');
        setLoading(false);
        return;
      }

      try {
        const snapshot = await get(child(ref(db), `users/${user.uid}`));
        if (snapshot.exists() && snapshot.val().role) {
          setRole(snapshot.val().role);
        } else {
          setRole('siswa'); // default jika tidak punya role
        }
      } catch (error) {
        console.error("Gagal mengambil role:", error);
        setRole('siswa');
      }
      setLoading(false);
    }
    if (user) {
      fetchRole();
    }
  }, [user]);

  if (loading) return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><h2>Memeriksa Akses...</h2></div>;

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else {
    return <Navigate to="/siswa/dashboard" replace />;
  }
}
