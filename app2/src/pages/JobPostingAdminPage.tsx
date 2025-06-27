import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useTranslation } from 'react-i18next';

interface Tournament {
    id: string;
    name: string;
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
    requiredCount: 1,
    description: '',
    status: 'open',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatching, setIsMatching] = useState<string | null>(null);

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
  }

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
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {post.status}
                            </span>
                        </div>
                        <button 
                            onClick={() => handleAutoMatch(post.id)}
                            disabled={post.status !== 'open' || isMatching === post.id}
                            className="ml-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {isMatching === post.id ? t('jobPostingAdmin.manage.matching') : t('jobPostingAdmin.manage.button')}
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default JobPostingAdminPage;
