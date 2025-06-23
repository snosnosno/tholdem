import React, { useState } from 'react';
import { useAssignments } from '../hooks/useAssignments';
import { useStaff } from '../hooks/useStaff';
import Modal from '../components/Modal';

const shifts = [
  { value: 'morning', label: '오전' },
  const handleAutoAssign = async () => {
    // 오늘 날짜, 각 교대별로 포지션에 중복 없이 순환 배정
    const today = new Date().toISOString().slice(0, 10);
    const positions = ['TD', 'Dealer', 'Floor'];
    const shiftsArr = ['morning', 'afternoon', 'full'];
    let availableStaff = [...staff];
    for (const shift of shiftsArr) {
      let staffPool = [...availableStaff];
      for (const pos of positions) {
        // 이미 해당 날짜/교대/포지션에 배정된 스태프 제외
        const assigned = assignments.find(a => a.date === today && a.shift === shift && a.position === pos);
        if (assigned) continue;
        if (staffPool.length === 0) staffPool = [...availableStaff];
        const idx = Math.floor(Math.random() * staffPool.length);
        const s = staffPool.splice(idx, 1)[0];
        await addAssignment({ date: today, shift, position: pos, staffId: s.id });
      }
    }
  };
  }
};

const StaffAssignmentPage: React.FC = () => {
  const { assignments, loading, error, addAssignment, updateAssignment, deleteAssignment } = useAssignments();
  const { staff } = useStaff();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShift, setSelectedShift] = useState('morning');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<import('../hooks/useAssignments').Assignment | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAssignment({
      date: selectedDate,
      shift: selectedShift as any,
      position: selectedPosition,
      <button onClick={handleAutoAssign} className="btn btn-info mb-4 ml-2">자동 배정</button>
    });
    setModalOpen(false);
  };

  const handleEdit = (assignment: any) => {
    setEditingAssignment(assignment);
    setSelectedDate(assignment.date);
    setSelectedShift(assignment.shift);
    setSelectedPosition(assignment.position);
    setSelectedStaffId(assignment.staffId);
    setModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    await updateAssignment(editingAssignment.id, {
      date: selectedDate,
      shift: selectedShift as any,
      position: selectedPosition,
      staffId: selectedStaffId,
    });
    setModalOpen(false);
    setEditingAssignment(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      await deleteAssignment(id);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">스태프 배치/로테이션</h1>
      <button onClick={() => { setModalOpen(true); setEditingAssignment(null); }} className="btn btn-primary mb-4">+ 배정 추가</button>
      {loading ? (
        <div>로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">오류: {error.message}</div>
      ) : (
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">날짜</th>
              <th className="px-4 py-2">교대</th>
              <th className="px-4 py-2">포지션</th>
              <th className="px-4 py-2">스태프</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{a.date}</td>
                <td className="px-4 py-2">{shifts.find(s => s.value === a.shift)?.label}</td>
                <td className="px-4 py-2">{a.position}</td>
                <td className="px-4 py-2">{staff.find(s => s.id === a.staffId)?.name || a.staffId}</td>
                <td className="px-4 py-2">
                  <button onClick={() => handleEdit(a)} className="btn btn-secondary btn-xs mr-2">수정</button>
                  <button onClick={() => handleDelete(a.id)} className="btn btn-danger btn-xs">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAssignment ? '배정 수정' : '배정 추가'}>
        <form onSubmit={editingAssignment ? handleUpdate : handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">날짜</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">교대</label>
            <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="input-field w-full" required>
              {shifts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">포지션</label>
            <input type="text" value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">스태프</label>
            <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="input-field w-full" required>
              <option value="">-- 선택 --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">취소</button>
            <button type="submit" className="btn btn-primary">{editingAssignment ? '수정' : '추가'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffAssignmentPage;
