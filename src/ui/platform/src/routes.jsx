// src/routes.js
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PersonPage from './pages/PersonPage';
import SettingsPage from './pages/SettingsPage';
import AuthGuard from './components/AuthGuard';

const Routes = () => {
  return (
    <Router>
      <Switch>
      <Route path="/login" component={LoginPage} />
      <AuthGuard>
            <Route exact path="/" component={HomePage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/person" component={PersonPage} />
            <Route path="/settings" component={SettingsPage} />
        </AuthGuard>
      </Switch>
    </Router>
  );
};

export default Routes;
