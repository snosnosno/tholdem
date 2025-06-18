import React, { useState } from 'react';
import AdminLogin from './components/AdminLogin';
import TableManager from './components/TableManager';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState(() => auth.currentUser);
  auth.onAuthStateChanged(u => setUser(u));
  return user ? (
    <>
      <ParticipantsManager />
      <TableManager />
    </>
  ) : <AdminLogin />;
}

export default App;


  );
}

export default App;
