import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import './Nav.sass';

const NavComponent = ({ showMobileMenu, setShowMobileMenu }) => {
  const { clearTokens } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    clearTokens();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };


  return (
    <div>
      {/* Desktop Nav */}
      <nav className="nav desktop-nav">
        <Link to="/" className={`nav__link ${location.pathname === '/' ? 'nav__link--active' : ''}`}>Home</Link>
        <Link to="/people" className={`nav__link ${location.pathname === '/people' ? 'nav__link--active' : ''}`}>People</Link>
        <div className="nav__link nav__settings">
          <span>Settings</span>
          <ul className="nav__settings-dropdown">
            <li>
              <Link to="/profile" className={`nav__settings-dropdown__link ${location.pathname === '/profile' ? 'nav__settings-dropdown__link--active' : ''}`}>Profile</Link>
            </li>
            <li>
              <button onClick={logout} className="nav__settings-dropdown__link nav__settings-dropdown__link--logout">Logout</button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className={`nav mobile-nav ${showMobileMenu ? 'nav--open mobile-nav--open' : ''}`}>
        {showMobileMenu && (
          <>
            <Link to="/" className={`nav__link ${location.pathname === '/' ? 'nav__link--active' : ''}`}>Home</Link>
            {/* <Link to="/people" className={`nav__link ${location.pathname === '/people' ? 'nav__link--active' : ''}`}>People</Link> */}
            <div className="nav__link nav__settings">
              <span>Settings</span>
              <ul className="nav__settings-dropdown">
                <li>
                  <Link to="/profile" className={`nav__link nav__settings-dropdown__link ${location.pathname === '/profile' ? 'nav__settings-dropdown__link--active' : ''}`}>Profile</Link>
                </li>
                <li>
                  <button onClick={logout} className="nav__settings-dropdown__link nav__settings-dropdown__link--logout">Logout</button>
                </li>
              </ul>
            </div>
          </>
        )}
      </nav>

      <button className="burger-menu" onClick={toggleMobileMenu}>
        {showMobileMenu ? <FaTimes /> : <FaBars />}
      </button>
    </div>
  );
};

export default NavComponent;