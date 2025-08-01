import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth pages - load immediately for better UX
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

import FirebaseErrorBoundary from './components/FirebaseErrorBoundary';
import { Layout } from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import { ToastContainer } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
// Zustand 마이그레이션: Context 대신 Adapter 사용
import { TournamentProvider } from './contexts/TournamentContextAdapter';
import { firebaseConnectionManager } from './utils/firebaseConnectionManager';
import { performanceMonitor } from './utils/performanceMonitor';

// Lazy load admin pages
const ApprovalPage = lazy(() => import('./pages/admin/Approval'));
const CEODashboard = lazy(() => import('./pages/admin/CEODashboard'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const PayrollAdminPage = lazy(() => import('./pages/admin/PayrollAdminPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));

// Lazy load main pages
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AvailableTimesPage = lazy(() => import('./pages/AvailableTimesPage'));
const BlindsPage = lazy(() => import('./pages/BlindsPage'));
const HistoryDetailPage = lazy(() => import('./pages/HistoryDetailPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const JobBoardPage = lazy(() => import('./pages/JobBoardPage'));
const JobPostingAdminPage = lazy(() => import('./pages/JobPostingAdminPage'));
const JobPostingDetailPage = lazy(() => import('./pages/JobPostingDetailPage'));
const MySchedulePage = lazy(() => import('./pages/MySchedulePage'));
const ParticipantLivePage = lazy(() => import('./pages/ParticipantLivePage'));
const ParticipantsPage = lazy(() => import('./pages/ParticipantsPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const PrizesPage = lazy(() => import('./pages/PrizesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ShiftSchedulePage = lazy(() => import('./pages/ShiftSchedulePage'));
const StaffNewPage = lazy(() => import('./pages/StaffNewPage'));
const TablesPage = lazy(() => import('./pages/TablesPage'));
const PerformanceReport = lazy(() => import('./pages/PerformanceReport'));


// A component to handle role-based redirection
const HomeRedirect: React.FC = () => {
  const { isAdmin } = useAuth(); // isAdmin is kept for compatibility
  return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/profile" replace />;
};

// Create a client with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  // Firebase 자동 복구 활성화 및 성능 모니터링
  React.useEffect(() => {
    firebaseConnectionManager.enableAutoRecovery();
    
    // 성능 모니터링 시작
    performanceMonitor.measureWebVitals();
    performanceMonitor.measureMemory();
    
    // 페이지 로드 완료 후 번들 크기 분석
    window.addEventListener('load', () => {
      performanceMonitor.analyzeBundleSize();
    });
    
    return () => {
      performanceMonitor.cleanup();
    };
  }, []);

  return (
    <FirebaseErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <TournamentProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/live/:tournamentId" element={<Suspense fallback={<LoadingSpinner />}><ParticipantLivePage /></Suspense>} />
                
                {/* Authenticated Routes */}
                <Route element={<PrivateRoute />}>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomeRedirect />} />
                    <Route path="profile" element={<Suspense fallback={<LoadingSpinner />}><ProfilePage /></Suspense>} />
                    <Route path="profile/:userId" element={<Suspense fallback={<LoadingSpinner />}><ProfilePage /></Suspense>} />
                    <Route path="payroll" element={<Suspense fallback={<LoadingSpinner />}><PayrollPage /></Suspense>} />
                    <Route path="payroll/:userId" element={<Suspense fallback={<LoadingSpinner />}><PayrollPage /></Suspense>} />
                    
                    {/* Dealer facing routes */}
                    <Route path="jobs" element={<Suspense fallback={<LoadingSpinner />}><JobBoardPage /></Suspense>} />
                    <Route path="my-schedule" element={<Suspense fallback={<LoadingSpinner />}><MySchedulePage /></Suspense>} />
                    <Route path="attendance" element={<Suspense fallback={<LoadingSpinner />}><AttendancePage /></Suspense>} />
                    <Route path="available-times" element={<Suspense fallback={<LoadingSpinner />}><AvailableTimesPage /></Suspense>} />

                    {/* Admin & Manager Routes */}
                    <Route path="admin" element={<RoleBasedRoute allowedRoles={['admin', 'manager']} />}>
                      <Route path="dashboard" element={<Suspense fallback={<LoadingSpinner />}><DashboardPage /></Suspense>} />
                      <Route path="staff/new" element={<Suspense fallback={<LoadingSpinner />}><StaffNewPage /></Suspense>} />
                      <Route path="shift-schedule" element={<Suspense fallback={<LoadingSpinner />}><ShiftSchedulePage /></Suspense>} />
                      <Route path="payroll" element={<Suspense fallback={<LoadingSpinner />}><PayrollAdminPage /></Suspense>} />
                      <Route path="participants" element={<Suspense fallback={<LoadingSpinner />}><ParticipantsPage /></Suspense>} />
                      <Route path="tables" element={<Suspense fallback={<LoadingSpinner />}><TablesPage /></Suspense>} />
                      <Route path="blinds" element={<Suspense fallback={<LoadingSpinner />}><BlindsPage /></Suspense>} />
                      <Route path="prizes" element={<Suspense fallback={<LoadingSpinner />}><PrizesPage /></Suspense>} />
                      <Route path="announcements" element={<Suspense fallback={<LoadingSpinner />}><AnnouncementsPage /></Suspense>} />
                      <Route path="history" element={<Suspense fallback={<LoadingSpinner />}><HistoryPage /></Suspense>} />
                      <Route path="history/:logId" element={<Suspense fallback={<LoadingSpinner />}><HistoryDetailPage /></Suspense>} />
                    </Route>

                    {/* Job Posting Management - Admin, Manager, Staff with permission */}
                    <Route path="admin" element={<RoleBasedRoute allowedRoles={['admin', 'manager', 'staff']} />}>
                      <Route path="job-postings" element={<Suspense fallback={<LoadingSpinner />}><JobPostingAdminPage /></Suspense>} />
                      <Route path="job-posting/:id" element={<Suspense fallback={<LoadingSpinner />}><JobPostingDetailPage /></Suspense>} />
                    </Route>

                    {/* Admin Only Route */}
                    <Route path="admin" element={<RoleBasedRoute allowedRoles={['admin']} />}>
                        <Route path="ceo-dashboard" element={<Suspense fallback={<LoadingSpinner />}><CEODashboard /></Suspense>} />
                        <Route path="approvals" element={<Suspense fallback={<LoadingSpinner />}><ApprovalPage /></Suspense>} />
                        <Route path="user-management" element={<Suspense fallback={<LoadingSpinner />}><UserManagementPage /></Suspense>} />
                        <Route path="performance" element={<Suspense fallback={<LoadingSpinner />}><PerformanceReport /></Suspense>} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </TournamentProvider>
          </AuthProvider>
          <ToastContainer />
        </ToastProvider>
      </QueryClientProvider>
    </FirebaseErrorBoundary>
  );
}

export default App;