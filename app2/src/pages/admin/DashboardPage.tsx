import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase'; // Import auth
import { DashboardCard } from '../../components/DashboardCard';
import { StarIcon } from '@heroicons/react/24/solid';

interface DashboardStats {
  ongoingEventsCount: number;
  totalDealersCount: number;
  topRatedDealers: {
    id: string;
    name: string;
    rating: number;
    ratingCount: number;
  }[];
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("Authentication required. Please sign in.");
        }

        const idToken = await user.getIdToken();

        // The exact URL of your deployed HTTP function
        const functionUrl = 'https://us-central1-tholdem-ebc18.cloudfunctions.net/getDashboardStats';
        
        const response = await fetch(functionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Use the error message from the backend if available
          throw new Error(errorData?.data?.error || `Request failed with status ${response.status}`);
        }

        const result = await response.json();
        setStats(result.data);

      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-6 text-center font-semibold">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <DashboardCard title="Ongoing Events">
          <p className="text-5xl font-bold text-blue-600">{stats?.ongoingEventsCount ?? '0'}</p>
        </DashboardCard>

        <DashboardCard title="Total Dealers">
          <p className="text-5xl font-bold text-green-600">{stats?.totalDealersCount ?? '0'}</p>
        </DashboardCard>

        <DashboardCard title="Quick Links">
            <div className="flex flex-col space-y-2">
                <a href="/admin/events" className="text-blue-500 hover:underline">Manage Events</a>
                <a href="/admin/staff" className="text-blue-500 hover:underline">Manage Staff</a>
                <a href="/admin/payroll" className="text-blue-500 hover:underline">Process Payroll</a>
            </div>
        </DashboardCard>
        
        <div className="md:col-span-2 lg:col-span-3">
            <DashboardCard title="Top Rated Dealers">
                <ul className="space-y-3">
                {stats?.topRatedDealers && stats.topRatedDealers.length > 0 ? (
                    stats.topRatedDealers.map((dealer) => (
                    <li key={dealer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold text-gray-700">{dealer.name}</span>
                        <div className="flex items-center space-x-2">
                            <span className="font-bold text-yellow-500">{dealer.rating.toFixed(1)}</span>
                            <StarIcon className="h-5 w-5 text-yellow-400" />
                            <span className="text-sm text-gray-500">({dealer.ratingCount} ratings)</span>
                        </div>
                    </li>
                    ))
                ) : (
                    <p className="text-gray-500">No dealer ratings available yet.</p>
                )}
                </ul>
          </DashboardCard>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
