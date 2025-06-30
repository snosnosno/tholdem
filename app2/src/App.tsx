import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';
import { Layout } from './components/Layout';

// Page Imports
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import SignUp from './pages/SignUp';
import ParticipantLivePage from './pages/ParticipantLivePage';

// Route Guards
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRoute from './components/RoleBasedRoute'; // Import the new RoleBasedRoute

// Page Components
import ParticipantsPage from './pages/ParticipantsPage';
import TablesPage from './pages/TablesPage';
import BlindsPage from './pages/BlindsPage';
import PrizesPage from './pages/PrizesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import ProfilePage from './pages/ProfilePage';
import JobBoardPage from './pages/JobBoardPage';
import AttendancePage from './pages/AttendancePage';
import AvailableTimesPage from './pages/AvailableTimesPage';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import AdminEventsListPage from './pages/admin/EventsListPage';
import AdminEventNewPage from './pages/admin/EventNewPage';
import AdminEventDetailPage from './pages/admin/EventDetailPage';
import JobPostingAdminPage from './pages/JobPostingAdminPage';
import StaffListPage from './pages/StaffListPage';
import StaffNewPage from './pages/StaffNewPage';
import PayrollAdminPage from './pages/admin/PayrollAdminPage';
import StaffingDashboardPage from './pages/StaffingDashboardPage';
import ApprovalPage from './pages/admin/Approval';
import DealerRotationPage from './pages/DealerRotationPage';
import UserManagementPage from './pages/admin/UserManagementPage'; // Import the new page

// Dealer Pages
import DealerEventsListPage from './pages/dealer/DealerEventsListPage';

// A component to handle role-based redirection
const HomeRedirect: React.FC = () => {
  const { isAdmin } = useAuth(); // isAdmin is kept for compatibility
  return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/events" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TournamentProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/live/:tournamentId" element={<ParticipantLivePage />} />
          
          {/* Authenticated Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="profile" element={<ProfilePage />} />
              
              {/* Dealer facing routes */}
              <Route path="events" element={<DealerEventsListPage />} />
              <Route path="jobs" element={<JobBoardPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="available-times" element={<AvailableTimesPage />} />

              {/* Admin & Manager Routes */}
              <Route path="admin" element={<RoleBasedRoute allowedRoles={['admin', 'manager']} />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="staff" element={<StaffListPage />} />
                <Route path="staff/new" element={<StaffNewPage />} />
                <Route path="staffing-dashboard" element={<StaffingDashboardPage />} />
                <Route path="events" element={<AdminEventsListPage />} />
                <Route path="events/new" element={<AdminEventNewPage />} />
                <Route path="events/:eventId" element={<AdminEventDetailPage />} />
                <Route path="job-postings" element={<JobPostingAdminPage />} />
                <Route path="dealer-rotation" element={<DealerRotationPage />} />
                <Route path="payroll" element={<PayrollAdminPage />} />
                <Route path="participants" element={<ParticipantsPage />} />
                <Route path="tables" element={<TablesPage />} />
                <Route path="blinds" element={<BlindsPage />} />
                <Route path="prizes" element={<PrizesPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:logId" element={<HistoryDetailPage />} />
              </Route>

              {/* Admin Only Route */}
              <Route path="admin" element={<RoleBasedRoute allowedRoles={['admin']} />}>
                  <Route path="approvals" element={<ApprovalPage />} />
                  <Route path="user-management" element={<UserManagementPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;
