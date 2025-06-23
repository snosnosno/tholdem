import React, { useState } from 'react';
import { useWorkLogs } from '../hooks/useWorkLogs';
import { useStaff } from '../hooks/useStaff';
import Modal from '../components/Modal';

const AttendancePayrollPage: React.FC = () => {
  const { workLogs, loading, error, addWorkLog, updateWorkLog, deleteWorkLog } = useWorkLogs();
  const { staff } = useStaff();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);

  // ... (폼 상태 등 추가 구현)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">근태/페이롤 관리</h1>
      <button onClick={() => { setModalOpen(true); setEditingLog(null); }} className="btn btn-primary mb-4">+ 근무 기록 추가</button>
      {loading ? (
        <div>로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">오류: {error.message}</div>
      ) : (
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">날짜</th>
              <th className="px-4 py-2">스태프</th>
              <th className="px-4 py-2">출근</th>
              <th className="px-4 py-2">퇴근</th>
              <th className="px-4 py-2">총 근무(분)</th>
              <th className="px-4 py-2">시급</th>
              <th className="px-4 py-2">총액</th>
              <th className="px-4 py-2">승인</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {workLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{log.date}</td>
                <td className="px-4 py-2">{staff.find(s => s.id === log.staffId)?.name || log.staffId}</td>
                <td className="px-4 py-2">{log.clockIn}</td>
                <td className="px-4 py-2">{log.clockOut}</td>
                <td className="px-4 py-2">{log.totalMinutes}</td>
                <td className="px-4 py-2">{log.wage}</td>
                <td className="px-4 py-2">{log.totalMinutes * log.wage}</td>
                <td className="px-4 py-2">{log.approved ? '승인됨' : <button className="btn btn-success btn-xs">승인</button>}</td>
                <td className="px-4 py-2">
                  <button onClick={() => setEditingLog(log)} className="btn btn-secondary btn-xs mr-2">수정</button>
                  <button onClick={() => deleteWorkLog(log.id)} className="btn btn-danger btn-xs">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLog ? '근무 기록 수정' : '근무 기록 추가'}>
        {/* 폼 구현 생략 */}
        <div>폼 구현 예정</div>
      </Modal>
    </div>
  );
};

export default AttendancePayrollPage;
