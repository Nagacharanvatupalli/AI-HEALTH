import React, { useEffect } from 'react';
import { useCases } from '../context/CaseContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clock, ChevronRight, Activity, Loader } from 'lucide-react';

const PendingCases = () => {
  const { cases, loading, error, fetchPendingCases } = useCases();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingCases();
    const intervalId = setInterval(fetchPendingCases, 5000);
    return () => clearInterval(intervalId);
  }, [fetchPendingCases]);

  const getRiskBadgeClass = (level) => {
    if (!level) return 'badge-primary';
    switch (level.toLowerCase()) {
      case 'critical': return 'badge-danger';
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-success';
      default: return 'badge-primary';
    }
  };

  const getSeverityColor = (severity) => {
    if (!severity) return 'var(--primary)';
    switch (severity.toLowerCase()) {
      case 'critical': return 'var(--danger)';
      case 'severe': return 'var(--danger)';
      case 'moderate': return 'var(--warning)';
      case 'mild': return 'var(--success)';
      default: return 'var(--primary)';
    }
  };

  if (loading) {
    return (
      <div className="flex-center justify-center p-6" style={{ height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin text-primary" size={48} />
        <p className="text-muted">Fetching cases in {user?.streamId} stream...</p>
      </div>
    );
  }

  return (
    <div className="pending-cases-container fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="text-2xl font-bold">Pending Cases</h1>
          <p className="text-muted">Review and verify AI-generated pain analyses.</p>
        </div>

        {user?.streamId && cases.length > 0 && (
          <div className="badge badge-primary">Filtered for {user.streamId} stream</div>
        )}
      </div>

      {error && (
        <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid">
        {cases.map(c => (
          <div className="col-4 case-card-col" key={c.id || c._id}>
            <div className="card case-card">
              <div className="case-card-header">
                <div>
                  <div className="case-id text-primary font-bold">{c.id || c._id}</div>
                  <div className="case-time text-sm text-muted">
                    <Clock size={14} className="inline-icon" />
                    {new Date(c.timestamp).toLocaleString()}
                  </div>
                </div>
                <span className={`badge ${getRiskBadgeClass(c.riskLevel)}`}>
                  {c.riskLevel} Risk
                </span>
              </div>

              <div className="case-card-body">
                <div className="pain-location">
                  Pain Location: <span className="font-bold">{c.anatomicalRegion || c.meshName}</span>
                </div>

                <div className="severity-indicator" style={{ borderLeftColor: getSeverityColor(c.riskLevel) }}>
                  <div className="text-sm">Risk: <span className="font-bold" style={{ color: getSeverityColor(c.riskLevel) }}>{c.riskLevel}</span></div>
                  <div className="text-sm text-muted">{c.painType} pain for {c.duration}</div>
                </div>

                <div className="symptoms-preview text-sm">
                  <strong>Notes:</strong> {c.notes?.length > 40 ? c.notes.substring(0, 40) + '...' : c.notes}
                </div>

                <div className="stream-badge-row mt-3">
                  <Activity size={16} className="text-muted" />
                  <span className="text-sm text-muted">AI Suggestion:</span>
                  <span className="badge badge-primary">{c.suggestedStream}</span>
                </div>
              </div>

              <div className="case-card-footer mt-3 pt-3 border-top">
                <button
                  className="btn btn-primary w-100 review-btn"
                  onClick={() => navigate(`/case/${c.id || c._id}`)}
                >
                  Review Case <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {cases.length === 0 && !error && (
          <div className="col-12 text-center empty-state">
            <AlertCircle size={48} className="text-muted mb-2 mx-auto block" style={{ margin: '0 auto' }} />
            <h3 className="text-lg font-bold">No Pending Cases</h3>
            <p className="text-muted">You're all caught up for the {user?.streamId} stream.</p>
          </div>
        )}
      </div>

      <style>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--sp-2);
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

        .case-card-col {
          display: flex;
        }

        .case-card {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .case-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--sp-2);
        }

        .inline-icon {
          vertical-align: text-bottom;
          margin-right: 4px;
        }

        .case-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }

        .severity-indicator {
          padding-left: var(--sp-2);
          border-left: 3px solid var(--primary);
          background: var(--bg);
          padding-top: 8px;
          padding-bottom: 8px;
          padding-right: 8px;
          border-radius: 0 var(--base-radius) var(--base-radius) 0;
        }

        .stream-badge-row {
          display: flex;
          align-items: center;
          gap: var(--sp-1);
        }

        .border-top {
          border-top: 1px solid var(--border-light);
        }

        .w-100 {
          width: 100%;
        }

        .review-btn {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .empty-state {
          padding: var(--sp-6) var(--sp-3);
          background: var(--surface);
          border-radius: var(--radius);
          border: 1px dashed var(--border);
        }

        .block {
          display: block;
        }
        
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 900px) {
          .case-card-col.col-4 {
            grid-column: span 6;
          }
        }
        
        @media (max-width: 600px) {
          .case-card-col.col-4 {
            grid-column: span 12;
          }
        }
      `}</style>
    </div>
  );
};

export default PendingCases;
