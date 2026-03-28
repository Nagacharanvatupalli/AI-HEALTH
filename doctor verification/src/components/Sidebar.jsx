import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Home, Inbox, Archive, User, LogOut, HeartPulse } from 'lucide-react';

export const Sidebar = ({ isOpen, setOpen }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <HeartPulse size={30} color="var(--primary)" />
                <span className="brand-name">DocVerify AI</span>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/dashboard" className="nav-item">
                    <Home size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/pending-cases" className="nav-item">
                    <Inbox size={20} />
                    <span>Pending Cases</span>
                </NavLink>
                <NavLink to="/reviewed-cases" className="nav-item">
                    <Archive size={20} />
                    <span>Reviewed Cases</span>
                </NavLink>
                <a href="#" className="nav-item">
                    <User size={20} />
                    <span>Profile</span>
                </a>
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item logout-btn" onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>

            <style>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: var(--surface);
          border-right: 1px solid var(--border-light);
          position: fixed;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: transform var(--transition);
        }
        
        .sidebar-header {
          padding: var(--sp-3);
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          border-bottom: 1px solid var(--border-light);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--primary);
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--sp-2) 0;
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: 12px var(--sp-3);
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
          transition: all var(--transition);
          border-left: 4px solid transparent;
        }

        .nav-item:hover {
          background: var(--bg);
          color: var(--primary);
        }

        .nav-item.active {
          background: rgba(30, 136, 229, 0.05);
          color: var(--primary);
          border-left-color: var(--primary);
        }

        .sidebar-footer {
          padding: var(--sp-2) 0;
          border-top: 1px solid var(--border-light);
        }

        .logout-btn {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 1rem;
          color: var(--danger);
        }
        
        .logout-btn:hover {
          background: rgba(229, 57, 53, 0.05);
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
        </aside>
    );
};
