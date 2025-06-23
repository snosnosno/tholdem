import { useState, useEffect } from 'react';
import db from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface TournamentSettings {
  minWorkMinutesForClockOut: number;
  availableBreakDurations: number[];
  venueLocation: { latitude: number, longitude: number };
  venueRadius: number;
}

const defaultSettings: TournamentSettings = {
  minWorkMinutesForClockOut: 240,
  availableBreakDurations: [10, 20, 30],
  venueLocation: { latitude: 37.5665, longitude: 126.9780 }, // Default to Seoul
  venueRadius: 100,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<TournamentSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'tournament_rules');
    
    const unsubscribe = onSnapshot(settingsDocRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as TournamentSettings);
        } else {
          // You might want to handle the case where settings are not found
          // For now, we just use the default settings.
          console.warn("Tournament settings not found in Firestore. Using default settings.");
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
        console.error("Error fetching settings:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  return { settings, loading, error };
};
