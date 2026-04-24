import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('taskflow_token');
    const savedUser = localStorage.getItem('taskflow_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      authAPI.getProfile()
        .then(res => {
          setUser(res.data.user);
          setOrganization(res.data.organization);
          localStorage.setItem('taskflow_user', JSON.stringify(res.data.user));
        })
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await authAPI.login({ email, password });
      const { accessToken, refreshToken, user: userData, organization: orgData } = res.data;
      localStorage.setItem('taskflow_token', accessToken);
      localStorage.setItem('taskflow_refresh', refreshToken);
      localStorage.setItem('taskflow_user', JSON.stringify(userData));
      setUser(userData);
      setOrganization(orgData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signup = async (name, email, password, organizationName) => {
    try {
      setError(null);
      const res = await authAPI.signup({ name, email, password, organizationName });
      const { accessToken, refreshToken, user: userData, organization: orgData } = res.data;
      localStorage.setItem('taskflow_token', accessToken);
      localStorage.setItem('taskflow_refresh', refreshToken);
      localStorage.setItem('taskflow_user', JSON.stringify(userData));
      setUser(userData);
      setOrganization(orgData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_refresh');
    localStorage.removeItem('taskflow_user');
    setUser(null);
    setOrganization(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, loading, error, login, signup, logout, setUser, setOrganization }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
