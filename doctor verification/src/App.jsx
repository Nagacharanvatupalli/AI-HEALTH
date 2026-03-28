import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PendingCases from './pages/PendingCases';
import CaseReview from './pages/CaseReview';

function App() {
  return (
    <AuthProvider>
      <CaseProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pending-cases" element={<PendingCases />} />
              <Route path="reviewed-cases" element={<div className="fade-in"><h2>Reviewed Cases</h2></div>} />
              <Route path="case/:id" element={<CaseReview />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CaseProvider>
    </AuthProvider>
  );
}

export default App;
