import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import './Nav.sass';
import { URLS } from '../../urls';

const NavComponent = ({ showMobileMenu, setShowMobileMenu }) => {
  const { clearTokens } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    clearTokens();
    navigate(URLS.login);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };


  return (
    <div>
      {/* Desktop Nav */}
      <nav className="nav desktop-nav">
        <Link to={URLS.home} className={`nav__link ${location.pathname === URLS.home ? 'nav__link--active' : ''}`}>Home</Link>
        <Link to={URLS.people} className={`nav__link ${location.pathname.includes(URLS.people) ? 'nav__link--active' : ''}`}>People</Link>
        <div className="nav__link nav__settings">
          <span className={`${location.pathname.includes(URLS.settings) ? 'nav__settings-dropdown__link--active' : ''}`}>Settings</span>
          <ul className="nav__settings-dropdown">
            <li>
              <Link to={URLS.profile} className={`nav__settings-dropdown__link ${location.pathname.includes(URLS.profile) ? 'nav__settings-dropdown__link--active' : ''}`}>Profile</Link>
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
            <Link to={URLS.home} className={`nav__link ${location.pathname === URLS.home ? 'nav__link--active' : ''}`}>Home</Link>
            {/* <Link to={URLS.people} className={`nav__link ${location.pathname === URLS.people ? 'nav__link--active' : ''}`}>People</Link> */}
            <div className="nav__link nav__settings">
              <span className={`${location.pathname.includes(URLS.settings) ? 'nav__settings-dropdown__link--active' : ''}`}>Settings</span>
              <ul className="nav__settings-dropdown">
                <li>
                  <Link to={URLS.profile} className={`nav__link nav__settings-dropdown__link ${location.pathname.includes(URLS.profile) ? 'nav__settings-dropdown__link--active' : ''}`}>Profile</Link>
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