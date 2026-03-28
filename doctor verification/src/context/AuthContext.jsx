import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { doctorId, name, streamId, token }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token on mount
    const storedToken = localStorage.getItem('doctorToken');
    const storedName = localStorage.getItem('doctorName');
    const storedStream = localStorage.getItem('doctorStream');
    const storedId = localStorage.getItem('doctorId');

    if (storedToken && storedName && storedStream) {
      setUser({
        token: storedToken,
        name: storedName,
        streamId: storedStream,
        doctorId: storedId
      });
    }
    setLoading(false);
  }, []);

  const login = async (doctorId, password, doctorName) => {
    try {
      // Send the doctorId instead of streamId to match backend MongoDB logic
      const response = await fetch('/api/doctor-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, password })
      });

      if (!response.ok) {
        throw new Error('Login failed. Please check credentials.');
      }

      const data = await response.json();
      // Expecting: { doctorId, doctorName, stream, token }

      const sessionUser = {
        doctorId: data.doctorId,
        name: data.doctorName || doctorName,
        streamId: data.stream || '',
        token: data.token
      };

      localStorage.setItem('doctorToken', sessionUser.token);
      localStorage.setItem('doctorName', sessionUser.name);
      localStorage.setItem('doctorStream', sessionUser.streamId);
      if (sessionUser.doctorId) localStorage.setItem('doctorId', sessionUser.doctorId);

      setUser(sessionUser);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctorName');
    localStorage.removeItem('doctorStream');
    localStorage.removeItem('doctorId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
