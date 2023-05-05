import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import './PlatformLayout.sass';
import NavComponent from '../../components/Nav/Nav';

const PlatformLayoutPage = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  return (
    <div className="platform-layout-page">
      <header className="header">
        <h1 className="app-title">Family Tree</h1>
        <NavComponent showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};

export default PlatformLayoutPage;