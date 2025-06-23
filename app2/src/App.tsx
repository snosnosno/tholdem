import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';
import { Layout } from './components/Layout';

// Page Imports
import AdminLogin from './pages/AdminLogin';
import ParticipantLivePage from './pages/ParticipantLivePage';
import PrivateRoute from './components/PrivateRoute';
import TournamentDashboard from './pages/TournamentDashboard';
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
import StaffingDashboardPage from './pages/StaffingDashboardPage';

// Admin Pages
import AdminEventsListPage from './pages/admin/EventsListPage';
import AdminEventNewPage from './pages/admin/EventNewPage';
import AdminEventDetailPage from './pages/admin/EventDetailPage';
import JobPostingAdminPage from './pages/JobPostingAdminPage';
import StaffListPage from './pages/StaffListPage';
import StaffNewPage from './pages/StaffNewPage';
import PayrollAdminPage from './pages/admin/PayrollAdminPage'; // Import the new page

// Dealer Pages
import DealerEventsListPage from './pages/dealer/DealerEventsListPage';

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
                <Route index element={<TournamentDashboard />} />
                <Route path="participants" element={<ParticipantsPage />} />
                <Route path="tables" element={<TablesPage />} />
                <Route path="blinds" element={<BlindsPage />} />
                <Route path="prizes" element={<PrizesPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:logId" element={<HistoryDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="available-times" element={<AvailableTimesPage />} />
                
                {/* Dealer facing routes */}
                <Route path="events" element={<DealerEventsListPage />} />
                <Route path="jobs" element={<JobBoardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                
                {/* Admin-only routes */}
                <Route path="admin/dashboard" element={<StaffingDashboardPage />} />
                <Route path="admin/staff" element={<StaffListPage />} />
                <Route path="admin/staff/new" element={<StaffNewPage />} />
                <Route path="admin/events" element={<AdminEventsListPage />} />
                <Route path="admin/events/new" element={<AdminEventNewPage />} />
                <Route path="admin/events/:eventId" element={<AdminEventDetailPage />} />
                <Route path="admin/job-postings" element={<JobPostingAdminPage />} />
                <Route path="admin/dealer-rotation" element={<DealerRotationPage />} />
                <Route path="admin/payroll" element={<PayrollAdminPage />} /> {/* Add the new route */}
              </Route>
            </Route>
          </Routes>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;
