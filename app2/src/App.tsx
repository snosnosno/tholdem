import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';
import { Layout } from './components/Layout'; // Changed to named import
import AdminLogin from './pages/AdminLogin';
import ParticipantLivePage from './pages/ParticipantLivePage';
import PrivateRoute from './components/PrivateRoute';
import TournamentDashboard from './pages/TournamentDashboard';
import ParticipantsPage from './pages/ParticipantsPage';
import TablesPage from './pages/TablesPage';
import BlindsPage from './pages/BlindsPage';
import PrizesPage from './pages/PrizesPage';
// import StaffPage from './pages/StaffPage';
// import StaffRecruitPage from './pages/StaffRecruitPage';
// import StaffAssignmentPage from './pages/StaffAssignmentPage';
// import AttendancePayrollPage from './pages/AttendancePayrollPage';
// import DealerRotationPage from './pages/DealerRotationPage';
// import WorkLogPage from './pages/WorkLogPage'; // Added WorkLogPage import
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

                {/* Staff Routes */}
                {/* Staff Routes - Temporarily disabled */}
                {/* <Route path="staff" element={<StaffPage />} /> */}
                {/* <Route path="staff-recruit" element={<StaffRecruitPage />} /> */}
                {/* <Route path="staff-assignment" element={<StaffAssignmentPage />} /> */}
                {/* <Route path="dealer-rotation" element={<DealerRotationPage />} /> */}
                {/* <Route path="work-log" element={<WorkLogPage />} /> */}
                {/* <Route path="attendance-payroll" element={<AttendancePayrollPage />} /> */}
              </Route>
            </Route>
          </Routes>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;
