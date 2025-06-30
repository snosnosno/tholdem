import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import EditUserModal from '../../components/EditUserModal';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Staff | null>(null);

  useEffect(() => {
    if (!isAdmin) {
        setLoading(false);
        return;
    };

    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'dealer', 'manager', 'pending_manager']));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list: Staff[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Staff);
      });
      setStaffList(list);
      setLoading(false);
    }, (err) => {
        console.error("Error fetching staff list: ", err);
        setError(t('staffList.fetchError'));
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, t]);

  const handleDelete = async (userId: string) => {
    if (!window.confirm(t('staffList.confirmDelete'))) {
        return;
    }
    
    setError(null);
    try {
        const deleteUser = httpsCallable(functions, 'deleteUser');
        await deleteUser({ uid: userId });
        alert(t('staffList.deleteSuccess'));
    } catch (err: any) {
        console.error("Error deleting user:", err);
        setError(err.message || t('staffList.deleteError'));
    }
  };

  const handleOpenEditModal = (user: Staff) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedUser(null);
    setIsEditModalOpen(false);
  };

  if (loading) {
    return <div className="p-6">{t('staffList.loading')}</div>;
  }

  if (error) {
      return <div className="p-6 text-red-500">{error}</div>
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
                            <div className="flex items-center space-x-4">
                                <span className="text-sm capitalize text-gray-600 bg-gray-200 px-2 py-1 rounded-full">{staff.role}</span>
                                <button onClick={() => handleOpenEditModal(staff)} className="text-blue-600 hover:text-blue-800">{t('staffList.edit')}</button>
                                <button onClick={() => handleDelete(staff.id)} className="text-red-600 hover:text-red-800">{t('staffList.delete')}</button>
                            </div>
                        </li>
                    )) : (
                        <p className="text-center text-gray-500 py-4">{t('staffList.noStaffFound')}</p>
                    )}
                </ul>
            </div>
        </div>
        
        {isEditModalOpen && selectedUser && (
            <EditUserModal 
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                user={selectedUser}
            />
        )}
    </div>
  );
};

export default UserManagementPage;
