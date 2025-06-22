import React, { useState, useMemo } from 'react';
import { useStaff, Staff } from '../hooks/useStaff';
import { FaEdit, FaTrash, FaSave, FaPlus, FaCamera } from 'react-icons/fa';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../components/Modal';

// 폼 필드의 타입을 정의합니다.
interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'file';
  options?: string[]; // 'select' 타입일 경우 사용
  required: boolean;
}

const StaffPage: React.FC = () => {
  // 폼 필드를 상태로 관리합니다.
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: 'profilePicture', label: '프로필 사진', type: 'file', required: false },
    { id: 'name', label: '이름', type: 'text', required: true },
    { id: 'contact', label: '연락처', type: 'text', required: false },
    { id: 'role', label: '역할', type: 'select', options: ['TD', 'Dealer', 'Floor', 'Admin', 'Other'], required: true },
  ]);
  const [staffRoles, setStaffRoles] = useState(formFields.find(f => f.id === 'role')?.options || []);

  // 입력 데이터를 동적으로 관리할 상태
  const [newStaffData, setNewStaffData] = useState<Record<string, any>>({});
  
  // 폼 편집 관련 상태
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const { staff, loading, error, addStaff, updateStaff, deleteStaff } = useStaff();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingStaffData, setEditingStaffData] = useState<Record<string, any> | null>(null);

  const handleInputChange = (id: string, value: any) => {
    setNewStaffData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();

    // 필수 필드 유효성 검사
    for (const field of formFields) {
      if (field.required && !newStaffData[field.id]) {
        alert(`'${field.label}'은(는) 필수 항목입니다.`);
        return;
      }
    }

    setUploading(true);

    try {
      const dataToSave: Record<string, any> = { ...newStaffData };
      
      // 모든 '파일' 타입 필드를 찾습니다.
      const fileFields = formFields.filter(f => f.type === 'file');
      
      const uploadPromises = fileFields.map(async (field) => {
        if (newStaffData[field.id] instanceof File) {
          const file = newStaffData[field.id] as File;
          const imageRef = ref(storage, `staff-profiles/${file.name}_${uuidv4()}`);
          const snapshot = await uploadBytes(imageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          dataToSave[field.id] = downloadURL; // URL로 교체
        }
      });
      
      // 모든 파일 업로드가 완료될 때까지 기다립니다.
      await Promise.all(uploadPromises);

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

    // 필수 필드 유효성 검사
    for (const field of formFields) {
      if (field.required && !editingStaffData[field.id]) {
        alert(`'${field.label}'은(는) 필수 항목입니다.`);
        return;
      }
    }

    try {
      await updateStaff(editingStaff.id, editingStaffData);
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
    return staff
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(s => roleFilter === 'All' || s.role === roleFilter);
  }, [staff, searchTerm, roleFilter]);

  // 폼 필드 관리 함수들
  const handleAddField = () => {
    const newField: FormField = {
      id: `custom_${uuidv4()}`,
      label: '새 필드',
      type: 'text',
      required: false,
    };
    setFormFields([...formFields, newField]);
  };

  const handleDeleteField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
  };

  const handleUpdateField = (id: string, updatedField: Partial<FormField>) => {
    setFormFields(formFields.map(f => f.id === id ? { ...f, ...updatedField } : f));
    setEditingField(null); // 수정 완료 후 편집 상태 종료
  };

  if (loading) return <div className="p-4">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-500">오류: {error.message}</div>;

    return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">직원 관리</h1>

      {/* 필터 및 검색 UI */}
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
        <div className="flex justify-end mb-4">
          <button onClick={() => setIsEditingForm(!isEditingForm)} className="text-sm text-blue-600 hover:underline">
            {isEditingForm ? '폼 편집 완료' : '폼 편집'}
          </button>
        </div>

        {isEditingForm ? (
          // 폼 편집 UI
          <div className="space-y-4">
            {formFields.map(field => (
              <div key={field.id} className="p-3 border rounded-md flex items-center justify-between">
                {editingField?.id === field.id ? (
                  // 필드 수정 폼
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editingField.label} 
                        onChange={(e) => setEditingField({...editingField, label: e.target.value})}
                        className="p-1 border rounded-md"
                      />
                      <select 
                        value={editingField.type} 
                        onChange={(e) => setEditingField({...editingField, type: e.target.value as FormField['type']})}
                        className="p-1 border rounded-md bg-white"
                      >
                        <option value="text">텍스트</option>
                        <option value="select">선택</option>
                        <option value="file">파일</option>
                      </select>
                      <label className="flex items-center gap-1 text-sm">
                        <input 
                          type="checkbox" 
                          checked={editingField.required} 
                          onChange={(e) => setEditingField({...editingField, required: e.target.checked})}
                        />
                        필수
                      </label>
                      <button onClick={() => handleUpdateField(field.id, editingField)} className="text-green-600">저장</button>
                      <button onClick={() => setEditingField(null)} className="text-gray-500">취소</button>
                    </div>
                    {editingField.type === 'select' && (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600">옵션 (쉼표로 구분하여 입력)</label>
                        <input
                          type="text"
                          value={editingField.options?.join(', ') || ''}
                          onChange={(e) =>
                            setEditingField({
                              ...editingField,
                              options: e.target.value.split(',').map(opt => opt.trim()),
                            })
                          }
                          className="w-full p-1 border rounded-md mt-1 text-sm"
                          placeholder="예: 옵션1, 옵션2"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  // 일반 필드 정보 표시
                  <div className="flex-grow flex items-center justify-between">
                    <span>{field.label} ({field.type}) {field.required && <span className="text-red-500 ml-1">*</span>}</span>
                    <div>
                      <button onClick={() => setEditingField(field)} className="text-blue-500 hover:underline text-xs mr-2">수정</button>
                      <button onClick={() => handleDeleteField(field.id)} className="text-red-500 hover:underline text-xs">삭제</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={handleAddField} className="w-full py-2 bg-gray-100 rounded-md hover:bg-gray-200">
              + 필드 추가
            </button>
          </div>
        ) : (
          // 직원 추가 폼
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
                     <span className="text-sm text-gray-600 truncate">{newStaffData[field.id]?.name || '파일 선택'}</span>
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
        )}
      </Modal>

      {/* 직원 정보 수정 모달 */}
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

      <div className="bg-white rounded-lg shadow-md">
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              {formFields.map(field => (
                <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {field.label}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
                        </tr>
                    </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStaff.map((staffMember) => (
              <tr key={staffMember.id} onClick={() => handleEditClick(staffMember)} className="cursor-pointer hover:bg-gray-50">
                {formFields.map(field => (
                  <td key={field.id} className="px-6 py-4 whitespace-nowrap">
                    {field.type === 'file' ? (
                      <img 
                        src={staffMember[field.id] || 'https://via.placeholder.com/40'} 
                        alt={staffMember.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      staffMember[field.id] || '-'
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(staffMember.id); }}
                    className="text-red-600 hover:text-red-900 flex items-center gap-1"
                  >
                    <FaTrash />
                    삭제
                  </button>
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