import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';

const StaffNewPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'dealer' // Default role
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
        setError("You do not have permission to perform this action.");
        return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const functions = getFunctions();
      const createUser = httpsCallable(functions, 'createUserAccount');
      await createUser(formData);
      alert('Staff member created successfully!');
      navigate('/admin/staff'); // Redirect to staff list after creation
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAdmin) {
    return <div className="p-6 text-red-500">You do not have permission to view this page.</div>
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
       <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Add New Staff Member</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              id="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="dealer">Dealer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
       </div>
    </div>
  );
};

export default StaffNewPage;
