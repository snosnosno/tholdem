import React, { useState } from 'react';
import AdminLogin from './components/AdminLogin';
import ParticipantsManager from './components/ParticipantsManager';
import TableManager from './components/TableManager';
import PrizeCalculator from './components/PrizeCalculator';
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
    </>
  ) : <AdminLogin />;
}

export default App;


  );
}

export default App;
