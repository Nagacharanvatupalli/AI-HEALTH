import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="layout-container">
      <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="main-wrapper">
        <TopNav toggleSidebar={toggleSidebar} />

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
        }

        .main-wrapper {
          flex: 1;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          transition: margin-left var(--transition);
        }

        .main-content {
          flex: 1;
          padding: var(--sp-4);
          background-color: var(--bg);
          position: relative;
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 90;
          backdrop-filter: blur(2px);
        }

        @media (max-width: 768px) {
          .main-wrapper {
            margin-left: 0;
          }
          
          .main-content {
            padding: var(--sp-2);
          }

          .sidebar-overlay {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};
