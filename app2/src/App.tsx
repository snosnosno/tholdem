import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';
import { Layout } from './components/Layout';
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
import StaffListPage from './pages/StaffListPage';
import JobPostingAdminPage from './pages/JobPostingAdminPage';
import JobBoardPage from './pages/JobBoardPage';
import AttendancePage from './pages/AttendancePage';
import AvailableTimesPage from './pages/AvailableTimesPage';
import StaffingDashboardPage from './pages/StaffingDashboardPage';

function App() {
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
                <Route path="jobs" element={<JobBoardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="available-times" element={<AvailableTimesPage />} />
                {/* Admin-only routes */}
                <Route path="staffing-dashboard" element={<StaffingDashboardPage />} />
                <Route path="dealer-rotation" element={<DealerRotationPage />} />
                <Route path="staff-management" element={<StaffListPage />} /> 
                <Route path="job-postings" element={<JobPostingAdminPage />} /> 
              </Route>
            </Route>
          </Routes>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;
