import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { StarIcon } from '@heroicons/react/24/solid';

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  role: string;
  experience: string;
  hourlyRate: number;
  rating?: number;
  ratingCount?: number;
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
    const { currentUser } = useAuth();
    const profileRef = currentUser ? doc(db, 'users', currentUser.uid) : null;
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [errorProfile, setErrorProfile] = useState<Error | null>(null);

    const [formData, setFormData] = useState<Partial<ProfileData>>({});
    const [isEditing, setIsEditing] = useState(false);
    
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loadingPayrolls, setLoadingPayrolls] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!profileRef) return;
            try {
                const docSnap = await getDoc(profileRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as ProfileData;
                    setProfile(data);
                    setFormData(data);
                } else {
                    console.log("No profile document found for current user.");
                }
            } catch (err: any) {
                setErrorProfile(err);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [profileRef]);
    
    useEffect(() => {
        const fetchPayrolls = async () => {
            if (!currentUser) {
                setLoadingPayrolls(false);
                return;
            }
            try {
                const functions = getFunctions();
                const getPayrolls = httpsCallable(functions, 'getPayrolls');
                const result: any = await getPayrolls();
                
                // Safely access payrolls, default to empty array if not present
                const payrollData = result.data?.payrolls || [];

                const payrollsWithEventNames = await Promise.all(
                    payrollData.map(async (p: Payroll) => {
                        if (!p.eventId) {
                            return { ...p, eventName: 'Event ID Missing' };
                        }
                        const eventDoc = await getDoc(doc(db, 'events', p.eventId));
                        // Use event's "title" field as per Event interface
                        return { ...p, eventName: eventDoc.data()?.title || 'Unknown Event' };
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
    }, [currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'hourlyRate' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileRef) {
            alert("You must be logged in to update your profile.");
            return;
        }
        try {
            await setDoc(profileRef, { ...formData, updatedAt: new Date() }, { merge: true });
            
            const updatedDoc = await getDoc(profileRef);
            if(updatedDoc.exists()) {
                setProfile(updatedDoc.data() as ProfileData);
            }

            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (err: any) {
            console.error("Error updating profile:", err);
            alert(`Failed to update profile: ${err.message}`);
        }
    };

    if (loadingProfile) return <div className="p-6 text-center">Loading profile...</div>;
    if (errorProfile) return <div className="p-6 text-center text-red-500">Error: {errorProfile.message}</div>;
    if (!currentUser || !profile) return <div className="p-6 text-center">Please log in to view your profile.</div>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Profile Section */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start">
                        <div className="md:ml-6 flex-1">
                            <h1 className="text-3xl font-bold text-gray-800">{profile.name}</h1>
                            <p className="text-md text-gray-500 capitalize">{profile.role}</p>
                            
                            <div className="flex items-center mt-2">
                                <StarIcon className="h-6 w-6 text-yellow-400 mr-1" />
                                <span className="text-lg font-semibold text-gray-700">{profile.rating?.toFixed(1) || 'N/A'}</span>
                                <span className="text-sm text-gray-500 ml-2">({profile.ratingCount || 0} ratings)</span>
                            </div>
                        </div>
                        <button onClick={() => setIsEditing(!isEditing)} className="mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    </div>

                    {!isEditing ? (
                        <div className="mt-6 border-t pt-6">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">Profile Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <p><strong>Email:</strong> {profile.email}</p>
                                <p><strong>Phone:</strong> {profile.phone || 'Not provided'}</p>
                                <p><strong>Experience:</strong> {profile.experience || 'Not provided'}</p>
                                <p><strong>Hourly Rate:</strong> ${profile.hourlyRate || '0'}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-6 border-t pt-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-700">Edit Details</h2>
                            {/* Form fields... */}
                            <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                Save Changes
                            </button>
                        </form>
                    )}
                </div>

                {/* Payroll History Section */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Payroll History</h2>
                    {loadingPayrolls ? (
                        <p>Loading payroll history...</p>
                    ) : payrolls.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                {/* Table Head */}
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                {/* Table Body */}
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payrolls.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{p.eventName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(p.calculationDate.toDate()).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{p.workDurationInHours.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">${p.calculatedPay.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500">No payroll history found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
