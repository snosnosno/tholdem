import { useToastContext, Toast } from '../contexts/ToastContext';

export const useToast = () => {
  const { addToast, removeToast, clearAllToasts } = useToastContext();

  // Convenience methods for different toast types
  const showSuccess = (message: string, title?: string, duration?: number) => {
    addToast({
      type: 'success',
      message,
      title,
      duration,
    });
  };

  const showError = (message: string, title?: string, duration?: number) => {
    addToast({
      type: 'error',
      message,
      title,
      duration: duration || 5000, // Error messages stay longer by default
    });
  };

  const showInfo = (message: string, title?: string, duration?: number) => {
    addToast({
      type: 'info',
      message,
      title,
      duration,
    });
  };

  const showWarning = (message: string, title?: string, duration?: number) => {
    addToast({
      type: 'warning',
      message,
      title,
      duration,
    });
  };

  // Generic method for custom toasts
  const show = (toast: Omit<Toast, 'id'>) => {
    addToast(toast);
  };

  return {
    show,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeToast,
    clearAllToasts,
  };
};