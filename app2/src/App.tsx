import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';
import { Layout } from './components/Layout';

// Page Imports
import AdminLogin from './pages/AdminLogin';
import ParticipantLivePage from './pages/ParticipantLivePage';
import PrivateRoute from './components/PrivateRoute';
import ParticipantsPage from './pages/ParticipantsPage';
import TablesPage from './pages/TablesPage';
import BlindsPage from './pages/BlindsPage';
import PrizesPage from './pages/PrizesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import DealerRotationPage from './pages/DealerRotationPage';
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

// Dealer Pages
import DealerEventsListPage from './pages/dealer/DealerEventsListPage';

// A component to handle role-based redirection
const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  // Default to dealer's event list or a general landing page
  return <Navigate to="/events" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TournamentProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/live/:tournamentId" element={<ParticipantLivePage />} />
            
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomeRedirect />} />
                
                {/* Common pages for both roles might go here if any */}
                <Route path="profile" element={<ProfilePage />} />
                
                {/* Dealer facing routes */}
                <Route path="events" element={<DealerEventsListPage />} />
                <Route path="jobs" bgelement={<JobBoardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="available-times" element={<AvailableTimesPage />} />

                {/* Admin-only routes */}
                <Route path="admin/dashboard" element={<DashboardPage />} />
                <Route path="admin/staff" element={<StaffListPage />} />
                <Route path="admin/staff/new" element={<StaffNewPage />} />
                <Route path="admin/events" element={<AdminEventsListPage />} />
                <Route path="admin/events/new" element={<AdminEventNewPage />} />
                <Route path="admin/events/:eventId" element={<AdminEventDetailPage />} />
                <Route path="admin/job-postings" element={<JobPostingAdminPage />} />
                <Route path="admin/dealer-rotation" element={<DealerRotationPage />} />
                <Route path="admin/payroll" element={<PayrollAdminPage />} />
                
                {/* Deprecated/Re-purposed routes for reference if needed */}
                <Route path="participants" element={<ParticipantsPage />} />
                <Route path="tables" element={<TablesPage />} />
                <Route path="blinds" element={<BlindsPage />} />
                <Route path="prizes" element={<PrizesPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:logId" element={<HistoryDetailPage />} />

              </Route>
            </Route>
          </Routes>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;
