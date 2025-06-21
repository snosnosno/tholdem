import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TournamentProvider } from './contexts/TournamentContext';
import Layout from './components/Layout';
import AdminLogin from './pages/AdminLogin';
import ParticipantLivePage from './pages/ParticipantLivePage';
import TournamentDashboard from './pages/TournamentDashboard';
import ParticipantsPage from './pages/ParticipantsPage';
import TablesPage from './pages/TablesPage';
import BlindsPage from './pages/BlindsPage';
import PrizesPage from './pages/PrizesPage';
import StaffPage from './pages/StaffPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailPage from './pages/HistoryDetailPage';

function App() {
  return (
    <TournamentProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/live/:tournamentId" element={<ParticipantLivePage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<TournamentDashboard />} />
            <Route path="/participants" element={<ParticipantsPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/blinds" element={<BlindsPage />} />
            <Route path="/prizes" element={<PrizesPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:tournamentId" element={<HistoryDetailPage />} />
          </Route>
        </Routes>
      </Router>
    </TournamentProvider>
  );
}

export default App;