// src/routes.js
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
const HomePage = lazy(() => import('./pages/Home/Home'));
const LoginPage = lazy(() => import('./pages/Login/Login'));
const RegisterPage = lazy(() => import('./pages/Register/Register'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const PersonPage = lazy(() => import('./pages/Person/Person'));
const PlatformLayoutPage = lazy(() => import('./pages/PlatformLayout/PlatformLayout'));
const PeoplePage = lazy(() => import('./pages/People/People.tsx'));

const Urls = () => {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/register' element={<RegisterPage />} />
      <Route path='/' element={<ProtectedRoute />}>
        <Route path='/' element={<PlatformLayoutPage />}>
          <Route index element={<HomePage />} />
          <Route path='/people' element={<PeoplePage />} />
          <Route path='/people/person/:id/*' element={<PersonPage />} />
        </Route>
      </Route>
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default Urls;
