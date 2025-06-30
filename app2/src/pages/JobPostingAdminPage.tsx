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

interface RoleRequirement {
    name: string;
    count: number;
}

const JobPostingAdminPage = () => {
  const { t } = useTranslation();
  const tournamentsQuery = useMemo(() => query(collection(db, 'tournaments')), []);
  const jobPostingsQuery = useMemo(() => query(collection(db, 'jobPostings')), []);
  
  const [tournamentsSnap] = useCollection(tournamentsQuery);
  const [jobPostingsSnap, loading] = useCollection(jobPostingsQuery);
  
  const tournaments = useMemo(() => tournamentsSnap?.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)), [tournamentsSnap]);
  const jobPostings = useMemo(() => jobPostingsSnap?.docs.map(d => ({ id: d.id, ...d.data() })), [jobPostingsSnap]);

  const initialRole = { name: 'dealer', count: 1 };
  const [formData, setFormData] = useState({
    title: '',
    tournamentId: '',
    roles: [initialRole],
    type: '지원',
    description: '',
    status: 'open',
    location: '',
    date: '',
    time: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [isMatching, setIsMatching] = useState<string | null>(null);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const predefinedRoles = ['dealer', 'floor', 'registration', 'serving'];

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (index: number, field: 'name' | 'count', value: string | number) => {
    const newRoles = [...formData.roles];
    const roleValue = field === 'count' ? (Number(value) < 1 ? 1 : Number(value)) : value;
    newRoles[index] = { ...newRoles[index], [field]: roleValue };
    setFormData(prev => ({ ...prev, roles: newRoles }));
  };

  const addRole = () => {
    setFormData(prev => ({...prev, roles: [...prev.roles, { name: '', count: 1 }]}));
  };

  const removeRole = (index: number) => {
    const newRoles = formData.roles.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, roles: newRoles }));
  };

  const handleEditRoleChange = (index: number, field: 'name' | 'count', value: string | number) => {
    const newRoles = [...currentPost.roles];
    const roleValue = field === 'count' ? (Number(value) < 1 ? 1 : Number(value)) : value;
    newRoles[index] = { ...newRoles[index], [field]: roleValue };
    setCurrentPost((prev: any) => ({ ...prev, roles: newRoles }));
  };

  const addEditRole = () => {
    setCurrentPost((prev: any) => ({...prev, roles: [...prev.roles, { name: '', count: 1 }]}));
  };

  const removeEditRole = (index: number) => {
    const newRoles = currentPost.roles.filter((_: any, i: number) => i !== index);
    setCurrentPost((prev: any) => ({ ...prev, roles: newRoles }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tournamentId) {
        alert(t('jobPostingAdmin.alerts.selectTournament'));
        return;
    }
     if (formData.roles.some(role => !role.name || role.count < 1)) {
      alert(t('jobPostingAdmin.alerts.invalidRoleInfo'));
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'jobPostings'), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      alert(t('jobPostingAdmin.alerts.createSuccess'));
      setFormData({
        title: '',
        tournamentId: '',
        roles: [initialRole],
        type: '지원',
        description: '',
        status: 'open',
        location: '',
        date: '',
        time: ''
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
    setCurrentPost({
        ...post,
        roles: post.roles && post.roles.length > 0 ? post.roles : [initialRole],
        date: post.date || '',
        time: post.time || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost) return;
    if (currentPost.roles.some((role: RoleRequirement) => !role.name || role.count < 1)) {
      alert(t('jobPostingAdmin.alerts.invalidRoleInfo'));
      return;
    }
    
    const postRef = doc(db, 'jobPostings', currentPost.id);
    try {
      const { id, ...postData } = currentPost;
      await updateDoc(postRef, postData);
      alert(t('jobPostingAdmin.alerts.updateSuccess'));
      setIsEditModalOpen(false);
      setCurrentPost(null);
    } catch (error) {
      console.error("Error updating job posting: ", error);
      alert(t('jobPostingAdmin.alerts.updateFailed'));
    }
  };
  
  const handleDelete = async (postId: string) => {
    if (window.confirm(t('jobPostingAdmin.alerts.confirmDelete'))) {
        try {
            await deleteDoc(doc(db, 'jobPostings', postId));
            alert(t('jobPostingAdmin.alerts.deleteSuccess'));
        } catch (error) {
            console.error("Error deleting job posting: ", error);
            alert(t('jobPostingAdmin.alerts.deleteFailed'));
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
                <input type="text" name="title" id="title" value={formData.title} onChange={handleFormChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
                <label htmlFor="tournamentId" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.tournament')}</label>
                <select name="tournamentId" id="tournamentId" value={formData.tournamentId} onChange={handleFormChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="" disabled>{t('jobPostingAdmin.create.selectTournament')}</option>
                    {tournaments?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.location')}</label>
                    <input type="text" name="location" id="location" value={formData.location} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.date')}</label>
                    <input type="date" name="date" id="date" value={formData.date} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.time')}</label>
                    <input type="time" name="time" id="time" value={formData.time} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
            </div>
             <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.type')}</label>
                <select name="type" id="type" value={formData.type} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="지원">{t('jobPostingAdmin.create.typeApplication')}</option>
                    <option value="고정">{t('jobPostingAdmin.create.typeFixed')}</option>
                </select>
            </div>
            
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.rolesAndCounts')}</label>
                {formData.roles.map((role, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1">
                            <label htmlFor={`role-name-${index}`} className="sr-only">{t('jobPostingAdmin.create.roleName')}</label>
                            <input
                                type="text"
                                id={`role-name-${index}`}
                                value={role.name}
                                onChange={(e) => handleRoleChange(index, 'name', e.target.value)}
                                placeholder={t('jobPostingAdmin.create.roleNamePlaceholder')}
                                list="predefined-roles"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                required
                            />
                             <datalist id="predefined-roles">
                                {predefinedRoles.map(r => <option key={r} value={r}>{t(`jobPostingAdmin.create.${r}`)}</option>)}
                            </datalist>
                        </div>
                        <div className="w-24">
                            <label htmlFor={`role-count-${index}`} className="sr-only">{t('jobPostingAdmin.create.staffNeeded')}</label>
                            <input
                                type="number"
                                id={`role-count-${index}`}
                                value={role.count}
                                min="1"
                                onChange={(e) => handleRoleChange(index, 'count', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                required
                            />
                        </div>
                        {formData.roles.length > 1 && (
                            <button type="button" onClick={() => removeRole(index)} className="text-red-600 hover:text-red-800">
                                {t('jobPostingAdmin.create.remove')}
                            </button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={addRole} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    + {t('jobPostingAdmin.create.addRole')}
                </button>
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.create.description')}</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleFormChange} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
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
                            <div className="text-sm text-gray-600">
                                {post.roles && post.roles.map((r: RoleRequirement, i: number) => (
                                    <span key={i} className="mr-4">{t(`jobPostingAdmin.create.${r.name}`, r.name)}: {r.count}{t('jobPostingAdmin.manage.people')}</span>
                                ))}
                            </div>
                            <p className="text-sm text-gray-500">{t('jobPostingAdmin.manage.type')}: {post.type === '지원' ? t('jobPostingAdmin.manage.typeApplication') : t('jobPostingAdmin.manage.typeFixed')}</p>
                            {(post.location || post.date || post.time) && (
                                <p className="text-sm text-gray-500">
                                    {post.location && <span>{t('jobPostingAdmin.manage.location')}: {post.location}</span>}
                                    {post.date && <span className="ml-2">{t('jobPostingAdmin.manage.date')}: {post.date}</span>}
                                    {post.time && <span className="ml-2">{t('jobPostingAdmin.manage.time')}: {post.time}</span>}
                                </p>
                            )}
                            <span className={`mt-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {post.status}
                            </span>
                        </div>
                        <div className='flex items-center flex-wrap justify-end'>
                            <button
                                onClick={() => handleViewApplicants(post.id)}
                                className="m-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                                {t('jobPostingAdmin.manage.viewApplicants')}
                            </button>
                            <button
                                onClick={() => handleOpenEditModal(post)}
                                className="m-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                            >
                                {t('jobPostingAdmin.manage.edit')}
                            </button>
                             <button
                                onClick={() => handleDelete(post.id)}
                                className="m-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                {t('jobPostingAdmin.manage.delete')}
                            </button>
                            <button 
                                onClick={() => handleAutoMatch(post.id)}
                                disabled={post.status !== 'open' || isMatching === post.id}
                                className="m-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
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
                <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('jobPostingAdmin.edit.title')}</h3>
                    <form onSubmit={handleUpdatePost} className="space-y-4">
                        <div>
                            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.postingTitle')}</label>
                            <input type="text" id="edit-title" value={currentPost.title} onChange={(e) => setCurrentPost({...currentPost, title: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.location')}</label>
                                <input type="text" id="edit-location" value={currentPost.location} onChange={(e) => setCurrentPost({...currentPost, location: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.date')}</label>
                                <input type="date" id="edit-date" value={currentPost.date} onChange={(e) => setCurrentPost({...currentPost, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label htmlFor="edit-time" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.time')}</label>
                                <input type="time" id="edit-time" value={currentPost.time} onChange={(e) => setCurrentPost({...currentPost, time: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.type')}</label>
                            <select id="edit-type" value={currentPost.type} onChange={(e) => setCurrentPost({...currentPost, type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="지원">{t('jobPostingAdmin.edit.typeApplication')}</option>
                                <option value="고정">{t('jobPostingAdmin.edit.typeFixed')}</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.rolesAndCounts')}</label>
                            {currentPost.roles.map((role: RoleRequirement, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <div className="flex-1">
                                         <label htmlFor={`edit-role-name-${index}`} className="sr-only">{t('jobPostingAdmin.edit.roleName')}</label>
                                         <input
                                            type="text"
                                            id={`edit-role-name-${index}`}
                                            value={role.name}
                                            onChange={(e) => handleEditRoleChange(index, 'name', e.target.value)}
                                            placeholder={t('jobPostingAdmin.edit.roleNamePlaceholder')}
                                            list="predefined-roles-edit"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                            required
                                        />
                                        <datalist id="predefined-roles-edit">
                                            {predefinedRoles.map(r => <option key={r} value={r}>{t(`jobPostingAdmin.edit.${r}`)}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="w-24">
                                        <label htmlFor={`edit-role-count-${index}`} className="sr-only">{t('jobPostingAdmin.edit.staffNeeded')}</label>
                                        <input
                                            type="number"
                                            id={`edit-role-count-${index}`}
                                            value={role.count}
                                            min="1"
                                            onChange={(e) => handleEditRoleChange(index, 'count', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                            required
                                        />
                                    </div>
                                    {currentPost.roles.length > 1 && (
                                        <button type="button" onClick={() => removeEditRole(index)} className="text-red-600 hover:text-red-800">
                                            {t('jobPostingAdmin.edit.remove')}
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addEditRole} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                                + {t('jobPostingAdmin.edit.addRole')}
                            </button>
                        </div>
                        
                        <div>
                            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.description')}</label>
                            <textarea id="edit-description" value={currentPost.description} onChange={(e) => setCurrentPost({...currentPost, description: e.target.value})} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">{t('jobPostingAdmin.edit.status')}</label>
                            <select id="edit-status" value={currentPost.status} onChange={(e) => setCurrentPost({...currentPost, status: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
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
