import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, documentId } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface StaffData {
  id: string; 
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  timeSlot?: string;
  postingId: string;
  postingTitle: string;
}

interface JobPosting {
  id: string;
  title: string;
  confirmedStaff?: { userId: string; role: string; timeSlot: string; }[];
  managerId?: string;
}

type SortKey = keyof StaffData;

const StaffListPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  const [staffData, setStaffData] = useState<StaffData[]>([]);
  const [jobPostings, setJobPostings] = useState<Pick<JobPosting, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPostId, setFilterPostId] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchManagerStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const postingsQuery = query(collection(db, 'jobPostings'), where('managerId', '==', currentUser.uid));
        const postingsSnapshot = await getDocs(postingsQuery);
        
        if (postingsSnapshot.empty) {
            setStaffData([]);
            setJobPostings([]);
            setLoading(false);
            return;
        }

        const postingsData: JobPosting[] = postingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting));

        setJobPostings(postingsData.map(({ id, title }) => ({ id, title })));

        const postingsWithStaff = postingsData.filter(p => p.confirmedStaff && p.confirmedStaff.length > 0);

        if (postingsWithStaff.length === 0) {
            setStaffData([]);
            setLoading(false);
            return;
        }

        const allUserIds = Array.from(new Set(postingsWithStaff.flatMap(p => p.confirmedStaff!.map(s => s.userId))));
        
        let usersMap = new Map<string, any>();
        if (allUserIds.length > 0) {
          const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', allUserIds));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()));
        }

        const combinedData: StaffData[] = postingsWithStaff.flatMap(posting => 
          posting.confirmedStaff!.map((staff, index) => {
            const userDetails = usersMap.get(staff.userId);
            return {
              id: `${posting.id}-${staff.userId}-${index}`,
              userId: staff.userId,
              name: userDetails?.name || t('staffListPage.unknownUser'),
              email: userDetails?.email,
              phone: userDetails?.phone,
              role: staff.role,
              timeSlot: staff.timeSlot,
              postingId: posting.id,
              postingTitle: posting.title,
            };
          })
        );
        
        setStaffData(combinedData);
      } catch (e) {
        console.error("Error fetching staff data: ", e);
        setError(t('staffListPage.fetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchManagerStaff();
  }, [currentUser, t]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedStaff = useMemo(() => {
    let sortableItems = [...staffData];

    if (filterPostId) {
      sortableItems = sortableItems.filter(staff => staff.postingId === filterPostId);
    }

    if (searchTerm) {
      sortableItems = sortableItems.filter(staff =>
        staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        const aValExists = aValue !== null && aValue !== undefined;
        const bValExists = bValue !== null && bValue !== undefined;
      
        if (!aValExists) return 1;
        if (!bValExists) return -1;
      
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        
        return 0;
      });
    }

    return sortableItems;
  }, [staffData, searchTerm, filterPostId, sortConfig]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="text-xl font-semibold">{t('loading')}</div></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  const SortableHeader = ({ sortKey, label }: { sortKey: SortKey, label: string }) => (
    <th 
      scope="col" 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
      onClick={() => requestSort(sortKey)}
    >
      {label}
      {sortConfig?.key === sortKey && (
        <span>{sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}</span>
      )}
    </th>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{t('staffListPage.title')}</h1>

      <div className="mb-4 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <input
          type="text"
          placeholder={t('participants.searchPlaceholder')}
          className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
          value={filterPostId}
          onChange={(e) => setFilterPostId(e.target.value)}
        >
          <option value="">{t('jobPostingAdmin.manage.title')} ({t('common.all', 'All')})</option>
          {jobPostings.map(post => (
            <option key={post.id} value={post.id}>{post.title}</option>
          ))}
        </select>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader sortKey="postingTitle" label={t('jobPostingAdmin.manage.title')} />
                <SortableHeader sortKey="name" label={t('staffNew.labelName')} />
                <SortableHeader sortKey="email" label={t('staffNew.labelEmail')} />
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('signUp.phoneLabel')}</th>
                <SortableHeader sortKey="role" label={t('jobPostingAdmin.create.roleName')} />
                <SortableHeader sortKey="timeSlot" label={t('jobPostingAdmin.create.time')} />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedStaff.length > 0 ? filteredAndSortedStaff.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.postingTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.timeSlot}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('staffListPage.noConfirmedStaff')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffListPage;
