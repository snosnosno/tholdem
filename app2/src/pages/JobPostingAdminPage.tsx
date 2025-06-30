import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, query, doc, updateDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useTranslation } from 'react-i18next';

interface Tournament {
    id: string;
    name: string;
}

interface Applicant {
    id: string;
    applicantName: string;
    appliedAt: any;
}

const JobPostingAdminPage = () => {
  const { t } = useTranslation();
  const tournamentsQuery = useMemo(() => query(collection(db, 'tournaments')), []);
  const jobPostingsQuery = useMemo(() => query(collection(db, 'jobPostings')), []);
  
  const [tournamentsSnap] = useCollection(tournamentsQuery);
  const [jobPostingsSnap, loading] = useCollection(jobPostingsQuery);
  
  const tournaments = useMemo(() => tournamentsSnap?.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)), [tournamentsSnap]);
  const jobPostings = useMemo(() => jobPostingsSnap?.docs.map(d => ({ id: d.id, ...d.data() })), [jobPostingsSnap]);

  const [formData, setFormData] = useState({
    title: '',
    tournamentId: '',
    role: 'dealer',
    type: '지원', // '고정' or '지원'
    requiredCount: 1,
    description: '',
    status: 'open',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [isMatching, setIsMatching] = useState<string | null>(null);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tournamentId) {
        alert(t('jobPostingAdmin.alerts.selectTournament'));
        return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'jobPostings'), {
        ...formData,
        requiredCount: Number(formData.requiredCount),
        createdAt: serverTimestamp(),
      });
      alert(t('jobPostingAdmin.alerts.createSuccess'));
      setFormData({
        title: '',
        tournamentId: '',
        role: 'dealer',
        type: '지원',
        requiredCount: 1,
        description: '',
        status: 'open',
      });
    } catch (error) {
      console.error("Error creating job posting: ", error);
      alert(t('jobPostingAdmin.alerts.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoMatch = async (jobPostingId: string) => {
    setIsMatching(jobPostingId);
    try {
        const functions = getFunctions();
        const autoMatchStaff = httpsCallable(functions, 'autoMatchStaff');
        const result = await autoMatchStaff({ jobPostingId });
        alert((result.data as { message: string }).message);
    } catch (error) {
        console.error("Error running auto match: ", error);
        alert(t('jobPostingAdmin.alerts.matchFailed'));
    } finally {
        setIsMatching(null);
    }
  };

  const handleOpenEditModal = (post: any) => {
    setCurrentPost(post);
    setIsEditModalOpen(true);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost) return;
    
    const postRef = doc(db, 'jobPostings', currentPost.id);
    try {
      await updateDoc(postRef, {
        title: currentPost.title,
        role: currentPost.role,
        type: currentPost.type,
        requiredCount: Number(currentPost.requiredCount),
        description: currentPost.description,
        status: currentPost.status,
      });
      alert(t('jobPostingAdmin.alerts.updateSuccess'));
      setIsEditModalOpen(false);
      setCurrentPost(null);
    } catch (error) {
      console.error("Error updating job posting: ", error);
      alert(t('jobPostingAdmin.alerts.updateFailed'));
    }
  };
  
  const handleDelete = async (postId: string) => {
    if (window.confirm(t('jobPostingAdmin.alerts.confirmDelete', '정말로 이 공고를 삭제하시겠습니까?'))) {
        try {
            await deleteDoc(doc(db, 'jobPostings', postId));
            alert(t('jobPostingAdmin.alerts.deleteSuccess', '공고가 성공적으로 삭제되었습니다.'));
        } catch (error) {
            console.error("Error deleting job posting: ", error);
            alert(t('jobPostingAdmin.alerts.deleteFailed', '공고 삭제에 실패했습니다.'));
        }
    }
  };

  const handleViewApplicants = async (postId: string) => {
    setLoadingApplicants(true);
    setIsApplicantsModalOpen(true);
    try {
        const q = query(collection(db, 'applications'), where('postId', '==', postId));
        const querySnapshot = await getDocs(q);
        const fetchedApplicants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Applicant));
        setApplicants(fetchedApplicants);
    } catch (error) {
        console.error("Error fetching applicants: ", error);
        alert(t('jobPostingAdmin.alerts.fetchApplicantsFailed'));
    } finally {
        setLoadingApplicants(false);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">{t('jobPostingAdmin.create.title')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.postingTitle')}</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
                <label htmlFor="tournamentId" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.tournament')}</label>
                <select name="tournamentId" id="tournamentId" value={formData.tournamentId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="" disabled>{t('jobPostingAdmin.create.selectTournament')}</option>
                    {tournaments?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.type', '고용 형태')}</label>
                <select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="지원">{t('jobPostingAdmin.create.typeApplication', '지원')}</option>
                    <option value="고정">{t('jobPostingAdmin.create.typeFixed', '고정')}</option>
                </select>
            </div>
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.role')}</label>
                <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="dealer">{t('jobPostingAdmin.create.dealer')}</option>
                    <option value="floor">{t('jobPostingAdmin.create.floor')}</option>
                    <option value="registration">{t('jobPostingAdmin.create.registration')}</option>
                </select>
            </div>
            <div>
                <label htmlFor="requiredCount" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.staffNeeded')}</label>
                <input type="number" name="requiredCount" id="requiredCount" min="1" value={formData.requiredCount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.description')}</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
                {isSubmitting ? t('jobPostingAdmin.create.submitting') : t('jobPostingAdmin.create.button')}
            </button>
        </form>
      </div>
      
      <div>
        <h1 className="text-2xl font-bold mb-4">{t('jobPostingAdmin.manage.title')}</h1>
        <div className="space-y-4">
            {loading && <p>{t('jobPostingAdmin.manage.loading')}</p>}
            {jobPostings?.map((post: any) => (
                <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold">{post.title}</h2>
                            <p className="text-sm text-gray-600">{t('jobPostingAdmin.manage.roleInfo', { role: post.role, required: post.requiredCount })}</p>
                            <p className="text-sm text-gray-500">{t('jobPostingAdmin.manage.type')}: {post.type === '지원' ? t('jobPostingAdmin.manage.typeApplication') : t('jobPostingAdmin.manage.typeFixed')}</p>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {post.status}
                            </span>
                        </div>
                        <div className='flex items-center'>
                            <button
                                onClick={() => handleViewApplicants(post.id)}
                                className="mr-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                                {t('jobPostingAdmin.manage.viewApplicants')}
                            </button>
                            <button
                                onClick={() => handleOpenEditModal(post)}
                                className="mr-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                            >
                                {t('jobPostingAdmin.manage.edit')}
                            </button>
                             <button
                                onClick={() => handleDelete(post.id)}
                                className="mr-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                {t('jobPostingAdmin.manage.delete', '삭제')}
                            </button>
                            <button 
                                onClick={() => handleAutoMatch(post.id)}
                                disabled={post.status !== 'open' || isMatching === post.id}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {isMatching === post.id ? t('jobPostingAdmin.manage.matching') : t('jobPostingAdmin.manage.button')}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

        {isEditModalOpen && currentPost && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('jobPostingAdmin.edit.title')}</h3>
                    <form onSubmit={handleUpdatePost} className="space-y-4">
                        <div>
                            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.postingTitle')}</label>
                            <input type="text" name="title" id="edit-title" value={currentPost.title} onChange={(e) => setCurrentPost({...currentPost, title: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.type', '고용 형태')}</label>
                            <select name="type" id="edit-type" value={currentPost.type} onChange={(e) => setCurrentPost({...currentPost, type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="지원">{t('jobPostingAdmin.edit.typeApplication', '지원')}</option>
                                <option value="고정">{t('jobPostingAdmin.edit.typeFixed', '고정')}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.role')}</label>
                            <select name="role" id="edit-role" value={currentPost.role} onChange={(e) => setCurrentPost({...currentPost, role: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="dealer">{t('jobPostingAdmin.edit.dealer')}</option>
                                <option value="floor">{t('jobPostingAdmin.edit.floor')}</option>
                                <option value="registration">{t('jobPostingAdmin.edit.registration')}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="edit-requiredCount" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.staffNeeded')}</label>
                            <input type="number" name="requiredCount" id="edit-requiredCount" min="1" value={currentPost.requiredCount} onChange={(e) => setCurrentPost({...currentPost, requiredCount: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.description')}</label>
                            <textarea name="description" id="edit-description" value={currentPost.description} onChange={(e) => setCurrentPost({...currentPost, description: e.target.value})} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.status')}</label>
                            <select name="status" id="edit-status" value={currentPost.status} onChange={(e) => setCurrentPost({...currentPost, status: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="open">{t('jobPostingAdmin.edit.statusOpen')}</option>
                                <option value="closed">{t('jobPostingAdmin.edit.statusClosed')}</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-700">{t('jobPostingAdmin.edit.cancel')}</button>
                            <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700">{t('jobPostingAdmin.edit.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {isApplicantsModalOpen && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('jobPostingAdmin.applicants.title')}</h3>
                    {loadingApplicants ? (
                        <p>{t('jobPostingAdmin.applicants.loading')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {applicants.length > 0 ? applicants.map(applicant => (
                                <li key={applicant.id} className="p-2 border rounded-md">
                                    {applicant.applicantName}
                                </li>
                            )) : <p>{t('jobPostingAdmin.applicants.none')}</p>}
                        </ul>
                    )}
                    <div className="flex justify-end mt-4">
                        <button onClick={() => setIsApplicantsModalOpen(false)} className="py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-700">{t('jobPostingAdmin.applicants.close')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default JobPostingAdminPage;
