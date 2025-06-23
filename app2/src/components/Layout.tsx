import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';
import { 
    FaTachometerAlt, FaUsers, FaTable, FaClock, 
    FaTrophy, FaUserTie, FaBullhorn, FaHistory,
    FaChevronLeft, FaChevronRight, FaUserShield, FaUserPlus, FaFileInvoiceDollar, FaRandom
} from 'react-icons/fa';

interface NavItemProps {
    to: string;
    label: string;
    Icon: IconType;
    isOpen: boolean;
}

const NavItem = ({ to, label, Icon, isOpen }: NavItemProps) => {
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
      `flex items-center p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'} ${isOpen ? 'justify-start' : 'justify-center'}`;
  
    return (
      <NavLink to={to} className={navLinkClasses}>
        <span className="text-lg"><Icon /></span>
        <span className={`ml-3 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>{label}</span>
      </NavLink>
    );
};

export const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 font-sans">
      <aside className={`bg-white shadow-lg flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-gray-200 flex items-start justify-between">
          <div className={`overflow-hidden transition-all duration-200 ${isSidebarOpen ? 'w-full' : 'w-0'}`}>
            <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">T-Holdem</h1>
            <p className="text-sm text-gray-500 whitespace-nowrap">Tournament Control</p>
          </div>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-2">
            <NavItem to="/" label="Dashboard" Icon={FaTachometerAlt} isOpen={isSidebarOpen} />
            <NavItem to="/participants" label="Participants" Icon={FaUsers} isOpen={isSidebarOpen} />
            <NavItem to="/tables" label="Tables" Icon={FaTable} isOpen={isSidebarOpen} />
            <NavItem to="/blinds" label="Blinds" Icon={FaClock} isOpen={isSidebarOpen} />
            <NavItem to="/prizes" label="Prizes" Icon={FaTrophy} isOpen={isSidebarOpen} />
            <NavItem to="/announcements" label="Announcements" Icon={FaBullhorn} isOpen={isSidebarOpen} />
            <NavItem to="/history" label="History" Icon={FaHistory} isOpen={isSidebarOpen} />
            <NavItem to="/staff" label="Staff" Icon={FaUserShield} isOpen={isSidebarOpen} />
            <div className="pl-4 border-l-2 border-gray-200 ml-4 my-1 space-y-1">
              <NavItem to="/staff-recruit" label="Recruitment" Icon={FaUserPlus} isOpen={isSidebarOpen} />
              <NavItem to="/staff-assignment" label="Assignment" Icon={FaUserTie} isOpen={isSidebarOpen} />
              <NavItem to="/dealer-rotation" label="Rotation" Icon={FaRandom} isOpen={isSidebarOpen} />
              <NavItem to="/work-log" label="Clock In/Out" Icon={FaClock} isOpen={isSidebarOpen} />
              <NavItem to="/attendance-payroll" label="Payroll" Icon={FaFileInvoiceDollar} isOpen={isSidebarOpen} />
            </div>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
