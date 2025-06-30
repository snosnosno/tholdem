import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useTranslation } from 'react-i18next';

interface RoleRequirement {
    name: string;
    count: number;
}

interface TimeSlot {
    time: string;
    roles: RoleRequirement[];
}

interface JobPosting {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed';
  location: string;
  startDate: string;
  endDate: string;
  timeSlots: TimeSlot[];
  confirmedStaff: any[];
}

const JobBoardPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const jobPostingsQuery = useMemo(() => query(collection(db, 'jobPostings'), where('status', '==', 'open')), []);
  const [jobPostingsSnap, loading] = useCollection(jobPostingsQuery);
  const jobPostings = useMemo(() => jobPostingsSnap?.docs.map(d => ({ id: d.id, ...d.data() })) as JobPosting[] | undefined, [jobPostingsSnap]);
  
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<JobPosting | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<{ timeSlot: string, role: string } | null>(null);
    
  useEffect(() => {
    if (!currentUser || !jobPostingsSnap) return;
    const fetchAppliedJobs = async () => {
      if (!currentUser || !jobPostings) return;
      const postIds = jobPostings.map(p => p.id);
      if (postIds.length === 0) return;

      const q = query(collection(db, 'applications'), where('applicantId', '==', currentUser.uid), where('postId', 'in', postIds));
      const querySnapshot = await getDocs(q);
      const appliedPostIds = new Set(querySnapshot.docs.map(doc => doc.data().postId));
      setAppliedJobs(appliedPostIds);
    };

    fetchAppliedJobs();
  }, [jobPostings, currentUser, jobPostingsSnap]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dayOfWeek = t(`days.${date.getDay()}`);
    return `${year}-${month}-${day}(${dayOfWeek})`;
  };

  const handleOpenApplyModal = (post: JobPosting) => {
    setSelectedPost(post);
    setIsApplyModalOpen(true);
    setSelectedAssignment(null);
  };
  
  const handleApply = async () => {
    if (!currentUser) {
      alert(t('jobBoard.alerts.loginRequired'));
      return;
    }
    if (!selectedPost || !selectedAssignment) {
        alert(t('jobBoard.alerts.selectAssignment'));
        return;
    }

    setIsProcessing(selectedPost.id);
    try {
      const staffDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if(!staffDoc.exists()){
        alert(t('jobBoard.alerts.profileNotFound'));
        return;
      }
      
      await addDoc(collection(db, 'applications'), {
        applicantId: currentUser.uid,
        applicantName: staffDoc.data().name || t('jobBoard.unknownApplicant'),
        postId: selectedPost.id,
        postTitle: selectedPost.title,
        status: 'applied',
        appliedAt: serverTimestamp(),
        assignedRole: selectedAssignment.role,
        assignedTime: selectedAssignment.timeSlot,
      });

      alert(t('jobBoard.alerts.applicationSuccess'));
      setAppliedJobs(prev => new Set(prev).add(selectedPost.id));
      setIsApplyModalOpen(false);
      setSelectedPost(null);

    } catch (error) {
      console.error("Error submitting application: ", error);
      alert(t('jobBoard.alerts.applicationFailed'));
    } finally {
        setIsProcessing(null);
    }
  };

  const handleCancelApplication = async (postId: string) => {
      if (!currentUser) {
        alert(t('jobBoard.alerts.loginRequired'));
        return;
      }

      if (window.confirm(t('jobBoard.alerts.confirmCancel'))) {
          setIsProcessing(postId);
          try {
              const q = query(collection(db, 'applications'), where('applicantId', '==', currentUser.uid), where('postId', '==', postId));
              const querySnapshot = await getDocs(q);
              
              const deletePromises: Promise<void>[] = [];
              querySnapshot.forEach((document) => {
                  deletePromises.push(deleteDoc(doc(db, 'applications', document.id)));
              });
              await Promise.all(deletePromises);

              alert(t('jobBoard.alerts.cancelSuccess'));
              setAppliedJobs(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(postId);
                  return newSet;
              });
          } catch (error) {
              console.error("Error cancelling application: ", error);
              alert(t('jobBoard.alerts.cancelFailed'));
          } finally {
              setIsProcessing(null);
          }
      }
  };


  if (loading) {
    return <div>{t('jobBoard.loading')}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('jobBoard.title')}</h1>
      <div className="space-y-4">
        {jobPostings?.map((post) => {
            const formattedStartDate = formatDate(post.startDate);
            const formattedEndDate = formatDate(post.endDate);
            const isAlreadyApplied = appliedJobs.has(post.id);

            return (
                 <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                            <div className="flex items-center mb-2">
                                <h2 className="text-xl font-bold mr-4">{post.title}</h2>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800`}>
                                    {post.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-1">
                                {t('jobPostingAdmin.manage.location')}: {String(t(`locations.${post.location}`, post.location))}
                            </p>
                            <p className="text-sm text-gray-500 mb-1">
                                {t('jobPostingAdmin.manage.date')}: {post.endDate && post.endDate !== post.startDate ? `${formattedStartDate} ~ ${formattedEndDate}` : formattedStartDate}
                            </p>
                            {post.timeSlots?.map((ts, index) => (
                                <div key={index} className="mt-2 pl-4 border-l-2 border-gray-200">
                                    <p className="text-sm font-semibold text-gray-700">{t('jobPostingAdmin.manage.time')}: {ts.time}</p>
                                    <div className="text-sm text-gray-600">
                                        {ts.roles.map((r, i) => (
                                            <span key={i} className="mr-4">{t(`jobPostingAdmin.create.${r.name}`, r.name)}: {r.count}{t('jobPostingAdmin.manage.people')}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <p className="text-sm text-gray-500 mt-2">
                                {t('jobPostingAdmin.create.description')}: {post.description}
                            </p>
                        </div>
                        <div className='flex flex-col items-end space-y-2'>
                             <button
                                onClick={() => alert('Detailed view not implemented yet.')}
                                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                {t('jobBoard.viewDetails')}
                            </button>
                            {isAlreadyApplied ? (
                                <button
                                    onClick={() => handleCancelApplication(post.id)}
                                    disabled={isProcessing === post.id}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                                >
                                    {isProcessing === post.id ? t('jobBoard.cancelling', 'Cancelling...') : t('jobBoard.cancelApplication', 'Cancel Application')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleOpenApplyModal(post)}
                                    disabled={isProcessing === post.id}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    {isProcessing === post.id ? t('jobBoard.applying') : t('jobBoard.applyNow')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )
        })}
      </div>

        {isApplyModalOpen && selectedPost && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('jobBoard.applyModal.title', { postTitle: selectedPost.title })}</h3>
                    <div>
                        <label htmlFor="assignment" className="block text-sm font-medium text-gray-700">{t('jobBoard.applyModal.selectAssignment')}</label>
                        <select
                            id="assignment"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            value={selectedAssignment ? `${selectedAssignment.timeSlot}__${selectedAssignment.role}` : ''}
                            onChange={(e) => {
                                const [timeSlot, role] = e.target.value.split('__');
                                setSelectedAssignment({ timeSlot, role });
                            }}
                        >
                            <option value="" disabled>{t('jobBoard.applyModal.selectPlaceholder')}</option>
                            {selectedPost.timeSlots.flatMap(ts => 
                                ts.roles.map(r => {
                                    const value = `${ts.time}__${r.name}`;
                                    const confirmedCount = selectedPost.confirmedStaff?.filter(staff => staff.timeSlot === ts.time && staff.role === r.name).length || 0;
                                    const isFull = confirmedCount >= r.count;
                                    return (
                                        <option key={value} value={value} disabled={isFull}>
                                            {ts.time} - {t(`jobPostingAdmin.create.${r.name}`, r.name)} ({isFull ? t('jobBoard.applyModal.full') : `${confirmedCount}/${r.count}`})
                                        </option>
                                    )
                                })
                            )}
                        </select>
                    </div>
                    <div className="flex justify-end mt-4 space-x-2">
                        <button onClick={() => setIsApplyModalOpen(false)} className="py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-700">{t('jobBoard.applyModal.cancel')}</button>
                        <button onClick={handleApply} disabled={!selectedAssignment || isProcessing === selectedPost.id} className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">
                           {isProcessing ? t('jobBoard.applying') : t('jobBoard.applyModal.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default JobBoardPage;
