import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Menu } from 'lucide-react';

export const TopNav = ({ toggleSidebar }) => {
    const { user } = useAuth();

    return (
        <header className="topnav">
            <div className="topnav-left">
                <button className="menu-btn" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
            </div>

            <div className="topnav-right">
                <div className="welcome-text">
                    Welcome, <strong>Dr. {user?.name || 'Doctor'}</strong>
                </div>

                {user?.streamId && (
                    <span className="badge badge-primary stream-badge">
                        {user.streamId}
                    </span>
                )}

                <button className="icon-btn">
                    <Bell size={20} />
                    <span className="notification-dot"></span>
                </button>

                <div className="profile-avatar">
                    {user?.name ? user.name.charAt(0) : 'D'}
                </div>
            </div>

            <style>{`
        .topnav {
          height: 64px;
          background: var(--surface);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--sp-3);
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .topnav-left {
          display: none;
        }

        .menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: var(--sp-1);
        }

        .topnav-right {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          margin-left: auto;
        }

        .welcome-text {
          font-size: 0.875rem;
          color: var(--text-main);
        }

        .stream-badge {
          margin-right: var(--sp-2);
        }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition);
        }
        
        .icon-btn:hover {
          color: var(--primary);
        }

        .notification-dot {
          position: absolute;
          top: 0;
          right: 0;
          width: 8px;
          height: 8px;
          background: var(--danger);
          border-radius: 50%;
          border: 2px solid var(--surface);
        }

        .profile-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(30, 136, 229, 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.125rem;
          cursor: pointer;
          border: 2px solid transparent;
          transition: border-color var(--transition);
        }
        
        .profile-avatar:hover {
          border-color: var(--primary);
        }

        @media (max-width: 768px) {
          .topnav-left {
            display: block;
          }
          .welcome-text, .stream-badge {
            display: none;
          }
        }
      `}</style>
        </header>
    );
};
