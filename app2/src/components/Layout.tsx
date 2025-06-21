import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';
import { 
    FaTachometerAlt, FaUsers, FaTable, FaClock, 
    FaTrophy, FaUserTie, FaBullhorn, FaHistory, FaEye 
} from 'react-icons/fa';

interface NavLinkProps {
    to: string;
    icon: IconType;
    label: string;
}

const AppNavLink = ({ to, icon: Icon, label }: NavLinkProps) => {
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
      `flex items-center px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
        isActive ? 'bg-gray-700 text-white font-bold' : ''
      }`;
  
    return (
      <NavLink to={to} className={navLinkClasses}>
        <span className="mr-3">{React.createElement(Icon)}</span>
        <span>{label}</span>
      </NavLink>
    );
};


const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-800 text-white font-sans">
      <aside className="w-64 bg-gray-900 shadow-md flex flex-col">
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">T-Holdem</h1>
          <p className="text-sm text-gray-400">Tournament Control</p>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-2">
            <AppNavLink to="/" icon={FaTachometerAlt} label="Dashboard" />
            <AppNavLink to="/participants" icon={FaUsers} label="Participants" />
            <AppNavLink to="/tables" icon={FaTable} label="Tables" />
            <AppNavLink to="/blinds" icon={FaClock} label="Blinds" />
            <AppNavLink to="/prizes" icon={FaTrophy} label="Prizes" />
            <AppNavLink to="/staff" icon={FaUserTie} label="Staff" />
            <AppNavLink to="/announcements" icon={FaBullhorn} label="Announcements" />
            <AppNavLink to="/history" icon={FaHistory} label="History" />
            <AppNavLink to="/live/live-view-placeholder" icon={FaEye} label="Live View" />
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto bg-gray-800">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
