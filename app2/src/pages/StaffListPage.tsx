import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

// Define data structures
interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface Application {
  id: string;
  applicantId: string;
  applicantDetails?: User;
}

interface JobPosting {
  id:string;
  title: string;
  confirmedStaff: Application[];
}

const StaffListPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchManagerStaff = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Fetch job postings for the current manager
        const postingsQuery = query(
          collection(db, 'jobPostings'),
          where('managerId', '==', currentUser.uid)
        );
        const postingsSnapshot = await getDocs(postingsQuery);
        const postingsData: Omit<JobPosting, 'confirmedStaff'>[] = postingsSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
        }));

        // 2. For each posting, fetch confirmed applications and user details
        const postingsWithStaff = await Promise.all(
          postingsData.map(async (posting) => {
            const applicationsQuery = query(
              collection(db, 'applications'),
              where('postId', '==', posting.id),
              where('status', '==', 'confirmed')
            );
            const applicationsSnapshot = await getDocs(applicationsQuery);
            
            const confirmedStaff = await Promise.all(
              applicationsSnapshot.docs.map(async (appDoc) => {
                const applicantId = appDoc.data().applicantId;
                const userDocRef = doc(db, 'users', applicantId);
                const userDoc = await getDoc(userDocRef);

                return {
                  id: appDoc.id,
                  applicantId: applicantId,
                  applicantDetails: userDoc.exists() 
                    ? { id: userDoc.id, ...userDoc.data() } as User 
                    : undefined,
                };
              })
            );

            return { ...posting, confirmedStaff };
          })
        );
        
        setPostings(postingsWithStaff);
      } catch (e) {
        console.error("Error fetching staff data: ", e);
        setError(t('staffListPage.fetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchManagerStaff();
  }, [currentUser, t]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="text-xl font-semibold">{t('loading')}</div></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{t('staffListPage.title')}</h1>

      {postings.length === 0 ? (
        <p>{t('staffListPage.noPostings')}</p>
      ) : (
        <div className="space-y-8">
          {postings.map((posting) => (
            <div key={posting.id} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">{posting.title}</h2>
              {posting.confirmedStaff.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {posting.confirmedStaff.map((staff) => (
                    <li key={staff.id} className="py-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-lg">{staff.applicantDetails?.name || t('staffListPage.unknownUser')}</p>
                        <p className="text-sm text-gray-600">{staff.applicantDetails?.email}</p>
                        <p className="text-sm text-gray-600">{staff.applicantDetails?.phone}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t('staffListPage.noConfirmedStaff')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffListPage;
