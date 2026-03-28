import React, { createContext, useState, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CaseContext = createContext();

export const CaseProvider = ({ children }) => {
  const [cases, setCases] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    pendingCount: 0,
    verifiedCount: 0,
    modifiedCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();

  const BASE_URL = '/api';

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user?.token}`
    };
  };

  const handleError = (res) => {
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error("Session expired. Please login again.");
    }
  };

  const fetchPendingCases = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const streamParam = encodeURIComponent(user.streamId || '');
      const response = await fetch(`${BASE_URL}/cases?status=PENDING&stream=${streamParam}`, {
        headers: getHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        return; // Stop processing — user will be redirected to login
      }

      const data = await response.json();
      setCases(data);
    } catch (err) {
      console.error("Failed to fetch pending cases:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDashboardStats = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const streamParam = encodeURIComponent(user.streamId || '');
      const response = await fetch(`${BASE_URL}/dashboard-stats?stream=${streamParam}`, {
        headers: getHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        return; // Stop processing — user will be redirected to login
      }

      const data = await response.json();
      setDashboardStats({
        pendingCount: data.totalPending || 0,
        verifiedCount: data.verifiedToday || 0,
        modifiedCount: data.modifiedCases || 0,
        recentActivity: data.recentActivity || []
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSingleCase = async (caseId) => {
    if (!user?.token) return null;
    try {
      const response = await fetch(`${BASE_URL}/case/${caseId}`, {
        headers: getHeaders()
      });
      handleError(response);
      return await response.json();
    } catch (err) {
      console.error(`Failed to fetch case ${caseId}:`, err);
      setError(err.message);
      return null;
    }
  };

  const verifyCase = async (caseId, status, doctorNotes, updatedAnalysis, updatedStream, updatedRiskLevel) => {
    if (!user?.token) return false;
    try {
      const payload = {
        caseId,
        status,
        updatedAnalysis,
        updatedStream,
        updatedRiskLevel,
        doctorNotes
      };

      const response = await fetch(`${BASE_URL}/verify-case`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      handleError(response);
      return response.ok;
    } catch (err) {
      console.error("Verification failed:", err);
      setError(err.message);
      return false;
    }
  };

  return (
    <CaseContext.Provider value={{
      cases,
      dashboardStats,
      loading,
      error,
      fetchPendingCases,
      fetchDashboardStats,
      fetchSingleCase,
      verifyCase
    }}>
      {children}
    </CaseContext.Provider>
  );
};

export const useCases = () => useContext(CaseContext);
