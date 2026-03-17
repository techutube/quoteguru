'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import '@/styles/globals.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setUser({ role: data.user.role, name: data.user.name });
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (user?.role === 'Admin' && pathname === '/dashboard') {
      router.push('/dashboard/admin/users');
    }
  }, [user, pathname, router]);

  // Close sidebar whenever the route changes (mobile nav)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (isLoading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="dashboard-wrapper">
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>DriveDesk</h2>
          <span className="badge">{user?.role}</span>
        </div>

        <nav className="sidebar-nav">
          {user?.role !== 'Admin' && (
            <>
              <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
                📊 Dashboard
              </Link>

              {(user?.role === 'Super Admin' || user?.role === 'Manager') && (
                <Link href="/dashboard/approvals" className={`nav-link ${pathname?.includes('/approvals') ? 'active' : ''}`}>
                  ✅ Approvals
                </Link>
              )}

              <Link href="/dashboard/customers" className={`nav-link ${pathname?.includes('/customers') ? 'active' : ''}`}>
                👥 Customers
              </Link>

              <Link href="/dashboard/quotations" className={`nav-link ${pathname?.includes('/quotations') ? 'active' : ''}`}>
                📋 Quotations
              </Link>

              <Link href="/dashboard/finance" className={`nav-link ${pathname?.includes('/finance') ? 'active' : ''}`}>
                💰 Finance Calculator
              </Link>
            </>
          )}

          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <>
              <div className="nav-section">Admin Settings</div>
              <Link href="/dashboard/admin/users" className={`nav-link ${pathname?.includes('/admin/users') ? 'active' : ''}`}>
                👤 User Management
              </Link>
              <Link href="/dashboard/admin/inventory" className={`nav-link ${pathname?.includes('/admin/inventory') ? 'active' : ''}`}>
                🚗 Cars &amp; Inventory
              </Link>
              <Link href="/dashboard/admin/accessories" className={`nav-link ${pathname?.includes('/admin/accessories') ? 'active' : ''}`}>
                🔧 Accessories Master
              </Link>
            </>
          )}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          {/* Hamburger — mobile only */}
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>

          <div className="page-title">
            <h1>DriveDesk</h1>
          </div>

          <div className="topbar-actions">
            <div className="user-profile-container" ref={dropdownRef}>
              <div className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <span className="user-name-header">{user?.name}</span>
                <div className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
              </div>

              {isDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user?.name}</p>
                    <p className="dropdown-role">{user?.role}</p>
                  </div>
                  <Link href="/dashboard/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span style={{ marginRight: '8px' }}>👤</span> My Profile
                  </Link>
                  <button onClick={handleLogout} className="dropdown-logout">
                    <span style={{ marginRight: '8px' }}>⎋</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>

      <style jsx>{`
        .dashboard-wrapper {
          display: flex;
          height: 100vh;
          background-color: var(--bg-color);
          overflow: hidden;
          position: relative;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background-color: white;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
          z-index: 20;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .sidebar-header h2 {
          color: var(--brand-blue);
          font-weight: 800;
          font-size: 1.2rem;
        }

        .badge {
          background-color: var(--brand-blue-light);
          color: white;
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--spacing-md);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          color: var(--text-secondary);
          font-weight: 500;
          border-radius: var(--radius-md);
          transition: all 0.2s ease-in-out;
          font-size: 0.95rem;
        }

        .nav-link:hover {
          background-color: #f1f5f9;
          color: var(--brand-blue);
          transform: translateX(4px);
        }

        .nav-link.active {
          background-color: var(--brand-blue);
          color: white;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .nav-section {
          padding: var(--spacing-lg) 0.5rem 0.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          font-weight: 700;
          margin-top: var(--spacing-sm);
        }

        @media (max-width: 768px) {
          .nav-link {
            padding: 1.1rem 1.25rem;
            font-size: 1.1rem;
            gap: 1rem;
          }
          .sidebar-nav {
            gap: 0.75rem;
          }
          .nav-section {
            padding-top: var(--spacing-xl);
            font-size: 0.85rem;
          }
        }

        /* ── Main Area ── */
        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .topbar {
          height: 60px;
          background-color: white;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-md);
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .page-title h1 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--brand-blue);
          white-space: nowrap;
        }

        /* Hidden on desktop, shown on mobile */
        .hamburger-btn {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .hamburger-btn span {
          display: block;
          width: 22px;
          height: 2px;
          background-color: var(--text-primary);
          border-radius: 2px;
        }

        .hamburger-btn:hover span {
          background-color: var(--brand-blue);
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .user-profile-container {
          position: relative;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .user-name-header {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 0.875rem;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: var(--brand-blue);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .content-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--spacing-lg);
        }

        /* ── Profile Dropdown ── */
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          width: 210px;
          background: white;
          border-radius: var(--radius-md);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          border: 1px solid var(--border-color);
          z-index: 50;
          overflow: hidden;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .dropdown-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          background-color: #f8fafc;
        }

        .dropdown-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.875rem;
          margin: 0;
        }

        .dropdown-role {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 2px 0 0 0;
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.875rem;
          text-decoration: none;
          transition: background-color 0.2s;
          border-top: 1px solid var(--border-color);
        }

        .dropdown-item:hover {
          background-color: #f1f5f9;
          color: var(--brand-blue);
        }

        .dropdown-logout {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          border-top: 1px solid var(--border-color);
          color: var(--danger);
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-logout:hover {
          background-color: #fef2f2;
        }

        /* ── Loading ── */
        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: var(--brand-blue);
          font-weight: 600;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            transform: translateX(-100%);
            z-index: 30;
          }

          .sidebar.sidebar-open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.2);
          }

          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.45);
            z-index: 25;
            backdrop-filter: blur(2px);
          }

          .hamburger-btn {
            display: flex;
          }

          .user-name-header {
            display: none;
          }

          .content-area {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
}
