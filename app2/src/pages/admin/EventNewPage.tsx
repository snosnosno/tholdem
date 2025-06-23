import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const EventNewPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    startDate: '',
    endDate: '',
    status: 'recruiting' as 'recruiting' | 'ongoing' | 'completed',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("You do not have permission to create an event.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { name, location, latitude, longitude, startDate, endDate, status, description } = formData;
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      
      await addDoc(collection(db, 'events'), {
        name,
        location,
        geoPoint: (latitude && longitude) ? new GeoPoint(lat, lon) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate('/admin/events');
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAdmin) return <div className="p-6 text-red-500">Access Denied.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex justify-center items-center">
      <div className="max-w-xl w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500">{error}</p>}
          <input type="text" name="name" placeholder="Event Name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded"/>
          <input type="text" name="location" placeholder="Location" value={formData.location} onChange={handleChange} required className="w-full px-3 py-2 border rounded"/>
          <div className="flex space-x-2">
            <input type="number" step="any" name="latitude" placeholder="Latitude" value={formData.latitude} onChange={handleChange} className="w-1/2 px-3 py-2 border rounded"/>
            <input type="number" step="any" name="longitude" placeholder="Longitude" value={formData.longitude} onChange={handleChange} className="w-1/2 px-3 py-2 border rounded"/>
          </div>
          <div className="flex space-x-2">
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="w-1/2 px-3 py-2 border rounded"/>
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="w-1/2 px-3 py-2 border rounded"/>
          </div>
          <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border rounded">
            <option value="recruiting">Recruiting</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
          <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded"/>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EventNewPage;
