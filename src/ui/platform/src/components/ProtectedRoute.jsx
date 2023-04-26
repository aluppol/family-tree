import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";

const ProtectedRoute = () => {
  const { authToken, setAuthToken, clearTokens, refreshToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Make an HTTPS request to validate the token
        // Replace this with your actual API call
        const isValid = await validateTokenWithServer(authToken);
        if (isValid) {
          setIsLoading(false);
        } else {
          // Try refreshing the token using the refresh token
          const newToken = await getAuthToken(refreshToken);

          if (newToken) { // check if token valid
            setAuthToken(newToken);
            setIsLoading(false);
          } else {
            clearTokens();
            navigate('/login', { state: { from: location }, replace: true });
          }
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setIsLoading(false);
      }
    };

    validateToken();
  }, [authToken, refreshToken, setAuthToken, clearTokens, navigate, location]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <Outlet />;
};

export default ProtectedRoute;

const validateTokenWithServer = async (token) => {
  return new Promise((res) => {
    setTimeout(() => {
        if (token === 'auth_token' || token === 'new_auth_token') {
          return res(true);
        }
        res(false);
    }, 1000);
  });
};

// Dummy function to simulate token refreshing
// Replace this with your actual API call
const getAuthToken = async (token) => {
  new Promise((res) => {
    setTimeout(() => {
        if (token === 'refresh_token') {
          return res('new_auth_token');
        }
        res(null);
    }, 1000);
  })
};
