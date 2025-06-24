import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom'; // Import useNavigate
import { IconType } from 'react-icons';
import { 
    FaTachometerAlt, FaUsers, FaTable, FaClock, 
    FaTrophy, FaUserTie, FaBullhorn, FaHistory, FaUserCircle, FaUserShield, FaFileInvoice, FaClipboardList, FaQrcode,
    FaChevronLeft, FaChevronRight, FaCalendarAlt, FaClipboardCheck, FaSignOutAlt // Import logout icon
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext'; 

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
  const { isAdmin, currentUser, signOut } = useAuth(); // Get currentUser and signOut
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Failed to log out', error);
      // Optionally show an error message to the user
    }
  };

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
        
        {/* Navigation Menu */}
        <nav className="mt-5 flex-1 px-2 space-y-2">
            {/* ... (existing NavItem components) ... */}
            <NavItem to={isAdmin ? "/admin/dashboard" : "/events"} label="Dashboard" Icon={FaTachometerAlt} isOpen={isSidebarOpen} />
            <NavItem to="/jobs" label="Job Board" Icon={FaClipboardList} isOpen={isSidebarOpen} />
            <NavItem to="/profile" label="My Profile" Icon={FaUserCircle} isOpen={isSidebarOpen} />
            {!isAdmin && <NavItem to="/available-times" label="My Availability" Icon={FaCalendarAlt} isOpen={isSidebarOpen} />}
            {!isAdmin && <NavItem to="/attendance" label="Attendance" Icon={FaQrcode} isOpen={isSidebarOpen} />}
            <hr className="my-2 border-t border-gray-200" />
            
            {isAdmin && (
              <>
                {/* ... (existing admin NavItem components) ... */}
                <NavItem to="/admin/staffing-dashboard" label="Staffing Dashboard" Icon={FaClipboardCheck} isOpen={isSidebarOpen} />
                <NavItem to="/admin/staff" label="Staff Management" Icon={FaUserShield} isOpen={isSidebarOpen} />
                <NavItem to="/admin/job-postings" label="Manage Postings" Icon={FaFileInvoice} isOpen={isSidebarOpen} />
                <NavItem to="/admin/events" label="Manage Events" Icon={FaCalendarAlt} isOpen={isSidebarOpen} />
                <NavItem to="/admin/payroll" label="Process Payroll" Icon={FaFileInvoice} isOpen={isSidebarOpen} />
                <hr className="my-2 border-t border-gray-200" />
                <NavItem to="/participants" label="Participants" Icon={FaUsers} isOpen={isSidebarOpen} />
                <NavItem to="/tables" label="Tables" Icon={FaTable} isOpen={isSidebarOpen} />
                <NavItem to="/blinds" label="Blinds" Icon={FaClock} isOpen={isSidebarOpen} />
                <NavItem to="/prizes" label="Prizes" Icon={FaTrophy} isOpen={isSidebarOpen} />
                <NavItem to="/announcements" label="Announcements" Icon={FaBullhorn} isOpen={isSidebarOpen} />
                <NavItem to="/history" label="History" Icon={FaHistory} isOpen={isSidebarOpen} />
              </>
            )}
        </nav>
        
        {/* User/Logout Section */}
        <div className="p-2 border-t border-gray-200">
          <button 
            onClick={handleLogout} 
            className={`w-full flex items-center p-2 rounded-lg transition-colors text-red-600 hover:bg-red-100 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
          >
            <span className="text-lg"><FaSignOutAlt /></span>
            <span className={`ml-3 transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>{currentUser?.displayName || 'Logout'}</span>
          </button>
        </div>

      </aside>
      <main className="flex-1 p-8 overflow-y-auto bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
