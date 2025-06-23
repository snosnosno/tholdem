import React, { useState, useMemo } from 'react';
import { useWorkLogs, WorkLog } from '../hooks/useWorkLogs';
import { useStaff, Staff } from '../hooks/useStaff';
import Modal from '../components/Modal';

// Timestamp를 "HH:mm" 형식으로 변환하는 헬퍼 함수
const formatTime = (timestamp: number | null) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toTimeString().slice(0, 5);
};

const AttendancePayrollPage: React.FC = () => {
  const { workLogs, loading, error, addWorkLog, updateWorkLog, deleteWorkLog } = useWorkLogs();
  const { staff } = useStaff();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  const initialFormState = {
    date: new Date().toISOString().slice(0, 10),
    staffId: '',
    totalMinutes: 0,
    wage: 10000,
    approved: false,
  };

  const [form, setForm] = useState(initialFormState);

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    setForm({
      date: log.date || new Date().toISOString().slice(0, 10),
      staffId: log.staffId,
      totalMinutes: log.totalMinutes || 0,
      wage: log.wage || 10000,
      approved: log.approved || false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLog) {
      await updateWorkLog(editingLog.id, {
        date: form.date,
        staffId: form.staffId,
        totalMinutes: Number(form.totalMinutes),
        wage: Number(form.wage),
        approved: form.approved,
      });
    } else {
      const newLog: Omit<WorkLog, 'id'> = {
        staffId: form.staffId,
        clockIn: Date.now() / 1000, // 임의의 타임스탬프
        clockOut: null,
        clockInMethod: 'manual',
        date: form.date,
        totalMinutes: Number(form.totalMinutes),
        wage: Number(form.wage),
        approved: form.approved,
      };
      await addWorkLog(newLog);
    }
    setModalOpen(false);
    setEditingLog(null);
    setForm(initialFormState);
  };
  
  const handleOpenAddModal = () => {
    setEditingLog(null);
    setForm(initialFormState);
    setModalOpen(true);
  };
  
  const totalPayroll = useMemo(() => {
    return workLogs.reduce((acc, log) => {
        if (log.approved && log.totalMinutes && log.wage) {
            return acc + (log.totalMinutes / 60) * log.wage;
        }
        return acc;
    }, 0);
  }, [workLogs]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">근태/페이롤 관리</h1>
      <div className="flex justify-between items-center mb-4">
        <button onClick={handleOpenAddModal} className="btn btn-primary">+ 수동 기록 추가</button>
        <div className="text-xl font-bold">총 지급 예정액: {totalPayroll.toLocaleString()}원</div>
      </div>
      {loading ? (
        <div>로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">오류: {error.message}</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="w-full table-auto text-sm">
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
              {workLogs.map((log: WorkLog) => (
                <tr key={log.id} className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2">{log.date || '-'}</td>
                  <td className="px-4 py-2">{staff.find((s: Staff) => s.id === log.staffId)?.name || log.staffId}</td>
                  <td className="px-4 py-2">{formatTime(log.clockIn)}</td>
                  <td className="px-4 py-2">{formatTime(log.clockOut)}</td>
                  <td className="px-4 py-2">{log.totalMinutes || 0}</td>
                  <td className="px-4 py-2">{log.wage?.toLocaleString() || 0}</td>
                  <td className="px-4 py-2">{((log.totalMinutes || 0) * (log.wage || 0) / 60).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-2">{log.approved ? '승인됨' : <button onClick={async () => await updateWorkLog(log.id, { approved: true })} className="btn btn-success btn-xs">승인</button>}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleEdit(log)} className="btn btn-secondary btn-xs mr-2">수정</button>
                    <button onClick={() => deleteWorkLog(log.id)} className="btn btn-danger btn-xs">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLog ? '근무 기록 수정' : '수동 기록 추가'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">날짜</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">스태프</label>
            <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} className="input-field w-full" required>
              <option value="">-- 선택 --</option>
              {staff.map((s: Staff) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">총 근무 시간(분)</label>
            <input type="number" value={form.totalMinutes} onChange={e => setForm(f => ({ ...f, totalMinutes: Number(e.target.value) }))} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">시급</label>
            <input type="number" value={form.wage} onChange={e => setForm(f => ({ ...f, wage: Number(e.target.value) }))} className="input-field w-full" required />
          </div>
          <div className="flex items-center">
             <input type="checkbox" checked={form.approved} onChange={e => setForm(f => ({...f, approved: e.target.checked}))} className="mr-2" />
             <label>승인됨</label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setModalOpen(false); setEditingLog(null); }} className="btn btn-secondary">취소</button>
            <button type="submit" className="btn btn-primary">{editingLog ? '수정' : '추가'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePayrollPage;
