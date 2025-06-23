import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  experience: string | null;
  hourlyRate: number;
}

const StaffListPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'users'), where('role', '==', 'dealer'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const staff: Staff[] = [];
      querySnapshot.forEach((doc) => {
        staff.push({ id: doc.id, ...doc.data() } as Staff);
      });
      setStaffList(staff);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching staff list: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="p-6 text-red-500">Access Denied. You must be an admin to view this page.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Staff Management</h1>
          <Link
            to="/admin/staff/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Staff
          </Link>
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffList.length > 0 ? (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.phone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.experience || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.hourlyRate?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No staff members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffListPage;
