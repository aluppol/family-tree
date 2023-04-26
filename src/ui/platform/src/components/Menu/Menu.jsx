import React from 'react';
import { NavLink } from 'react-router-dom';
import './Menu.scss';
import LogoutButton from '../LogoutBtn/LogoutBtn';

const Menu = ({ isOpen }) => {
  return (
    <nav className={`menu ${isOpen ? 'open' : 'closed'}`}>
      <ul>
        <li>
          <NavLink exact to="/" activeClassName="active">
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/search" activeClassName="active">
            Search
          </NavLink>
        </li>
        <li>
          <NavLink to="/person" activeClassName="active">
            Person
          </NavLink>
          <ul>
            <li>
              <NavLink to="/person/values" activeClassName="active">
                Values
              </NavLink>
            </li>
            <li>
              <NavLink to="/person/ideas" activeClassName="active">
                Ideas
              </NavLink>
            </li>
            <li>
              <NavLink to="/person/facts" activeClassName="active">
                Facts
              </NavLink>
            </li>
            <li>
              <NavLink to="/person/reasons" activeClassName="active">
                Reasons
              </NavLink>
            </li>
            <li>
            <NavLink to="/person/journal" activeClassName="active">
                Journal
              </NavLink>
            </li>
          </ul>
        </li>
        <li>
          <NavLink to="/settings" activeClassName="active">
            Settings
          </NavLink>
          <ul>
            <li>
              <NavLink to="/settings/profile" activeClassName="active">
                Profile
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings/appearance" activeClassName="active">
                Appearance
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings/security" activeClassName="active">
                Security
              </NavLink>
            </li>
            <li>
              <LogoutButton />
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  );
};

export default Menu;

