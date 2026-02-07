import React from 'react';
import { FiX, FiAlertCircle, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { useToaster } from '../context/ToasterContext';
import './Toaster.css';

const Toaster = () => {
  const { toasts, removeToast } = useToaster();

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <FiAlertCircle className="toast-icon" />;
      case 'success':
        return <FiCheckCircle className="toast-icon" />;
      case 'warning':
        return <FiAlertTriangle className="toast-icon" />;
      case 'info':
      default:
        return <FiInfo className="toast-icon" />;
    }
  };

  return (
    <div className="toaster-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            {getIcon(toast.type)}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
          >
            <FiX />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
