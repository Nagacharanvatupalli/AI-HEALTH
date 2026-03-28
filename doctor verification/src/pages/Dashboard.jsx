import React, { useEffect } from 'react';
import { useCases } from '../context/CaseContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Edit3, ArrowRight, Loader } from 'lucide-react';

const Dashboard = () => {
  const { dashboardStats, loading, error, fetchDashboardStats } = useCases();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
    const intervalId = setInterval(fetchDashboardStats, 5000);
    return () => clearInterval(intervalId);
  }, [fetchDashboardStats]);

  const { pendingCount, verifiedCount, modifiedCount, recentActivity = [] } = dashboardStats;

  if (loading) {
    return (
      <div className="flex-center justify-center p-6" style={{ height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin text-primary" size={48} />
        <p className="text-muted">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted">Overview of your verification workload.</p>
        {error && <div className="badge badge-danger mt-2">{error}</div>}
      </div>

      <div className="grid mb-4">
        <div className="col-4 card stat-card stat-primary">
          <div className="stat-icon-wrapper primary-bg">
            <Clock size={24} className="text-primary" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{pendingCount || 0}</div>
            <div className="stat-label">Total Pending Cases</div>
          </div>
        </div>

        <div className="col-4 card stat-card stat-success">
          <div className="stat-icon-wrapper success-bg">
            <CheckCircle size={24} className="text-success" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{verifiedCount || 0}</div>
            <div className="stat-label">Verified Today</div>
          </div>
        </div>

        <div className="col-4 card stat-card stat-warning">
          <div className="stat-icon-wrapper warning-bg">
            <Edit3 size={24} className="text-warning" />
          </div>
          <div className="stat-content">
            <div className="stat-number">{modifiedCount || 0}</div>
            <div className="stat-label">Modified Cases</div>
          </div>
        </div>
      </div>

      <div className="card activity-card">
        <div className="card-header border-bottom">
          <h2 className="text-lg font-bold">Recent Activity</h2>
          <button className="btn btn-neutral btn-sm" onClick={() => navigate('/pending-cases')}>
            View All Pending <ArrowRight size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Patient</th>
                <th>Pain Location</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(c => (
                <tr key={c.id || c._id}>
                  <td className="font-bold text-primary">{c.id || c._id}</td>
                  <td>{c.patientName || 'Anonymous'}<br /><span className="text-muted text-sm">Age {c.patientAge || 'N/A'}</span></td>
                  <td>{c.anatomicalRegion || c.meshName}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'PENDING' ? 'warning' : 'success'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/case/${c.id || c._id}`)}
                    >
                      {c.status === 'PENDING' ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .stat-card {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          border-left: 4px solid transparent;
        }

        .stat-primary { border-left-color: var(--primary); }
        .stat-success { border-left-color: var(--success); }
        .stat-warning { border-left-color: var(--warning); }

        .stat-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .flex-center {
          display: flex;
          align-items: center;
        }

        .justify-center {
          justify-content: center;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .primary-bg { background: rgba(30, 136, 229, 0.1); }
        .success-bg { background: rgba(67, 160, 71, 0.1); }
        .warning-bg { background: rgba(251, 140, 0, 0.1); }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: var(--sp-3);
          margin-bottom: var(--sp-2);
        }
        
        .border-bottom {
          border-bottom: 1px solid var(--border-light);
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.875rem;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .activity-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .activity-table th {
          padding: var(--sp-2);
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 600;
          border-bottom: 2px solid var(--border-light);
        }

        .activity-table td {
          padding: var(--sp-2);
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }

        .activity-table tr:last-child td {
          border-bottom: none;
        }
        
        .activity-table tr {
          transition: background-color var(--transition);
        }
        
        .activity-table tbody tr:hover {
          background-color: var(--bg);
        }

        @media (max-width: 768px) {
          .stat-card {
            margin-bottom: var(--sp-3);
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
