// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';

const LoginPage = () => {
  const { setAuthToken, setRefreshToken } = useAuth();

  const [login, setLogin] = useState('');
  const [pass, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { from } = location.state || { from: { pathname: '/' }}

  const handleLogin = async (e) => {
    e.preventDefault();

    // Replace this with your actual authentication logic
    const { auth, refresh } = (await authUser(login, pass)) || {};

    if (auth && refresh) {
      setAuthToken(auth);
      setRefreshToken(refresh);
      navigate(from);
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="login-page">
      <h1>Login Page</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label>Login:</label>
          <input
            type="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;


const authUser = async (login, pass) => {
  return new Promise((res) => {
    setTimeout(() => {
        if (login === 'test' && pass === 'pass') {
          return res({ auth: 'auth_token', refresh: 'refresh_token' });
        }
        res(null);
    }, 1000);
  });
}