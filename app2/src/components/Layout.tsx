import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';
import { 
    FaTachometerAlt, FaUsers, FaTable, FaClock, 
    FaTrophy, FaUserTie, FaBullhorn, FaHistory, FaUserCircle, FaUserShield, FaFileInvoice, FaClipboardList, FaQrcode,
    FaChevronLeft, FaChevronRight, FaCalendarAlt
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

  // TODO: Add role-based access control for menu items
  // const { isAdmin } = useAuth(); 

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
            <NavItem to="/jobs" label="Job Board" Icon={FaClipboardList} isOpen={isSidebarOpen} />
            <NavItem to="/profile" label="My Profile" Icon={FaUserCircle} isOpen={isSidebarOpen} />
            <NavItem to="/available-times" label="My Availability" Icon={FaCalendarAlt} isOpen={isSidebarOpen} />
            <NavItem to="/attendance" label="Attendance" Icon={FaQrcode} isOpen={isSidebarOpen} />
            <hr className="my-2 border-t border-gray-200" />
            
            {/* Admin Menu */}
            <div className="px-2 pt-2">
                <p className={`text-xs font-semibold text-gray-500 uppercase transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Admin</p>
            </div>
            <NavItem to="/staff-management" label="Staff Management" Icon={FaUserShield} isOpen={isSidebarOpen} />
            <NavItem to="/job-postings" label="Manage Postings" Icon={FaFileInvoice} isOpen={isSidebarOpen} />
            <NavItem to="/participants" label="Participants" Icon={FaUsers} isOpen={isSidebarOpen} />
            <NavItem to="/tables" label="Tables" Icon={FaTable} isOpen={isSidebarOpen} />
            <NavItem to="/blinds" label="Blinds" Icon={FaClock} isOpen={isSidebarOpen} />
            <NavItem to="/prizes" label="Prizes" Icon={FaTrophy} isOpen={isSidebarOpen} />
            <NavItem to="/announcements" label="Announcements" Icon={FaBullhorn} isOpen={isSidebarOpen} />
            <NavItem to="/history" label="History" Icon={FaHistory} isOpen={isSidebarOpen} />
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
