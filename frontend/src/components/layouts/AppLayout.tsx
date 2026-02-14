/**
 * AppLayout — Shared layout with persistent Navbar
 * =================================================
 * Wraps all pages except full-screen experiences (interview room, resume editor).
 * Navbar is rendered once here; child pages should NOT import Navbar themselves.
 */

import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';

export default function AppLayout() {
  return (
    <>
      <Navbar />
      {/* pt-16/18 matches Navbar height so content sits below the fixed header */}
      <Outlet />
    </>
  );
}
