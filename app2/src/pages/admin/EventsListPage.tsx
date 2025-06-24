import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  startDate: any;
  endDate: any;
  status: 'recruiting' | 'ongoing' | 'completed';
  location: string;
}

const EventsListPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];
      setEvents(eventsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'N/A';
    if (typeof dateInput.toDate === 'function') {
      return dateInput.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return 'Invalid Date';
  };

  if (loading) return <div className="p-6 text-center">Loading events...</div>;
  if (!isAdmin) return <div className="p-6 text-red-500">Access Denied. You are not authorized to view this page.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Event Management</h1>
          <Link
            to="/admin/events/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Event
          </Link>
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(event.startDate)} - {formatDate(event.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      event.status === 'recruiting' ? 'bg-green-100 text-green-800' :
                      event.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/admin/events/${event.id}`} className="text-blue-600 hover:text-blue-900">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EventsListPage;
