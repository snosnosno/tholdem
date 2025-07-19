import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';

import { useAuth } from '../../contexts/AuthContext';
import { useJobPostingContext } from '../../contexts/JobPostingContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../firebase';
import { useAttendanceStatus } from '../../hooks/useAttendanceStatus';
import { usePayrollData } from '../../hooks/usePayrollData';
import { getExceptionIcon, getExceptionSeverity } from '../../utils/attendanceExceptionUtils';
import { PayrollCalculationData } from '../../utils/payroll/types';
import { AttendanceExceptionHandler } from '../AttendanceExceptionHandler';
import AttendanceStatusCard from '../AttendanceStatusCard';
import PayrollSummaryModal from '../PayrollSummaryModal';
import QRCodeGeneratorModal from '../QRCodeGeneratorModal';
import WorkTimeEditor from '../WorkTimeEditor';



// 업무 역할 정의
type JobRole = 
  | 'Dealer'              // 딜러
  | 'Floor'               // 플로어
  | 'Server'              // 서빙
  | 'Tournament Director' // 토너먼트 디렉터
  | 'Chip Master'         // 칩 마스터
  | 'Registration'        // 레지
  | 'Security'            // 보안요원
  | 'Cashier';            // 캐셔

// 계정 권한은 기존 유지
type UserRole = 'staff' | 'manager' | 'admin' | 'pending_manager';

interface StaffData {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: JobRole;         // 업무 역할 (딜러, 플로어 등)
  userRole?: UserRole;    // 계정 권한 (dealer, manager, admin 등)
  gender?: string;
  age?: number;
  experience?: string;
  nationality?: string;
  history?: string;
  notes?: string;
  postingId: string;
  postingTitle: string;
  assignedEvents?: string[]; // 스태프가 등록된 모든 공고 ID 배열
  assignedRole?: string;     // 지원자에서 확정된 역할
  assignedTime?: string;     // 지원자에서 확정된 시간
  assignedDate?: string;     // 할당된 날짜 (yyyy-MM-dd 형식)
}

interface StaffManagementTabProps {
  jobPosting?: any;
}

type SortKey = keyof StaffData;

