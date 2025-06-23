import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';

const StaffNewPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    experience: '',
    hourlyRate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const functions = getFunctions();
  const createUserAccount = httpsCallable(functions, 'createUserAccount');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
    }
    
    try {
      await createUserAccount({
        ...formData,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
      });
      setSuccess('Successfully created new staff member. Redirecting to staff list...');
      setTimeout(() => navigate('/admin/staff'), 2000);
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAdmin) {
    return <div className="p-6 text-red-500">Access Denied. You must be an admin to perform this action.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full bg-white p-8 shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Staff Member</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{success}</div>}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" name="password" id="password" required value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
              <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Experience (Optional)</label>
              <input type="text" name="experience" id="experience" value={formData.experience} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">Hourly Rate ($) (Optional)</label>
              <input type="number" name="hourlyRate" id="hourlyRate" value={formData.hourlyRate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffNewPage;
