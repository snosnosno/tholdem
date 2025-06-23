import React, { useState } from 'react';
import { useStaffApplications } from '../hooks/useStaffApplications';
import { useStaff } from '../hooks/useStaff';
import Modal from './Modal';

const StaffApplicationsSection: React.FC = () => {
  const { applications, loading, error, updateApplication } = useStaffApplications();
  const { staff } = useStaff();
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getStaffName = (staffId: string) => {
    const s = staff.find(st => st.id === staffId);
    return s ? s.name : staffId;
  };

  const handleStatusChange = async (id: string, status: 'pending' | 'accepted' | 'rejected') => {
    await updateApplication(id, { status });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">지원자 현황/선발/배정</h2>
      </div>
      {loading ? (
        <div>로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">오류: {error.message}</div>
      ) : (
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">지원일</th>
              <th className="px-4 py-2">역할</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{getStaffName(app.staffId)}</td>
                <td className="px-4 py-2">{app.date}</td>
                <td className="px-4 py-2">{app.role}</td>
                <td className="px-4 py-2">{app.status}</td>
                <td className="px-4 py-2">
                  <button onClick={() => handleStatusChange(app.id, 'accepted')} className="btn btn-primary btn-xs mr-2">선발</button>
                  <button onClick={() => handleStatusChange(app.id, 'rejected')} className="btn btn-danger btn-xs">거절</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="지원자 상세">
        {/* 상세 정보 및 배정 UI는 추후 구현 */}
        <div>상세 정보 준비 중...</div>
      </Modal>
    </div>
  );
};

export default StaffApplicationsSection;
