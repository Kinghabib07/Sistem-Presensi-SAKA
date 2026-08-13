import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ref, get, child } from 'firebase/database';
import { db } from '../services/firebase';

export default function RoleBasedRoute({ user, allowedRole }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const snapshot = await get(child(ref(db), `users/${user.uid}`));
        if (snapshot.exists() && snapshot.val().role) {
          setRole(snapshot.val().role);
        } else {
          setRole('siswa');
        }
      } catch (error) {
        setRole('siswa');
      }
      setLoading(false);
    }
    if (user) fetchRole();
  }, [user]);

  if (loading) return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><h2>Memeriksa Izin Akses...</h2></div>;

  if (role === allowedRole) {
    return <Outlet context={{ role }} />;
  }

  return <Navigate to="/" replace />;
}
