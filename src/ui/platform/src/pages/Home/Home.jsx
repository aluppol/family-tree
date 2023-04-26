import React from 'react';
import './Home.sass';
import { useAuth } from '../../components/AuthContext';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const { clearTokens } = useAuth();
  const navigate = useNavigate();
  const logout = () => {
    clearTokens();
    navigate('/login');
  }
  return (
    <div className="home-page">
      <h1>Welcome to the Family Tree</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default HomePage;
