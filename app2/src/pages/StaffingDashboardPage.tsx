import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../hooks/useFirestore';
import DashboardCard from '../components/DashboardCard';
import { FaUsers, FaBriefcase, FaFileSignature, FaCalendarCheck } from 'react-icons/fa';

const StaffingDashboardPage = () => {
  const { isAdmin } = useAuth();
  
  const { documents: staffProfiles, loading: loadingStaff } = useCollection('staffProfiles');
  const { documents: jobPostings, loading: loadingJobs } = useCollection('jobPostings');
  const { documents: applications, loading: loadingApps } = useCollection('applications', {
    orderBy: [['createdAt', 'desc']],
    limit: 5
  });
  const { documents: schedules, loading: loadingSchedules } = useCollection('schedules', {
    orderBy: [['createdAt', 'desc']],
    limit: 5
  });

  const metrics = useMemo(() => {
    if (!staffProfiles || !jobPostings) return null;
    return {
      totalStaff: staffProfiles.length,
      openJobs: jobPostings.filter(job => job.status === 'open').length,
      // More metrics can be added here
    };
  }, [staffProfiles, jobPostings]);

  if (!isAdmin) {
    return (
      <div className="text-center text-red-500">
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const isLoading = loadingStaff || loadingJobs || loadingApps || loadingSchedules;

  if (isLoading) {
    return <div>Loading Dashboard...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Staffing Dashboard</h1>
      
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <DashboardCard title="Total Staff">
          <div className="flex items-center">
            <FaUsers className="text-3xl text-blue-500 mr-4" />
            <span className="text-4xl font-bold">{metrics?.totalStaff}</span>
          </div>
        </DashboardCard>
        <DashboardCard title="Open Job Postings">
          <div className="flex items-center">
            <FaBriefcase className="text-3xl text-green-500 mr-4" />
            <span className="text-4xl font-bold">{metrics?.openJobs}</span>
          </div>
        </DashboardCard>
        {/* Add more metric cards here */}
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Recent Applications">
          <ul>
            {applications && applications.length > 0 ? (
              applications.map(app => (
                <li key={app.id} className="border-b last:border-b-0 py-2">
                  <p className="font-semibold">{app.applicantName || 'Unknown Applicant'}</p>
                  <p className="text-sm text-gray-500">Applied for: {app.postTitle || 'N/A'}</p>
                  <p className="text-sm capitalize">Status: <span className={`font-medium ${app.status === 'approved' ? 'text-green-600' : app.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{app.status}</span></p>
                </li>
              ))
            ) : (
              <p>No recent applications.</p>
            )}
          </ul>
        </DashboardCard>

        <DashboardCard title="Upcoming Schedules">
          <ul>
            {schedules && schedules.length > 0 ? (
              schedules.map(schedule => (
                <li key={schedule.id} className="border-b last:border-b-0 py-2">
                  <p className="font-semibold">{schedule.staffName || 'Unknown Staff'}</p>
                  <p className="text-sm text-gray-500">Tournament: {schedule.tournamentName}</p>
                  <p className="text-sm">Role: {schedule.role}</p>
                </li>
              ))
            ) : (
              <p>No upcoming schedules.</p>
            )}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
};

export default StaffingDashboardPage;
