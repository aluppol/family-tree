import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();
const authTokenLocalStorageKey = 'family_tree_app_auth_token_key';
const refreshTokenLocalStorageKey = 'family_tree_app_refresh_token_key';


export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [authToken, _setAuthToken] = useState(localStorage.getItem(authTokenLocalStorageKey));
  const [refreshToken, _setRefreshToken] = useState(localStorage.getItem(refreshTokenLocalStorageKey));

  const setAuthToken = (token) => {
    _setAuthToken(token);
    localStorage.setItem(authTokenLocalStorageKey, token);
  };

  const setRefreshToken = (token) => {
    _setRefreshToken(token);
    localStorage.setItem(refreshTokenLocalStorageKey, token);
  };

  const clearTokens = () => {
    _setAuthToken(null);
    _setRefreshToken(null);
    localStorage.removeItem(authTokenLocalStorageKey);
    localStorage.removeItem(refreshTokenLocalStorageKey);
  };

  return (
    <AuthContext.Provider value={{ authToken, refreshToken, setAuthToken, clearTokens, setRefreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};