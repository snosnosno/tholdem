import React from 'react';
import { useStaffApplications, StaffApplication } from '../hooks/useStaffApplications';

const ApplicationListSection: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { applications, updateApplication } = useStaffApplications({ eventId });

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
              <th className="px-2 py-1">역할</th>
              <th className="px-2 py-1">날짜</th>
              <th className="px-2 py-1">상태</th>
              <th className="px-2 py-1">관리</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id} className="hover:bg-blue-50">
                <td className="px-2 py-1">{app.staffId}</td>
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
    </div>
  );
};

export default ApplicationListSection;
