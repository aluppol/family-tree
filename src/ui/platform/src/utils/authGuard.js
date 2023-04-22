// src/components/AuthGuard.js
import React from 'react';
import { Redirect } from 'react-router-dom';

const AuthGuard = ({ children }) => {
  const isAuthenticated = false; // Replace this with your authentication logic

  if (isAuthenticated) {
    return children;
  } else {
    return <Redirect to="/login" />;
  }
};

export default AuthGuard;
