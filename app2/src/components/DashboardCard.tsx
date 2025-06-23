import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-md ${className}`}>
      <h2 className="text-xl font-semibold text-gray-700 mb-4">{title}</h2>
      <div>{children}</div>
    </div>
  );
};
