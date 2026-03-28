import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCases } from '../context/CaseContext';
import { ChevronDown, ChevronRight, Activity, MessageSquare, AlertTriangle, Check, X, Save, Edit2, ArrowLeft, Loader } from 'lucide-react';

const AccordionItem = ({ title, content, isEditable, onContentChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="accordion-item">
            <button className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
                <span className="font-bold">{title}</span>
                {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {isOpen && (
                <div className="accordion-content fade-in">
                    {isEditable ? (
                        <textarea
                            className="form-input ai-edit-textarea"
                            value={content || ''}
                            onChange={(e) => onContentChange(e.target.value)}
                            rows={4}
                        />
                    ) : (
                        <p>{content}</p>
                    )}
                </div>
            )}
            <style>{`
        .accordion-item {
          border-bottom: 1px solid var(--border-light);
        }
        .accordion-item:last-child {
          border-bottom: none;
        }
        .accordion-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--sp-2) var(--sp-3);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-main);
          transition: background var(--transition);
        }
        .accordion-header:hover {
          background: var(--bg);
        }
        .accordion-content {
          padding: 0 var(--sp-3) var(--sp-2) var(--sp-3);
          color: var(--text-muted);
          line-height: 1.6;
        }
        .ai-edit-textarea {
          font-family: inherit;
          resize: vertical;
        }
      `}</style>
        </div>
    );
};

const CaseReview = () => {
    const { id } = useParams();
    const { fetchSingleCase, verifyCase, fetchPendingCases } = useCases();
    const navigate = useNavigate();

    const [caseData, setCaseData] = useState(null);
    const [loadingParams, setLoadingParams] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [apiError, setApiError] = useState(null);

    // Form states
    const [confirmStream, setConfirmStream] = useState('');
    const [riskLevel, setRiskLevel] = useState('');
    const [doctorNotes, setDoctorNotes] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState({});
    const [isModified, setIsModified] = useState(false);

    const loadCase = useCallback(async () => {
        setLoadingParams(true);
        const data = await fetchSingleCase(id);
        if (data) {
            setCaseData(data);
            setConfirmStream(data.suggestedStream || '');
            setRiskLevel(data.riskLevel || '');
            let analysis = data.aiAnalysis ? { ...data.aiAnalysis } : {};
            if (analysis.english) analysis = analysis.english;
            setAiAnalysis(analysis);
        } else {
            setApiError("Case not found or failed to load");
        }
        setLoadingParams(false);
    }, [id, fetchSingleCase]);

    useEffect(() => {
        loadCase();
    }, [loadCase]);

    if (loadingParams) {
        return (
            <div className="flex-center justify-center p-6" style={{ height: '50vh', flexDirection: 'column', gap: '1rem' }}>
                <Loader className="animate-spin text-primary" size={48} />
                <p className="text-muted">Loading Case Details...</p>
            </div>
        );
    }

    if (apiError || !caseData) {
        return (
            <div className="p-4 flex-center justify-center" style={{ flexDirection: 'column' }}>
                <div className="badge badge-danger mb-3" style={{ fontSize: '1.2rem', padding: '16px' }}>
                    {apiError || 'Case load failed'}
                </div>
                <button className="btn btn-neutral" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Go Back</button>
            </div>
        );
    }

    const handleAnalysisChange = (key, value) => {
        setAiAnalysis(prev => ({ ...prev, [key]: value }));
        setIsModified(true);
    };

    const handleAction = async (status) => {
        setSubmitLoading(true);

        const ok = await verifyCase(
            caseData.id || caseData._id,
            status,
            doctorNotes,
            aiAnalysis,
            confirmStream,
            riskLevel
        );

        setSubmitLoading(false);

        if (ok) {
            fetchPendingCases(); // Refresh list behind the scenes
            if (status !== 'DRAFT') {
                navigate('/dashboard');
            } else {
                alert("Draft saved safely.");
            }
        } else {
            alert("Verification failed. Please try again.");
        }
    };

    const sectionLabels = {
        typesOfPain: 'Types of Pain',
        possibleDiseases: 'Possible Diseases',
        causes: 'Causes',
        riskLevel: 'Risk Level Analysis',
        homeRemedies: 'Home Remedies',
        foodGuidance: 'Food Guidance',
        medicineGuidance: 'Medicine Guidance',
        doctorConsultation: 'Doctor Consultation Guidelines',
        preventionTips: 'Prevention Tips',
        emergencyWarningSigns: 'Emergency Warning Signs'
    };

    return (
        <div className="case-review-container">
            <div className="review-header mb-3">
                <button className="btn btn-neutral btn-sm" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="review-title">
                    <h1 className="text-2xl font-bold">Case Review: {caseData.id || caseData._id}</h1>
                    <span className={`badge badge-${caseData.status === 'PENDING' ? 'warning' : 'success'}`}>
                        {caseData.status}
                    </span>
                </div>
            </div>

            <div className="grid">
                <div className="col-5">
                    <div className="card patient-data-card mb-4">
                        <h2 className="text-lg font-bold mb-3 border-bottom pb-2">Patient Input Data</h2>

                        <div className="data-grid">
                            <div className="data-item">
                                <span className="data-label">Patient Age</span>
                                <span className="data-value">{caseData.patientAge} years</span>
                            </div>
                            <div className="data-item">
                                <span className="data-label">Timestamp</span>
                                <span className="data-value">{caseData.timestamp ? new Date(caseData.timestamp).toLocaleString() : 'Unknown'}</span>
                            </div>
                            <div className="data-item full-width mt-2">
                                <span className="data-label">Pain Location</span>
                                <span className="data-value text-primary font-bold text-lg">{caseData.anatomicalRegion || caseData.meshName}</span>
                            </div>
                            <div className="data-item">
                                <span className="data-label">Duration</span>
                                <span className="data-value">{caseData.duration}</span>
                            </div>
                            <div className="data-item">
                                <span className="data-label">Risk Level</span>
                                <span className="data-value font-bold text-danger">{caseData.riskLevel}</span>
                            </div>
                            <div className="data-item">
                                <span className="data-label">Pain Type</span>
                                <span className="data-value">{caseData.painType}</span>
                            </div>
                            <div className="data-item full-width mt-2">
                                <span className="data-label">Notes</span>
                                <span className="data-value bg-light p-2 rounded">{caseData.notes}</span>
                            </div>
                            {caseData.imageUrl && (
                                <div className="data-item full-width mt-2">
                                    <span className="data-label flex-center gap-2">📸 Uploaded Image</span>
                                    <img 
                                        src={`/uploads/${caseData.imageUrl}`} 
                                        alt="Patient Pain Area" 
                                        style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-light)', marginTop: '8px', cursor: 'pointer' }} 
                                        onClick={() => window.open(`/uploads/${caseData.imageUrl}`, '_blank')}
                                    />
                                </div>
                            )}
                            {caseData.xrayUrl && (
                                <div className="data-item full-width mt-2">
                                    <span className="data-label flex-center gap-2">🩻 Patient X-Ray</span>
                                    <img 
                                        src={`/uploads/${caseData.xrayUrl}`} 
                                        alt="Patient X-Ray" 
                                        style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--primary)', marginTop: '8px', cursor: 'pointer' }} 
                                        onClick={() => window.open(`/uploads/${caseData.xrayUrl}`, '_blank')}
                                        title="Click to open full size"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-7">
                    <div className="card ai-analysis-card mb-4">
                        <div className="card-header border-bottom">
                            <h2 className="text-lg font-bold flex-center gap-2">
                                <Activity size={20} className="text-primary" />
                                AI Generated Analysis
                            </h2>
                            <span className="badge badge-primary">Editable</span>
                        </div>

                        <div className="accordion-container mt-2">
                            {Object.keys(aiAnalysis).length > 0 ? Object.keys(aiAnalysis).map(key => (
                                <AccordionItem
                                    key={key}
                                    title={sectionLabels[key] || key}
                                    content={aiAnalysis[key]}
                                    isEditable={true}
                                    onContentChange={(val) => handleAnalysisChange(key, val)}
                                />
                            )) : (
                                <p className="p-3 text-muted">No AI Analysis generated for this case.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* verification panel inline */}
            <div className="verification-panel">
                <div className="panel-container grid">
                    <div className="col-12 panel-header mb-2 flex-center" style={{ justifyContent: 'space-between' }}>
                        <h3 className="text-lg font-bold text-primary flex-center gap-2">
                            <Edit2 size={18} /> Doctor Verification Panel
                        </h3>
                        {submitLoading && <Loader size={18} className="animate-spin text-primary" />}
                    </div>

                    <div className="col-4">
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-white">Confirm Stream</label>
                            <select
                                className="form-input"
                                value={confirmStream}
                                onChange={(e) => setConfirmStream(e.target.value)}
                            >
                                <option value="Cardiology">Cardiology</option>
                                <option value="Neurology">Neurology</option>
                                <option value="Orthopedic">Orthopedic</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-4">
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-white">Risk Level</label>
                            <select
                                className="form-input"
                                value={riskLevel}
                                onChange={(e) => setRiskLevel(e.target.value)}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-12 mt-2">
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-white flex-center gap-1">
                                Doctor Notes
                            </label>
                            <textarea
                                className="form-input"
                                placeholder="Enter clinical notes, modifications, and reasoning..."
                                value={doctorNotes}
                                onChange={(e) => setDoctorNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="col-12 mt-2 action-buttons">
                        <button className="btn btn-neutral" onClick={() => handleAction('DRAFT')} disabled={submitLoading}>
                            <Save size={18} /> Save Draft
                        </button>
                        <button className="btn btn-danger" onClick={() => handleAction('REJECTED')} disabled={submitLoading}>
                            <X size={18} /> Reject
                        </button>
                        <button className="btn btn-primary" onClick={() => handleAction('MODIFIED_VERIFIED')} disabled={submitLoading}>
                            <Activity size={18} /> Modify & Approve
                        </button>
                        <button className="btn btn-success" onClick={() => handleAction('APPROVE')} disabled={submitLoading}>
                            <Check size={18} /> Approve
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        .case-review-container {
          position: relative;
          min-height: calc(100vh - 64px - var(--sp-4) * 2);
        }

        .review-header {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }

        .review-title {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }

        .data-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-2);
        }

        .data-item {
          display: flex;
          flex-direction: column;
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

        .data-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 4px;
        }

        .data-value {
          font-size: 1rem;
          color: var(--text-main);
        }

        .full-width {
          grid-column: span 2;
        }

        .bg-light { background: var(--bg); }
        .p-2 { padding: var(--sp-2); }
        .rounded { border-radius: var(--base-radius); }
        .gap-1 { gap: var(--sp-1); }
        .gap-2 { gap: var(--sp-2); }

        .accordion-container {
          margin: 0 -var(--sp-3);
        }

        /* Verification Panel Inline */
        .verification-panel {
          background: #1C2833;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          padding: var(--sp-4);
          border-radius: var(--radius);
          color: white;
          margin-top: var(--sp-2);
          margin-bottom: var(--sp-2);
        }

        .panel-container {
          width: 100%;
        }

        .text-white { color: white !important; }

        .verification-panel .form-input {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.2);
          color: white;
        }

        .verification-panel .form-input:focus {
          border-color: var(--primary);
          background: rgba(255,255,255,0.1);
        }

        .verification-panel option {
          background: #1C2833;
          color: white;
        }

        .action-buttons {
          display: flex;
          gap: var(--sp-2);
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .mb-0 { margin-bottom: 0; }
        
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .data-grid { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
        }

        @media (max-width: 768px) {
          .verification-panel {
            padding: var(--sp-3);
          }
          
          .grid .col-5, .grid .col-7, 
          .grid .col-4 {
            grid-column: span 12;
          }

          .action-buttons {
            justify-content: stretch;
          }
          .action-buttons .btn {
            flex: 1;
            min-width: calc(50% - var(--sp-2));
            padding: 12px;
          }
        }
      `}</style>
        </div>
    );
};

export default CaseReview;
