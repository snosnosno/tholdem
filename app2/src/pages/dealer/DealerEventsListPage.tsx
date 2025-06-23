import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  startDate: { toDate: () => Date };
  endDate: { toDate: () => Date };
  location: string;
  description: string;
}

const DealerEventsListPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'events'), where('status', '==', 'recruiting'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsList: Event[] = [];
      querySnapshot.forEach((doc) => {
        eventsList.push({ id: doc.id, ...doc.data() } as Event);
      });
      setEvents(eventsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recruiting events: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  };
  
  if (loading) return <div className="p-6">Loading available events...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Available Events for Application</h1>
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{event.location}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {formatDate(event.startDate.toDate())} - {formatDate(event.endDate.toDate())}
                </p>
                <p className="mt-4 text-gray-700">{event.description}</p>
                <div className="mt-4">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
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
