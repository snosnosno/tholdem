import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from 'react-firebase-hooks/firestore';
import { DashboardCard } from '../components/DashboardCard';
import { FaUsers, FaBriefcase } from 'react-icons/fa';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';


const StaffingDashboardPage = () => {
    const { isAdmin } = useAuth();

    const [eventsSnapshot, loadingEvents, errorEvents] = useCollection(
        query(collection(db, 'events'), orderBy('startDate', 'desc'), limit(5))
    );

    const [staffSnapshot, loadingStaff, errorStaff] = useCollection(
        collection(db, 'users')
    );

    const totalStaff = staffSnapshot?.docs.length || 0;
    const activeEvents = eventsSnapshot?.docs.filter(doc => doc.data().status !== 'Completed').length || 0;

    if (!isAdmin) {
        return <p>You do not have access to this page.</p>;
    }


    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Staffing Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Total Staff" icon={<FaUsers className="text-blue-500" />}>
                    <p className="text-4xl font-bold">{loadingStaff ? '...' : totalStaff}</p>
                </DashboardCard>
                <DashboardCard title="Active Events" icon={<FaBriefcase className="text-purple-500" />}>
                    <p className="text-4xl font-bold">{loadingEvents ? '...' : activeEvents}</p>
                </DashboardCard>
                
                 <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center">
                    <h3 className="font-bold text-lg mb-2">Quick Actions</h3>
                    <div className="flex flex-col space-y-2 w-full">
                        <Link to="/admin/staff/new" className="btn btn-primary w-full">Add New Staff</Link>
                        <Link to="/admin/events/new" className="btn btn-secondary w-full">Create New Event</Link>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Recent Events</h2>
                <div className="bg-white p-4 rounded-lg shadow-md">
                    {loadingEvents && <p>Loading events...</p>}
                    {errorEvents && <p className="text-red-500">Error loading events.</p>}
                    <ul className="space-y-3">
                        {eventsSnapshot?.docs.map(doc => (
                            <li key={doc.id} className="border-b last:border-b-0 pb-2">
                                <Link to={`/admin/events/${doc.id}`} className="font-semibold text-blue-600 hover:underline">
                                    {doc.data().name}
                                </Link>
                                <p className="text-sm text-gray-500">
                                    {new Date(doc.data().startDate.seconds * 1000).toLocaleDateString()}
                                    - Status: {doc.data().status}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default StaffingDashboardPage;
