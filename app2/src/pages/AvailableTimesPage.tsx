import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocument } from '../hooks/useFirestore';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeBlocks = ['Morning (8am-12pm)', 'Afternoon (12pm-4pm)', 'Evening (4pm-8pm)', 'Night (8pm-12am)'];

const initialAvailability = daysOfWeek.reduce((acc, day) => {
  acc[day] = timeBlocks.reduce((blockAcc, block) => {
    blockAcc[block] = false;
    return blockAcc;
  }, {} as { [key: string]: boolean });
  return acc;
}, {} as { [key: string]: { [key: string]: boolean } });


const AvailableTimesPage = () => {
  const { currentUser } = useAuth();
  const { document: availabilityDoc, loading, error, upsertDocument } = useDocument('staffAvailability', currentUser?.uid || '');
  
  const [availability, setAvailability] = useState(initialAvailability);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (availabilityDoc && availabilityDoc.schedule) {
      // Deep merge to ensure all days and blocks are present
      const mergedSchedule = JSON.parse(JSON.stringify(initialAvailability));
      for (const day in availabilityDoc.schedule) {
        if (mergedSchedule[day]) {
          for (const block in availabilityDoc.schedule[day]) {
            if (mergedSchedule[day].hasOwnProperty(block)) {
              mergedSchedule[day][block] = availabilityDoc.schedule[day][block];
            }
          }
        }
      }
      setAvailability(mergedSchedule);
    }
  }, [availabilityDoc]);

  const handleCheckboxChange = (day: string, block: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [block]: !prev[day][block],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await upsertDocument({ schedule: availability });
      alert('Availability updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update availability.');
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading availability...</div>;
  if (error) return <div className="p-4">Error loading availability.</div>;
  if (!currentUser) return <div className="p-4">Please log in to set your availability.</div>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Set Your Weekly Availability</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                {timeBlocks.map(block => (
                  <th key={block} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{block}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {daysOfWeek.map(day => (
                <tr key={day}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day}</td>
                  {timeBlocks.map(block => (
                    <td key={block} className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={availability[day]?.[block] || false}
                        onChange={() => handleCheckboxChange(day, block)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-right">
            <button 
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Availability'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AvailableTimesPage;
