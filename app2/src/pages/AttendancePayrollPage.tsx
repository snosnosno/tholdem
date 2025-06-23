import React, { useState } from 'react';
import { useWorkLogs } from '../hooks/useWorkLogs';
import { useStaff } from '../hooks/useStaff';
import Modal from '../components/Modal';

const AttendancePayrollPage: React.FC = () => {
  const [form, setForm] = useState({
    date: '',
    staffId: '',
    clockIn: '',
    clockOut: '',
    wage: 10000,
    approved: false,
  });
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
                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLog ? '근무 기록 수정' : '근무 기록 추가'}>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const start = form.clockIn.split(':');
                    const end = form.clockOut.split(':');
                    const totalMinutes = (parseInt(end[0]) * 60 + parseInt(end[1])) - (parseInt(start[0]) * 60 + parseInt(start[1]));
                    if (editingLog) {
                      updateWorkLog(editingLog.id, { ...form, totalMinutes });
                    } else {
                      addWorkLog({ ...form, totalMinutes });
                    }
                    setModalOpen(false);
                    setEditingLog(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">날짜</label>
                      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field w-full" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">스태프</label>
                      <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} className="input-field w-full" required>
                        <option value="">-- 선택 --</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">출근</label>
                        <input type="time" value={form.clockIn} onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))} className="input-field w-full" required />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">퇴근</label>
                        <input type="time" value={form.clockOut} onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))} className="input-field w-full" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">시급</label>
                      <input type="number" value={form.wage} onChange={e => setForm(f => ({ ...f, wage: parseInt(e.target.value, 10) }))} className="input-field w-full" required />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setModalOpen(false); setEditingLog(null); }} className="btn btn-secondary">취소</button>
                      <button type="submit" className="btn btn-primary">{editingLog ? '수정' : '추가'}</button>
                    </div>
                  </form>
                </Modal>
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
