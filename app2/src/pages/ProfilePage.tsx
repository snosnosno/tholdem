import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocument } from '../hooks/useFirestore';

const ProfilePage = () => {
  const { currentUser } = useAuth();

  const { document: profile, loading, error, upsertDocument } = useDocument('staffProfiles', currentUser?.uid || '');
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    role: '',
    languages: '',
    games: '',
    hourlyRate: 0,
    dailyRate: 0,
    bankAccount: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        contact: profile.contact || '',
        role: profile.role || 'dealer',
        languages: (profile.languages || []).join(', '),
        games: (profile.games || []).join(', '),
        hourlyRate: profile.hourlyRate || 0,
        dailyRate: profile.dailyRate || 0,
        bankAccount: profile.bankAccount || '',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const dataToSave = {
        ...formData,
        languages: formData.languages.split(',').map(s => s.trim()),
        games: formData.games.split(',').map(s => s.trim()),
        hourlyRate: Number(formData.hourlyRate),
        dailyRate: Number(formData.dailyRate),
      };
      await upsertDocument(dataToSave);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    }
  };

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error loading profile.</div>;
  if (!currentUser) return <div>Please log in to see your profile.</div>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700">Contact</label>
          <input type="text" name="contact" id="contact" value={formData.contact} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Primary Role</label>
          <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option value="dealer">Dealer</option>
            <option value="floor">Floor</option>
            <option value="registration">Registration</option>
            <option value="td">Tournament Director</option>
          </select>
        </div>
        <div>
          <label htmlFor="languages" className="block text-sm font-medium text-gray-700">Languages (comma separated)</label>
          <input type="text" name="languages" id="languages" value={formData.languages} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="games" className="block text-sm font-medium text-gray-700">Available Games (comma separated)</label>
          <input type="text" name="games" id="games" value={formData.games} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">Hourly Rate</label>
          <input type="number" name="hourlyRate" id="hourlyRate" value={formData.hourlyRate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700">Daily Rate</label>
          <input type="number" name="dailyRate" id="dailyRate" value={formData.dailyRate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">Bank Account (for payroll)</label>
          <input type="text" name="bankAccount" id="bankAccount" value={formData.bankAccount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
