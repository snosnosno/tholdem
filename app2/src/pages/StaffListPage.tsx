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
  gender?: string;
  age?: number;
  experience?: string;
  nationality?: string;
  history?: string;
  notes?: string;
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
  const [sortOption, setSortOption] = useState<string>(''); // 새로운 정렬 옵션 state
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  
  // 편집 기능 관련 states
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: keyof StaffData } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [tempStaffData, setTempStaffData] = useState<StaffData[]>([]);

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
              gender: userDetails?.gender,
              age: userDetails?.age,
              experience: userDetails?.experience,
              nationality: userDetails?.nationality,
              history: userDetails?.history,
              notes: userDetails?.notes,
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
  
  // 편집 기능 핸들러
  const handleCellClick = (rowId: string, field: keyof StaffData, currentValue: any) => {
    // 편집 불가능한 필드 제외
    const readOnlyFields: (keyof StaffData)[] = ['id', 'userId', 'postingId', 'postingTitle'];
    if (readOnlyFields.includes(field)) return;
    
    setEditingCell({ rowId, field });
    setEditingValue(String(currentValue || ''));
  };
  
  const handleCellSave = async () => {
    if (!editingCell) return;
    
    const { rowId, field } = editingCell;
    
    // 임시 데이터 업데이트
    setStaffData(prevData => 
      prevData.map(staff => 
        staff.id === rowId 
          ? { ...staff, [field]: field === 'age' ? Number(editingValue) || 0 : editingValue }
          : staff
      )
    );
    
    // 여기에 Firebase 업데이트 로직 추가 가능
    // TODO: Firebase users 컶렉션 업데이트
    
    setEditingCell(null);
    setEditingValue('');
  };
  
  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue('');
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };
  
  // 새 행 추가 기능
  const addNewRow = () => {
    const newStaff: StaffData = {
      id: `temp-${Date.now()}`,
      userId: `temp-user-${Date.now()}`,
      name: '',
      email: '',
      phone: '',
      role: '',
      gender: '',
      age: 0,
      experience: '',
      nationality: '',
      history: '',
      notes: '',
      postingId: jobPostings[0]?.id || '',
      postingTitle: jobPostings[0]?.title || ''
    };
    
    setStaffData(prevData => [...prevData, newStaff]);
  };

  // 드롭다운용 정렬 처리 함수
  const handleSortChange = (value: string) => {
    setSortOption(value);
    if (!value) {
      setSortConfig(null);
      return;
    }
    
    const [key, direction] = value.split('-') as [SortKey, 'ascending' | 'descending'];
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
        staff.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.experience?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.nationality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.history?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.notes?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // 일반 헤더 컴포넌트 (정렬 기능 제거)
  const TableHeader = ({ label }: { label: string }) => (
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {label}
    </th>
  );
  
  // 편집 가능한 셀 컴포넌트
  const EditableCell = ({ 
    staff, 
    field, 
    value, 
    isReadOnly = false 
  }: { 
    staff: StaffData; 
    field: keyof StaffData; 
    value: any; 
    isReadOnly?: boolean;
  }) => {
    const isEditing = editingCell?.rowId === staff.id && editingCell?.field === field;
    
    if (isReadOnly) {
      return (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {value || '-'}
        </td>
      );
    }
    
    if (isEditing) {
      return (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <input
            type={field === 'age' ? 'number' : 'text'}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleCellSave}
            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </td>
      );
    }
    
    return (
      <td 
        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
        onClick={() => handleCellClick(staff.id, field, value)}
        title="클릭하여 편집"
      >
        {field === 'gender' && value ? t(`gender.${value.toLowerCase()}`, value) : 
         field === 'age' && value ? `${value}세` : 
         value || '-'}
      </td>
    );
  };

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
        <select
          className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
          value={sortOption}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <option value="">{t('common.sort', '정렬')} ({t('common.none', '없음')})</option>
          <option value="postingTitle-ascending">{t('jobPostingAdmin.manage.title')} (오름차순)</option>
          <option value="postingTitle-descending">{t('jobPostingAdmin.manage.title')} (내림차순)</option>
          <option value="role-ascending">{t('jobPostingAdmin.create.roleName')} (오름차순)</option>
          <option value="role-descending">{t('jobPostingAdmin.create.roleName')} (내림차순)</option>
          <option value="name-ascending">{t('staffNew.labelName')} (오름차순)</option>
          <option value="name-descending">{t('staffNew.labelName')} (내림차순)</option>
          <option value="gender-ascending">{t('signUp.genderLabel')} (오름차순)</option>
          <option value="gender-descending">{t('signUp.genderLabel')} (내림차순)</option>
          <option value="age-ascending">{t('profilePage.age')} (오름차순)</option>
          <option value="age-descending">{t('profilePage.age')} (내림차순)</option>
          <option value="experience-ascending">{t('profilePage.experience')} (오름차순)</option>
          <option value="experience-descending">{t('profilePage.experience')} (내림차순)</option>
          <option value="phone-ascending">{t('signUp.phoneLabel')} (오름차순)</option>
          <option value="phone-descending">{t('signUp.phoneLabel')} (내림차순)</option>
          <option value="email-ascending">{t('staffNew.labelEmail')} (오름차순)</option>
          <option value="email-descending">{t('staffNew.labelEmail')} (내림차순)</option>
          <option value="nationality-ascending">{t('profilePage.nationality')} (오름차순)</option>
          <option value="nationality-descending">{t('profilePage.nationality')} (내림차순)</option>
        </select>
        <button
          onClick={addNewRow}
          className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          + 새 행 추가
        </button>
        </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <TableHeader label={t('jobPostingAdmin.manage.title')} />
                <TableHeader label={t('jobPostingAdmin.create.roleName')} />
                <TableHeader label={t('staffNew.labelName')} />
                <TableHeader label={t('signUp.genderLabel')} />
                <TableHeader label={t('profilePage.age')} />
                <TableHeader label={t('profilePage.experience')} />
                <TableHeader label={t('signUp.phoneLabel')} />
                <TableHeader label={t('staffNew.labelEmail')} />
                <TableHeader label={t('profilePage.nationality')} />
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.history')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profilePage.notes')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedStaff.length > 0 ? filteredAndSortedStaff.map((staff) => (
                <tr key={staff.id}>
                  <EditableCell staff={staff} field="postingTitle" value={staff.postingTitle} isReadOnly={true} />
                  <EditableCell staff={staff} field="role" value={staff.role} />
                  <EditableCell staff={staff} field="name" value={staff.name} />
                  <EditableCell staff={staff} field="gender" value={staff.gender} />
                  <EditableCell staff={staff} field="age" value={staff.age} />
                  <EditableCell staff={staff} field="experience" value={staff.experience} />
                  <EditableCell staff={staff} field="phone" value={staff.phone} />
                  <EditableCell staff={staff} field="email" value={staff.email} />
                  <EditableCell staff={staff} field="nationality" value={staff.nationality} />
                  <EditableCell staff={staff} field="history" value={staff.history} />
                  <EditableCell staff={staff} field="notes" value={staff.notes} />
                </tr>
              )) : (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">
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