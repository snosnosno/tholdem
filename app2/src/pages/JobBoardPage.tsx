import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useTranslation } from 'react-i18next';

interface JobPosting {
  id: string;
  title: string;
  tournamentId: string;
  tournamentName?: string;
  role: string;
  requiredCount: number;
  description: string;
  status: string;
}

const JobBoardPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const jobPostingsQuery = useMemo(() => query(collection(db, 'jobPostings')), []);
  const [jobPostingsSnap, loading] = useCollection(jobPostingsQuery);
  const jobPostings = useMemo(() => jobPostingsSnap?.docs.map(d => ({ id: d.id, ...d.data() })) as JobPosting[] | undefined, [jobPostingsSnap]);
  
  const [enrichedPostings, setEnrichedPostings] = useState<JobPosting[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournamentNames = async () => {
      if (!jobPostings) return;
      const postingsWithTournamentNames = await Promise.all(
        jobPostings.map(async (post) => {
          if (!post.tournamentId) return { ...post, tournamentName: 'N/A' };
          const tournamentDoc = await getDoc(doc(db, 'tournaments', post.tournamentId));
          return { ...post, tournamentName: tournamentDoc.exists() ? tournamentDoc.data().name : 'N/A' };
        })
      );
      setEnrichedPostings(postingsWithTournamentNames);
    };

    const fetchAppliedJobs = async () => {
      if (!currentUser) return;
      const q = query(collection(db, 'applications'), where('staffId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const appliedPostIds = new Set(querySnapshot.docs.map(doc => doc.data().postId));
      setAppliedJobs(appliedPostIds);
    };

    fetchTournamentNames();
    fetchAppliedJobs();
  }, [jobPostings, currentUser]);

  const handleApply = async (postId: string, postTitle: string) => {
    if (!currentUser) {
      alert(t('jobBoard.alerts.loginRequired'));
      return;
    }
    setIsApplying(postId);
    try {
      const staffDoc = await getDoc(doc(db, 'staffProfiles', currentUser.uid));
      if(!staffDoc.exists()){
        alert(t('jobBoard.alerts.profileNotFound'));
        return;
      }
      
      await addDoc(collection(db, 'applications'), {
        staffId: currentUser.uid,
        applicantName: staffDoc.data().name || 'Unknown Applicant',
        postId: postId,
        postTitle: postTitle,
        status: 'pending',
        appliedAt: serverTimestamp(),
      });
      alert(t('jobBoard.alerts.applicationSuccess'));
      setAppliedJobs(prev => new Set(prev).add(postId));
    } catch (error) {
      console.error("Error submitting application: ", error);
      alert(t('jobBoard.alerts.applicationFailed'));
    } finally {
        setIsApplying(null);
    }
  };

  if (loading) {
    return <div>{t('jobBoard.loading')}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('jobBoard.title')}</h1>
      <div className="space-y-4">
        {enrichedPostings.filter(p => p.status === 'open').map((post) => (
          <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold">{post.title}</h2>
            <p className="text-sm text-gray-600">{t('jobBoard.tournament', { name: post.tournamentName })}</p>
            <p className="text-sm text-gray-600">{t('jobBoard.role', { role: post.role })}</p>
            <p className="mt-2">{post.description}</p>
            <button
              onClick={() => handleApply(post.id, post.title)}
              disabled={appliedJobs.has(post.id) || isApplying === post.id}
              className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              {isApplying === post.id ? t('jobBoard.applying') : appliedJobs.has(post.id) ? t('jobBoard.applied') : t('jobBoard.applyNow')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobBoardPage;