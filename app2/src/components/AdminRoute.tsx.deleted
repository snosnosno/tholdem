import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const AdminRoute: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <div className="p-6 text-center">{t('loading')}</div>;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/events" replace />;
};

export default AdminRoute;
