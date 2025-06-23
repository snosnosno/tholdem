import React, { useState, useMemo } from 'react';
import { useStaff, Staff } from '../hooks/useStaff';
import { FaEdit, FaTrash, FaPlus, FaCamera, FaQrcode, FaClock } from 'react-icons/fa';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../components/Modal';
import { useSettings } from '../hooks/useSettings';
import QRScannerModal from '../components/QRScannerModal';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'file';
  options?: string[];
  required: boolean;
}

const StaffPage: React.FC = () => {
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: 'profileImageUrl', label: '프로필 사진', type: 'file', required: false },
    { id: 'name', label: '이름', type: 'text', required: true },
    { id: 'contact', label: '연락처', type: 'text', required: false },
    { id: 'role', label: '역할', type: 'select', options: ['admin', 'Dealer', 'Floor', 'Other'], required: true },
  ]);
  const staffRoles = useMemo(() => formFields.find(f => f.id === 'role')?.options || [], [formFields]);

  const [newStaffData, setNewStaffData] = useState<Record<string, any>>({});
  
  const { staff, loading, error, addStaff, updateStaff, deleteStaff } = useStaff();
  
  const { settings } = useSettings();
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrScanAction, setQrScanAction] = useState<'clock-in' | 'clock-out' | null>(null);
  const [selectedStaffForQR, setSelectedStaffForQR] = useState<Staff | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingStaffData, setEditingStaffData] = useState<Record<string, any> | null>(null);

  const uniqueStaff = useMemo(() => {
    const seen = new Set<string>();
    return staff.filter(s => {
      const isDuplicate = seen.has(s.id);
      seen.add(s.id);
      return !isDuplicate;
    });
  }, [staff]);

  const handleInputChange = (id: string, value: any) => {
    setNewStaffData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of formFields) {
      if (field.required && !newStaffData[field.id]) {
        alert(`'${field.label}'은(는) 필수 항목입니다.`);
        return;
      }
    }
    setUploading(true);
    try {
      const dataToSave: Record<string, any> = { ...newStaffData };
      const fileFields = formFields.filter(f => f.type === 'file');
      for (const field of fileFields) {
        const file = dataToSave[field.id];
        if (file instanceof File) {
          const imageRef = ref(storage, `staff-profiles/${file.name}_${uuidv4()}`);
          const snapshot = await uploadBytes(imageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          dataToSave[field.id] = downloadURL;
        }
      }
      await addStaff(dataToSave as Omit<Staff, 'id'>);
      setNewStaffData({});
      setIsModalOpen(false);
    } catch (err) {
      alert(`직원 추가 중 오류 발생: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setEditingStaffData({ ...staffMember });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingStaff || !editingStaffData) return;
    for (const field of formFields) {
      if (field.required && !editingStaffData[field.id]) {
        alert(`'${field.label}'은(는) 필수 항목입니다.`);
        return;
      }
    }
    try {
      await updateStaff(editingStaff.id, editingStaffData as Partial<Staff>);
      setIsEditModalOpen(false);
      setEditingStaff(null);
      setEditingStaffData(null);
    } catch (err) {
      alert(`직원 정보 수정 중 오류 발생: ${err}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 이 직원을 삭제하시겠습니까?')) {
      try {
        await deleteStaff(id);
      } catch (err) {
        alert(`직원 삭제 중 오류 발생: ${err}`);
      }
    }
  };

  const filteredStaff = useMemo(() => {
    return uniqueStaff
      .filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(s => roleFilter === 'All' || s.role === roleFilter);
  }, [uniqueStaff, searchTerm, roleFilter]);

  const handleQRScan = async (data: string | null) => {
    if (data && selectedStaffForQR) {
      if (settings.qrClockInEnabled && data === settings.qrCodeValue) {
        alert(`${selectedStaffForQR.name}님의 ${qrScanAction === 'clock-in' ? '출근' : '퇴근'}이(가) 확인되었습니다.`);
        // ToDo: Add actual clock-in/out logic using a new hook for work logs.
      } else {
        alert('유효하지 않은 QR 코드입니다.');
      }
      setIsQRScannerOpen(false);
      setSelectedStaffForQR(null);
      setQrScanAction(null);
    }
  };

  const openQRScanner = (staffMember: Staff, action: 'clock-in' | 'clock-out') => {
    setSelectedStaffForQR(staffMember);
    setQrScanAction(action);
    setIsQRScannerOpen(true);
  };

  if (loading) return <div className="p-4">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-500">오류: {error.message}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">직원 관리</h1>
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="All">모든 역할</option>
            {staffRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
        >
          <FaPlus /> 새 직원 추가
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="새 직원 추가">
          <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formFields.map(field => (
              <div key={field.id} className="md:col-span-1">
                <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1">
                  {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'text' && (
                  <input
                    id={field.id}
                    type="text"
                    value={newStaffData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.label}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required={field.required}
                  />
                )}
                {field.type === 'select' && (
                  <select
                    id={field.id}
                    value={newStaffData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white"
                    required={field.required}
                  >
                    <option value="">-- 선택 --</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                {field.type === 'file' && (
                   <label className="w-full px-4 py-2 border border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50">
                     <FaCamera className="mr-2 text-gray-500"/>
                     <span className="text-sm text-gray-600 truncate">{(newStaffData[field.id] as File)?.name || '파일 선택'}</span>
                     <input
                       id={field.id}
                       type="file"
                       onChange={(e) => handleInputChange(field.id, e.target.files ? e.target.files[0] : null)}
                       className="hidden"
                       accept="image/*"
                     />
                   </label>
                )}
              </div>
            ))}
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                disabled={uploading}
              >
                {uploading ? '저장 중...' : '직원 추가'}
              </button>
            </div>
          </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="직원 정보 수정">
        <div className="space-y-4">
          {formFields.map(field => (
            <div key={field.id}>
              <label htmlFor={`edit-${field.id}`} className="block text-sm font-medium text-gray-600 mb-1">
                {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'text' && (
                <input
                  id={`edit-${field.id}`}
                  type="text"
                  value={editingStaffData?.[field.id] || ''}
                  onChange={(e) => setEditingStaffData({ ...editingStaffData, [field.id]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              )}
              {field.type === 'select' && (
                <select
                  id={`edit-${field.id}`}
                  value={editingStaffData?.[field.id] || ''}
                  onChange={(e) => setEditingStaffData({ ...editingStaffData, [field.id]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                   {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {field.type === 'file' && (
                editingStaffData?.[field.id] ? 
                  <img src={editingStaffData[field.id]} alt={field.label} className="w-24 h-24 object-cover rounded-md"/> :
                  <span className="text-sm text-gray-500">이미지 없음</span>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-4">
            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">취소</button>
            <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-md">저장</button>
          </div>
        </div>
      </Modal>
      
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScan}
        onError={(error) => alert(`QR 스캔 오류: ${error.message}`)}
      />

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full table-auto min-w-max">
          <thead className="bg-gray-100">
            <tr>
              {formFields.map(field => (
                <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {field.label}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                출퇴근
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStaff.map((staffMember) => (
              <tr key={staffMember.id} className="hover:bg-gray-50">
                {formFields.map(field => (
                  <td key={field.id} className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleEditClick(staffMember)}>
                    {field.type === 'file' ? (
                      <img 
                        src={(staffMember as any)[field.id] || 'https://via.placeholder.com/40'} 
                        alt={staffMember.name || 'staff'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      (staffMember as any)[field.id] || '-'
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {settings.qrClockInEnabled && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openQRScanner(staffMember, 'clock-in'); }}
                        className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                        title="출근 QR 스캔"
                      >
                        <FaQrcode />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openQRScanner(staffMember, 'clock-out'); }}
                        className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                        title="퇴근 QR 스캔"
                      >
                        <FaClock />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditClick(staffMember); }}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <FaEdit />
                      수정
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(staffMember.id); }}
                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                    >
                      <FaTrash />
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
  );
};

export default StaffPage;
