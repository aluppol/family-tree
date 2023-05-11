// src/routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/Home/Home';
import LoginPage from './pages/Login/Login';
import RegisterPage from './pages/Register/Register';
import ProtectedRoute from './components/ProtectedRoute';
import PersonPage from './pages/Person/Person';
import PlatformLayoutPage from './pages/PlatformLayout/PlatformLayout';

const Urls = () => {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/register' element={<RegisterPage />} />
      <Route path='/' element={<ProtectedRoute />}>
        <Route path='/' element={<PlatformLayoutPage />}>
          <Route index element={<HomePage />} />
          <Route path='/people' element={<PersonPage />} />
          <Route path='/person/:id' element={<PersonPage />} />
        </Route>
      </Route>
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default Urls;
