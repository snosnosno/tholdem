import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeBlocks = ['Morning (8am-12pm)', 'Afternoon (12pm-4pm)', 'Evening (4pm-8pm)', 'Night (8pm-12am)'];

interface Availability {
  [day: string]: string[];
}

const AvailableTimesPage = () => {
  const { currentUser } = useAuth();
  const [availability, setAvailability] = useState<Availability>({});
  
  const availabilityRef = currentUser ? doc(db, 'staffAvailability', currentUser.uid) : null;
  const [availabilitySnap, loading, error] = useDocument(availabilityRef);

  useEffect(() => {
    if (availabilitySnap?.exists()) {
      setAvailability(availabilitySnap.data() as Availability);
    }
  }, [availabilitySnap]);

  const handleCheckboxChange = (day: string, time: string) => {
    setAvailability(prev => {
      const daySchedule = prev[day] || [];
      const newSchedule = daySchedule.includes(time)
        ? daySchedule.filter(t => t !== time)
        : [...daySchedule, time];
      return { ...prev, [day]: newSchedule };
    });
  };

  const handleSubmit = async () => {
    if (!availabilityRef) {
      alert("You must be logged in to set availability.");
      return;
    }
    try {
      await setDoc(availabilityRef, availability);
      alert('Availability updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update availability.');
    }
  };

  if (loading) return <p>Loading availability...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!currentUser) return <p>Please log in to manage your availability.</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Set Your Weekly Availability</h1>
      <div className="space-y-4">
        {daysOfWeek.map(day => (
          <div key={day}>
            <h3 className="font-semibold text-lg mb-2">{day}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {timeBlocks.map(time => (
                <label key={time} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={availability[day]?.includes(time) || false}
                    onChange={() => handleCheckboxChange(day, time)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{time}</span>
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
        Save Availability
      </button>
    </div>
  );
};

export default AvailableTimesPage;
