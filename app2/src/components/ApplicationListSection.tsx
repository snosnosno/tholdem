import React, { useState } from 'react';
import Modal from './Modal';
import { useStaff } from '../hooks/useStaff';
import { useStaffApplications, StaffApplication } from '../hooks/useStaffApplications';

const ApplicationListSection: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { applications, updateApplication } = useStaffApplications({ eventId });
  const { staff } = useStaff();
  const [selectedApp, setSelectedApp] = useState<StaffApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getStaffName = (staffId: string) => {
    const s = staff.find(st => st.id === staffId);
    return s ? s.name : staffId;
  };

  const handleStatusChange = async (id: string, status: StaffApplication['status']) => {
    await updateApplication(id, { status });
  };

  return (
    <div className="p-2 min-w-[320px]">
      <h3 className="text-lg font-bold mb-2">지원자 현황</h3>
      {applications.length === 0 ? (
        <div className="text-gray-500">아직 지원자가 없습니다.</div>
      ) : (
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1">이름</th>
              <th className="px-2 py-1">연락처</th>
              <th className="px-2 py-1">역할</th>
              <th className="px-2 py-1">날짜</th>
              <th className="px-2 py-1">상태</th>
              <th className="px-2 py-1">관리</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id} className="hover:bg-blue-50">
                <td className="px-2 py-1">
                  <button onClick={() => { setSelectedApp(app); setModalOpen(true); }} className="underline text-blue-700 hover:text-blue-900">
                    {getStaffName(app.staffId)}
                  </button>
                </td>
                <td className="px-2 py-1">{(staff.find(st => st.id === app.staffId)?.contact) || '-'}</td>
                <td className="px-2 py-1">{app.role}</td>
                <td className="px-2 py-1">{app.date}</td>
                <td className="px-2 py-1 font-bold">
                  {app.status === 'pending' && <span className="text-yellow-600">대기</span>}
                  {app.status === 'accepted' && <span className="text-green-700">승인</span>}
                  {app.status === 'rejected' && <span className="text-red-600">거절</span>}
                </td>
                <td className="px-2 py-1 flex gap-1">
                  {app.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusChange(app.id, 'accepted')} className="btn btn-xs btn-primary">승인</button>
                      <button onClick={() => handleStatusChange(app.id, 'rejected')} className="btn btn-xs btn-danger">거절</button>
                    </>
                  )}
                  {app.status === 'accepted' && (
                    <button onClick={() => handleStatusChange(app.id, 'rejected')} className="btn btn-xs btn-danger">거절</button>
                  )}
                  {app.status === 'rejected' && (
                    <button onClick={() => handleStatusChange(app.id, 'accepted')} className="btn btn-xs btn-primary">승인</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="지원서 상세">
        {selectedApp && (
          <div className="space-y-2">
            <div><b>이름:</b> {getStaffName(selectedApp.staffId)}</div>
            <div><b>연락처:</b> {(staff.find(st => st.id === selectedApp.staffId)?.contact) || '-'}</div>
            <div><b>역할:</b> {selectedApp.role}</div>
            <div><b>지원일:</b> {selectedApp.date}</div>
            <div><b>상태:</b> {selectedApp.status}</div>
            <div className="flex gap-2 mt-4">
              {selectedApp.status !== 'accepted' && (
                <button onClick={async () => { await handleStatusChange(selectedApp.id, 'accepted'); setModalOpen(false); }} className="btn btn-primary btn-xs">승인</button>
              )}
              {selectedApp.status !== 'rejected' && (
                <button onClick={async () => { await handleStatusChange(selectedApp.id, 'rejected'); setModalOpen(false); }} className="btn btn-danger btn-xs">거절</button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApplicationListSection;
