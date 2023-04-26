import React from 'react';
import { useHistory } from 'react-router-dom';

const LogoutButton = () => {
  const history = useHistory();

  const handleLogout = () => {
    // Clear tokens (replace 'auth-token' with the key you use to store the token)
    localStorage.removeItem('auth-token');

    // Redirect to the login page
    history.push('/login');
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
};

export default LogoutButton;
