import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  // Add other relevant staff properties here
}

const StaffListPage: React.FC = () => {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Only fetch if user is an admin
    if (!isAdmin) {
        setLoading(false);
        return;
    };

    const q = query(collection(db, 'users'), where('role', '==', 'dealer'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list: Staff[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Staff);
      });
      setStaffList(list);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching staff list: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (loading) {
    return <div className="p-6">{t('staffList.loading')}</div>;
  }

  if (!isAdmin) {
      return <div className="p-6 text-red-500">{t('staffList.accessDenied')}</div>
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('staffList.title')}</h1>
                <Link to="/admin/staff/new" className="btn btn-primary">
                    {t('staffList.addNew')}
                </Link>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <ul className="divide-y divide-gray-200">
                    {staffList.length > 0 ? staffList.map(staff => (
                        <li key={staff.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-gray-900">{staff.name}</p>
                                <p className="text-sm text-gray-500">{staff.email}</p>
                            </div>
                            <span className="text-sm capitalize text-gray-600 bg-gray-200 px-2 py-1 rounded-full">{staff.role}</span>
                        </li>
                    )) : (
                        <p className="text-center text-gray-500 py-4">{t('staffList.noStaffFound')}</p>
                    )}
                </ul>
            </div>
        </div>
    </div>
  );
};

export default StaffListPage;
