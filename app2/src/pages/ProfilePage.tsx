import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { StarIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../i18n-helpers';

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  role: string;
  experience: string;
  notes?: string;
  rating?: number;
  ratingCount?: number;
  nationality?: string;
  bankName?: string;
  bankAccount?: string;
  residentId?: string;
  gender?: string;
}

interface Payroll {
    id: string;
    eventId: string;
    eventName?: string;
    workDurationInHours: number;
    calculatedPay: number;
    status: string;
    calculationDate: { toDate: () => Date };
}

const ProfilePage = () => {
    const { t, i18n } = useTranslation();
    const { currentUser } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const profileId = userId || currentUser?.uid;

    const profileRef = profileId ? doc(db, 'users', profileId) : null;
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [errorProfile, setErrorProfile] = useState<Error | null>(null);

    const [formData, setFormData] = useState<Partial<ProfileData>>({});
    const [isEditing, setIsEditing] = useState(false);
    
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loadingPayrolls, setLoadingPayrolls] = useState(true);

    const isOwnProfile = !userId || (currentUser?.uid === userId);

    const experienceLevels = [
        "1년 미만",
        "1년",
        "2년",
        "3년",
        "4년",
        "5년 이상",
        "10년 이상"
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            if (!profileRef) {
                setLoadingProfile(false);
                return;
            }
            try {
                const docSnap = await getDoc(profileRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as ProfileData;
                    setProfile(data);
                } else {
                    console.log("No profile document found for the given user ID.");
                    setErrorProfile(new Error(t('profilePage.userNotFound')));
                }
            } catch (err: any) {
                setErrorProfile(err);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [profileRef, t]);
    
    useEffect(() => {
        if (!isOwnProfile) {
            setLoadingPayrolls(false);
            return;
        }

        const fetchPayrolls = async () => {
            if (!currentUser) {
                setLoadingPayrolls(false);
                return;
            }
            try {
                const functions = getFunctions();
                const getPayrolls = httpsCallable(functions, 'getPayrolls');
                const result: any = await getPayrolls();
                
                const payrollData = result.data?.payrolls || [];

                const payrollsWithEventNames = await Promise.all(
                    payrollData.map(async (p: Payroll) => {
                        if (!p.eventId) {
                            return { ...p, eventName: t('profilePage.eventIdMissing') };
                        }
                        const eventDoc = await getDoc(doc(db, 'events', p.eventId));
                        return { ...p, eventName: eventDoc.data()?.title || t('profilePage.unknownEvent') };
                    })
                );
                setPayrolls(payrollsWithEventNames);
            } catch (err) {
                console.error("Failed to fetch payrolls:", err);
            } finally {
                setLoadingPayrolls(false);
            }
        };

        fetchPayrolls();
    }, [currentUser, isOwnProfile, t]);

    const handleEditClick = () => {
        if (!isEditing) {
            setFormData(profile || {});
        }
        setIsEditing(!isEditing);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileRef) {
            alert(t('profilePage.loginRequired'));
            return;
        }
        try {
            const dataToSave = { ...formData };
            delete dataToSave.name; // 이름 필드 저장 제외
            delete dataToSave.gender; // 성별 필드 저장 제외

            await setDoc(profileRef, dataToSave, { merge: true });
            
            const updatedDoc = await getDoc(profileRef);
            if(updatedDoc.exists()) {
                setProfile(updatedDoc.data() as ProfileData);
            }

            setIsEditing(false);
            alert(t('profilePage.updateSuccess'));
        } catch (err: any) {
            console.error("Error updating profile:", err);
            alert(t('profilePage.updateFailed', { message: err.message }));
        }
    };

    if (loadingProfile) return <div className="p-6 text-center">{t('profilePage.loadingProfile')}</div>;
    if (errorProfile) return <div className="p-6 text-center text-red-500">{t('profilePage.error', { message: errorProfile.message })}</div>;
    if (!profile) return <div className="p-6 text-center">{t('profilePage.viewProfileLogin')}</div>;

    const genderDisplay = (genderKey: string | undefined) => {
        if (!genderKey) return t('profilePage.notProvided');
        return t(`gender.${genderKey.toLowerCase()}`, genderKey);
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Profile Section */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start">
                        <div className="md:ml-6 flex-1">
                            <h1 className="text-3xl font-bold text-gray-800">{profile.name}</h1>
                            
                            <div className="flex items-center mt-2">
                                <StarIcon className="h-6 w-6 text-yellow-400 mr-1" />
                                <span className="text-lg font-semibold text-gray-700">{profile.rating?.toFixed(1) || t('profilePage.notAvailable')}</span>
                                <span className="text-sm text-gray-500 ml-2">({profile.ratingCount || 0} {t('profilePage.ratings')})</span>
                            </div>
                        </div>
                        {isOwnProfile && (
                            <button onClick={handleEditClick} className="mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                {isEditing ? t('profilePage.cancel') : t('profilePage.editProfile')}
                            </button>
                        )}
                    </div>

                    {!isEditing || !isOwnProfile ? (
                        <div className="mt-6 border-t pt-6">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('profilePage.profileDetails', '상세 정보')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div>
                                    <p className="font-semibold text-gray-600">{t('profilePage.email')}</p>
                                    <p>{profile.email}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-600">{t('profilePage.phone')}</p>
                                    <p>{profile.phone || t('profilePage.notProvided')}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-600">{t('profilePage.nationality', '국적')}</p>
                                    <p>{profile.nationality || t('profilePage.notProvided')}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-600">{t('profilePage.gender')}</p>
                                    <p>{genderDisplay(profile.gender)}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-gray-600">{t('profilePage.experience', '이력')}</p>
                                    <p className="whitespace-pre-wrap">{profile.experience || t('profilePage.notProvided')}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-gray-600">{t('profilePage.notes', '기타 사항')}</p>
                                    <p>{profile.notes || t('profilePage.notProvided', '없음')}</p>
                                </div>
                                
                                {isOwnProfile && (
                                    <div className="md:col-span-2 mt-4 border-t pt-4">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('profilePage.privateInfo', '개인 정보')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                            <div>
                                                <p className="font-semibold text-gray-600">{t('profilePage.residentId')}</p>
                                                <p>{profile.residentId || t('profilePage.notProvided')}</p>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-600">{t('profilePage.bankName', '은행명')}</p>
                                                <p>{profile.bankName || t('profilePage.notProvided')}</p>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-600">{t('profilePage.bankAccount', '계좌번호')}</p>
                                                <p>{profile.bankAccount || t('profilePage.notProvided')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-6 border-t pt-6">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">{t('profilePage.editDetails')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('profilePage.name')}</label>
                                    <input type="text" name="name" id="name" value={formData.name || ''} readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100" />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t('profilePage.phone')}</label>
                                    <input type="text" name="phone" id="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">{t('profilePage.nationality', '국적')}</label>
                                    <input type="text" name="nationality" id="nationality" value={formData.nationality || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">{t('profilePage.gender')}</label>
                                    <input type="text" name="gender" id="gender" value={genderDisplay(formData.gender)} readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700">{t('profilePage.experience', '이력')}</label>
                                    <select
                                        name="experience"
                                        id="experience"
                                        value={formData.experience || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="">{t('profilePage.selectExperience', '경력을 선택하세요')}</option>
                                        {experienceLevels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">{t('profilePage.notes', '기타 사항')}</label>
                                    <textarea name="notes" id="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                                </div>
                                <div className="md:col-span-2 mt-4 border-t pt-4">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('profilePage.privateInfo', '개인 정보')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="residentId" className="block text-sm font-medium text-gray-700">{t('profilePage.residentId')}</label>
                                            <input type="text" name="residentId" id="residentId" value={formData.residentId || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">{t('profilePage.bankName', '은행명')}</label>
                                            <input type="text" name="bankName" id="bankName" value={formData.bankName || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">{t('profilePage.bankAccount', '계좌번호')}</label>
                                            <input type="text" name="bankAccount" id="bankAccount" value={formData.bankAccount || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    {t('profilePage.saveChanges')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {isOwnProfile && (
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">{t('profilePage.payrollHistory')}</h2>
                        {loadingPayrolls ? (
                            <p>{t('profilePage.loadingPayroll')}</p>
                        ) : payrolls.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.tableEvent')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.tableDate')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.tableHours')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.tablePay')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.tableStatus')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {payrolls.map(p => (
                                            <tr key={p.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{p.eventName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{formatDate(p.calculationDate.toDate(), i18n.language)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{p.workDurationInHours.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(p.calculatedPay, i18n.language === 'ko' ? 'KRW' : 'USD', i18n.language)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {p.status === 'paid' ? t('profilePage.statusPaid') : t('profilePage.statusPending')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('profilePage.noPayroll')}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
