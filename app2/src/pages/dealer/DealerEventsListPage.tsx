import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  // Let's be more flexible with date types from Firestore
  startDate: any;
  endDate: any;
  location: string;
  description: string;
}

const DealerEventsListPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'events'), where('status', '==', 'recruiting'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];
      setEvents(eventsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recruiting events: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Safely formats a date that could be a Firestore Timestamp, a Date object, or a date string.
   */
  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'N/A';
    
    // Check if it's a Firestore Timestamp and convert it
    if (typeof dateInput.toDate === 'function') {
      return dateInput.toDate().toLocaleDateString('en-US', { dateStyle: 'medium' });
    }
    
    // Check if it's already a Date object
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString('en-US', { dateStyle: 'medium' });
    }

    // Try to parse it if it's a string
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { dateStyle: 'medium' });
    }

    return 'Invalid Date';
  };
  
  if (loading) return <div className="p-6 text-center">Loading available events...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Available Events for Application</h1>
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{event.location}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </p>
                <p className="mt-4 text-gray-700">{event.description}</p>
                <div className="mt-4">
                  {/* TODO: Implement application logic */}
                  <button className="btn btn-primary">
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No events are currently recruiting.</p>
        )}
      </div>
    </div>
  );
};

export default DealerEventsListPage;
