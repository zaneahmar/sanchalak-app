import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToaster } from '../context/ToasterContext';

/**
 * Component to handle token expiration events and redirect to login
 * This component should be placed inside the Router so it can use useNavigate
 */
function TokenExpirationHandler() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toaster = useToaster();

  useEffect(() => {
    const handleTokenExpired = async (event) => {
      const message = event.detail?.message || 'Your Session is Expired Kindly Re-Login';
      
      // Show the error message
      toaster.error(message);
      
      // Logout the user
      await logout();
      
      // Redirect to login page
      navigate('/login', { replace: true });
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [navigate, logout, toaster]);

  return null; // This component doesn't render anything
}

export default TokenExpirationHandler;
