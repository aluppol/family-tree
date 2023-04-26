import React, { useState } from 'react';
import Menu from '../Menu/Menu';
import './Header.scss';

const Header = () => {
  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);

  const toggleBurgerMenu = () => {
    setIsBurgerMenuOpen(!isBurgerMenuOpen);
  };

  return (
    <header className="header">
      <h1>Family Tree</h1>
      <button className="burger-menu-btn" onClick={toggleBurgerMenu}>
        <span className="burger-menu-icon"></span>
      </button>
      <Menu isOpen={isBurgerMenuOpen} />
    </header>
  );
};

export default Header;