const StaffManagementTab: React.FC<StaffManagementTabProps> = ({ jobPosting }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
    const { showSuccess, showError, showWarning } = useToast();
  const { staff } = useJobPostingContext();
  
  const [staffData, setStaffData] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 출석 상태 관리
  const { 
    attendanceRecords, 
    // loading: attendanceLoading, 
    // error: attendanceError,
    getStaffAttendanceStatus 
  } = useAttendanceStatus({
    eventId: jobPosting?.id || 'default-event',
    date: new Date().toISOString().split('T')[0] || ''
  });
  
  // 급여 데이터 관리
  const {
    generatePayrollFromWorkLogs,
    payrollData: generatedPayrollData,
    summary: payrollSummary,
    loading: payrollLoading,
    // error: payrollError,
    exportToCSV
  } = usePayrollData({
    eventId: jobPosting?.id || 'default-event'
  });

  // States for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>(''); 
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  
  // 편집 기능 관련 states
  // const [editingCell, setEditingCell] = useState<{ rowId: string; field: keyof StaffData } | null>(null);
  // const [editingValue, setEditingValue] = useState<string>('');
  
  // QR 코드 생성 모달 관련 states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  
  // 시간 수정 모달 관련 states
  const [isWorkTimeEditorOpen, setIsWorkTimeEditorOpen] = useState(false);
  const [selectedWorkLog, setSelectedWorkLog] = useState<any | null>(null);
  
  // 예외 상황 처리 모달 관련 states
  // const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [selectedExceptionWorkLog, setSelectedExceptionWorkLog] = useState<any | null>(null);
  
  // 급여 처리 관련 states
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollData, setPayrollData] = useState<PayrollCalculationData[]>([]);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);

  // 스태프 데이터 로드 및 실시간 동기화
  useEffect(() => {
    if (!currentUser || !jobPosting?.id) {
      setLoading(false);
      return;
    }

    const fetchJobPostingStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 StaffManagementTab - 현재 사용자 ID:', currentUser.uid);
        console.log('🔍 StaffManagementTab - 공고 ID:', jobPosting.id);
        
        // 해당 공고에 할당된 스태프만 가져오기
        const staffQuery = query(
          collection(db, 'staff'), 
          where('managerId', '==', currentUser.uid),
          where('postingId', '==', jobPosting.id)
        );
        const staffSnapshot = await getDocs(staffQuery);
        console.log('🔍 공고별 Staff 문서 수:', staffSnapshot.size);
    
        if (staffSnapshot.empty) {
          console.log('⚠️ 해당 공고의 스태프가 없습니다.');
          setStaffData([]);
          setLoading(false);
          return;
        }

        const staffList: StaffData[] = staffSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // jobRole 배열을 role 필드로 매핑 (promoteToStaff에서 저장한 데이터 호환성)
            role: data.jobRole && Array.isArray(data.jobRole) ? data.jobRole[0] as JobRole : data.role,
            postingTitle: jobPosting.title // 현재 공고 제목 설정
          } as StaffData;
        });
        
        console.log('🔍 공고별 스태프 데이터:', staffList);
        setStaffData(staffList);

      } catch (e) {
        console.error("Error fetching staff data: ", e);
        setError(t('staffListPage.fetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchJobPostingStaff();
    }, [currentUser, jobPosting?.id, t, staff]); // staff 추가로 실시간 동기화

  // 편집 기능 핸들러 (미사용)
  // const handleCellClick = (rowId: string, field: keyof StaffData, currentValue: any) => {
  //   // 편집 불가능한 필드 제외
  //   const readOnlyFields: (keyof StaffData)[] = ['id', 'userId', 'postingId', 'postingTitle'];
  //   if (readOnlyFields.includes(field)) return;

  //   // 편집 모드 활성화
  //   setEditingCell({ rowId, field, value: currentValue });
  // };
  
  // const handleCellSave = async () => {
  //   if (!editingCell) return;

  //   const { rowId, field } = editingCell;
  //   const newValue = editingValue;

  //   try {
  //     // 스태프 데이터 업데이트
  //     const updatedStaffData = staffData.map(staff => {
  //       if (staff.id === rowId) {
  //         return { ...staff, [field]: newValue };
  //       }
  //       return staff;
  //     });

  //     setStaffData(updatedStaffData);
  //     setEditingCell(null);
  //     setEditingValue('');

  //     showSuccess(t('staffManagement.cellUpdateSuccess'));
  //   } catch (error) {
  //     console.error('셀 저장 오류:', error);
  //     showError(t('staffManagement.cellUpdateError'));
  //   }
  // };
  
  // const handleCellCancel = () => {
  //   // setEditingCell(null); // This line is removed
  //   // setEditingValue(''); // This line is removed
  // };
  
  // 출퇴근 시간 수정 핸들러
  const handleEditWorkTime = (staffId: string) => {
    const workLog = attendanceRecords.find(record => 
      record.workLog?.eventId === (jobPosting?.id || 'default-event') && 
      record.staffId === staffId &&
      record.workLog?.date === new Date().toISOString().split('T')[0]
    );
    
    if (workLog) {
      setSelectedWorkLog(workLog);
      setIsWorkTimeEditorOpen(true);
    } else {
      console.log('오늘 날짜에 대한 근무 기록을 찾을 수 없습니다.');
    }
  };
  
  const handleWorkTimeUpdate = (updatedWorkLog: any) => {
    console.log('근무 시간이 업데이트되었습니다:', updatedWorkLog);
        showSuccess(t('staffManagement.workTimeUpdateSuccess'));
  };
  
  // 예외 상황 처리 함수
  const handleExceptionEdit = (staffId: string) => {
    const workLog = attendanceRecords.find(record => 
      record.workLog?.eventId === (jobPosting?.id || 'default-event') && 
      record.staffId === staffId &&
      record.workLog?.date === new Date().toISOString().split('T')[0]
    );
    
    if (workLog?.workLog) {
      setSelectedExceptionWorkLog(workLog.workLog);
      // setIsExceptionModalOpen(true); // This line is removed
    }
  };
  
  const handleExceptionUpdate = (updatedWorkLog: any) => {
    console.log('예외 상황이 업데이트되었습니다:', updatedWorkLog);
    // setIsExceptionModalOpen(false); // This line is removed
    setSelectedExceptionWorkLog(null);
        showSuccess(t('staffManagement.exceptionUpdateSuccess'));
  };
  
  // 급여 처리 관련 함수들
  const handleGeneratePayroll = async () => {
    setIsGeneratingPayroll(true);
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      await generatePayrollFromWorkLogs(jobPosting?.id || 'default-event', currentDate, currentDate);
      setPayrollData(generatedPayrollData);
      setIsPayrollModalOpen(true);
    } catch (error) {
      console.error('급여 데이터 생성 오류:', error);
            showError(t('staffManagement.payrollGenerationError'));
    } finally {
      setIsGeneratingPayroll(false);
    }
  };
  
  const handleExportPayrollCSV = () => {
    if (payrollData.length === 0) {
            showWarning(t('payroll.noDataToExport', '내보낼 급여 데이터가 없습니다.'));
      return;
    }
    
    const csvData = exportToCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${jobPosting?.title || 'staff'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        showSuccess(t('payroll.exportSuccess'));
  };
  
  // 스태프 삭제 기능
  const deleteStaff = async (staffId: string) => {
    if (!window.confirm(t('staffManagement.deleteConfirm'))) {
      return;
    }
    
    try {
      // Firebase에서 삭제
      const staffDocRef = doc(db, 'staff', staffId);
      await deleteDoc(staffDocRef);
      
      // 로컬 상태에서 삭제
      setStaffData(prevData => prevData.filter(staff => staff.id !== staffId));
      
            showSuccess(t('staffManagement.deleteSuccess'));
      setError('');
    } catch (error: any) {
      console.error('스태프 삭제 오류:', error);
      setError(t('staffManagement.deleteError'));
            showError(t('staffManagement.deleteError'));
    }
  };

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

    if (searchTerm) {
      sortableItems = sortableItems.filter(staff =>
        staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.assignedRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.assignedTime?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.assignedDate?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [staffData, searchTerm, sortConfig]);

  // Early return if no job posting data
  if (!jobPosting) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-96">
          <div className="text-lg text-gray-500">공고 정보를 불러올 수 없습니다.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-96">
          <div className="text-lg">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">{jobPosting.title} - 스태프 관리</h3>
          <div className="text-sm text-gray-600">
            총 {staffData.length}명의 스태프가 등록되어 있습니다.
          </div>
        </div>

        {error ? <div className="bg-red-50 p-4 rounded-lg mb-4">
            <p className="text-red-600">{error}</p>
          </div> : null}

        {/* 검색 및 제어 버튼 */}
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
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="">{t('common.sort', '정렬')} ({t('common.none', '없음')})</option>
            <option value="role-ascending">역할 (오름차순)</option>
            <option value="role-descending">역할 (내림차순)</option>
            <option value="name-ascending">{t('staffNew.labelName')} (오름차순)</option>
            <option value="name-descending">{t('staffNew.labelName')} (내림차순)</option>
            <option value="assignedRole-ascending">할당 역할 (오름차순)</option>
            <option value="assignedRole-descending">할당 역할 (내림차순)</option>
            <option value="assignedTime-ascending">할당 시간 (오름차순)</option>
            <option value="assignedTime-descending">할당 시간 (내림차순)</option>
          </select>
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
          >
            {t('attendance.actions.generateQR')}
          </button>
          <button
            onClick={handleGeneratePayroll}
            disabled={isGeneratingPayroll}
            className="w-full md:w-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPayroll ? t('payroll.generating', '급여 계산중...') : t('payroll.calculate', '급여 계산')}
          </button>
          <button
            onClick={handleExportPayrollCSV}
            disabled={payrollData.length === 0 || payrollLoading}
            className="w-full md:w-auto px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('payroll.export', '급여 CSV 내보내기')}
          </button>
        </div>

        {filteredAndSortedStaff.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-600 mb-4">이 공고에 할당된 스태프가 없습니다.</p>
            <p className="text-sm text-gray-500">
              지원자 목록에서 지원자를 확정하면 자동으로 스태프로 등록됩니다.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('staffNew.labelName')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      할당 역할
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      할당 시간
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      할당 날짜
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('signUp.phoneLabel')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('staffNew.labelEmail')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      출석 상태
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      예외 상황
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staff.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.role || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.assignedRole || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.assignedTime || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.assignedDate ? (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            {staff.assignedDate}
                          </div>
                        ) : <span className="text-gray-400 text-xs">No Date</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const attendanceRecord = getStaffAttendanceStatus(staff.id);
                          return attendanceRecord ? (
                            <AttendanceStatusCard
                              status={attendanceRecord.status}
                              checkInTime={attendanceRecord.checkInTime}
                              checkOutTime={attendanceRecord.checkOutTime}
                              size="sm"
                            />
                          ) : (
                            <AttendanceStatusCard
                              status="not_started"
                              size="sm"
                            />
                          );
                        })()} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const record = attendanceRecords.find(r => r.staffId === staff.id);
                          if (record?.workLog?.exception) {
                            const exceptionType = record.workLog.exception.type;
                            const exceptionIcon = getExceptionIcon(exceptionType);
                            const severity = getExceptionSeverity(exceptionType);
                            return (
                              <div className="flex items-center gap-1">
                                <span className={`text-${severity === 'high' ? 'red' : severity === 'medium' ? 'yellow' : 'orange'}-500`}>
                                  {exceptionIcon}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {t(`exceptions.types.${exceptionType}`)}
                                </span>
                              </div>
                            );
                          }
                          return <span className="text-gray-400 text-xs">정상</span>;
                        })()} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditWorkTime(staff.id)}
                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                            title="시간 수정"
                          >
                            시간
                          </button>
                          <button
                            onClick={() => handleExceptionEdit(staff.id)}
                            className="text-orange-600 hover:text-orange-900 text-xs font-medium"
                            title="예외 상황 처리"
                          >
                            예외
                          </button>
                          <button
                            onClick={() => deleteStaff(staff.id)}
                            className="text-red-600 hover:text-red-900 text-xs font-medium"
                            title="스태프 삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QR 코드 생성 모달 */}
      <QRCodeGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        eventId={jobPosting?.id || 'default-event'}
        title={t('attendance.actions.generateQR')}
        description={`${jobPosting?.title || '공고'} 스태프들이 출석 체크를 할 수 있는 QR 코드를 생성합니다.`}
      />

      {/* 시간 수정 모달 */}
      <WorkTimeEditor
        isOpen={isWorkTimeEditorOpen}
        onClose={() => setIsWorkTimeEditorOpen(false)}
        workLog={selectedWorkLog}
        onUpdate={handleWorkTimeUpdate}
      />

      {/* 예외 상황 처리 모달 */}
      {selectedExceptionWorkLog ? <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('exceptions.title', '예외 상황 처리')}</h3>
              <button
                onClick={() => {
                  // setIsExceptionModalOpen(false); // This line is removed
                  setSelectedExceptionWorkLog(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <AttendanceExceptionHandler
              workLog={selectedExceptionWorkLog}
              onExceptionUpdated={handleExceptionUpdate}
            />
          </div>
        </div> : null}

      {/* 급여 계산 요약 모달 */}
      <PayrollSummaryModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        payrollData={payrollData}
        summary={payrollSummary}
        onExport={handleExportPayrollCSV}
      />
    </>
  );
};

export default StaffManagementTab;