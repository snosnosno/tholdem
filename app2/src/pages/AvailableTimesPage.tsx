import { doc, setDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';


const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const timeKeys = ['morning', 'afternoon', 'evening', 'night'];

interface Availability {
  [day: string]: string[];
}

const AvailableTimesPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [availability, setAvailability] = useState<Availability>({});
  
  const availabilityRef = currentUser ? doc(db, 'staffAvailability', currentUser.uid) : null;
  const [availabilitySnap, loading, error] = useDocument(availabilityRef);

  useEffect(() => {
    if (availabilitySnap?.exists()) {
      const data = availabilitySnap.data();
      // Translate keys from English to current language for matching
      const translatedData: Availability = {};
      for (const day in data) {
        const dayKey = day.toLowerCase();
        if (dayKeys.includes(dayKey)) {
          translatedData[dayKey] = data[day].map((time: string) => {
             // Find the key for the stored English time
            const timeKeyEntry = Object.entries(t('availableTimes.times', { returnObjects: true })).find(([key, value]) => value === time);
            return timeKeyEntry ? timeKeyEntry[0] : time;
          });
        }
      }
      setAvailability(data as Availability);
    }
  }, [availabilitySnap, t]);

  const handleCheckboxChange = (dayKey: string, timeKey: string) => {
    setAvailability(prev => {
      const daySchedule = prev[dayKey] || [];
      const newSchedule = daySchedule.includes(timeKey)
        ? daySchedule.filter(t => t !== timeKey)
        : [...daySchedule, timeKey];
      return { ...prev, [dayKey]: newSchedule };
    });
  };

  const handleSubmit = async () => {
    if (!availabilityRef) {
      alert(t('availableTimes.alerts.notLoggedIn'));
      return;
    }
    try {
      // Before saving, translate keys back to a neutral format (English keys) if needed, or store keys directly.
      // Storing keys is better for i18n.
      await setDoc(availabilityRef, availability);
      alert(t('availableTimes.alerts.updateSuccess'));
    } catch (err) {
      console.error(err);
      alert(t('availableTimes.alerts.updateFailed'));
    }
  };

  if (loading) return <p>{t('availableTimes.status.loading')}</p>;
  if (error) return <p>{t('availableTimes.status.error', { message: error.message })}</p>;
  if (!currentUser) return <p>{t('availableTimes.status.loginRequired')}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('availableTimes.title')}</h1>
      <div className="space-y-4">
        {dayKeys.map(dayKey => (
          <div key={dayKey}>
            <h3 className="font-semibold text-lg mb-2">{t(`availableTimes.days.${dayKey}`)}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {timeKeys.map(timeKey => (
                <label key={timeKey} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={availability[dayKey]?.includes(timeKey) || false}
                    onChange={() => handleCheckboxChange(dayKey, timeKey)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t(`availableTimes.times.${timeKey}`)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        className="mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        {t('availableTimes.saveButton')}
      </button>
    </div>
  );
};

export default AvailableTimesPage;