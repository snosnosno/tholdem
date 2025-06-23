import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-bold mb-4 text-gray-700">{title}</h2>
      <div className="text-gray-600">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;
