import React, { useState } from 'react';
import AdminLogin from './components/AdminLogin';
import ParticipantsManager from './components/ParticipantsManager';
import TableManager from './components/TableManager';
import ChipBlindManager from './components/ChipBlindManager';
import PrizeCalculator from './components/PrizeCalculator';
import ParticipantLivePage from './components/ParticipantLivePage';
import TournamentHistory from './components/TournamentHistory';
import StaffManager from './components/StaffManager';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState(() => auth.currentUser);
  auth.onAuthStateChanged(u => setUser(u));
  
  return user ? (
    <>
      <ParticipantsManager />
      <TableManager />
      <ChipBlindManager />
      <PrizeCalculator />
      <TournamentHistory />
      <ParticipantLivePage />
      <StaffManager />
    </>
  ) : <AdminLogin />;
}

export default App;