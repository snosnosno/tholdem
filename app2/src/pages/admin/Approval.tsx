import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, functions } from '../../firebase';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

interface PendingUser {
    id: string;
    name: string;
    email: string;
}

const ApprovalPage: React.FC = () => {
    const { t } = useTranslation();
    const [pendingManagers, setPendingManagers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const processRegistration = httpsCallable(functions, 'processRegistration');

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "pending_manager"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const users: PendingUser[] = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() } as PendingUser);
            });
            setPendingManagers(users);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching pending managers: ", err);
            setError(t('approvalPage.fetchError'));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [t]);

    const handleApproval = async (targetUid: string, action: 'approve' | 'reject') => {
        try {
            await processRegistration({ targetUid, action });
            // The onSnapshot listener will automatically update the list
        } catch (err: any) {
            console.error(`Error processing ${action} for ${targetUid}:`, err);
            alert(t('approvalPage.processError', { action }));
        }
    };

    if (loading) return <div className="p-6 text-center">{t('loading')}</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">{t('approvalPage.title')}</h1>
            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('approvalPage.nameHeader')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('approvalPage.emailHeader')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('approvalPage.actionsHeader')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {pendingManagers.length > 0 ? (
                            pendingManagers.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onClick={() => handleApproval(user.id, 'approve')} className="btn btn-success btn-sm">{t('approve')}</button>
                                        <button onClick={() => handleApproval(user.id, 'reject')} className="btn btn-danger btn-sm">{t('reject')}</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">{t('approvalPage.noPending')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ApprovalPage;
