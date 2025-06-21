import React, { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';

// Staff 인터페이스는 컨텍스트에서 가져올 수 있지만, 명확성을 위해 여기에도 정의합니다.
// 실제로는 export interface Staff { id: string; name: string; role: 'admin' | 'dealer' | 'floor'; contact?: string; } 와 같이 사용됩니다.
const ROLES = ["admin", "dealer", "floor"];

const StaffPage: React.FC = () => {
    const { state, dispatch } = useTournament();
    // 실제로는 state.staffs를 사용해야 하지만, 지금은 컨텍스트에 없으므로 임시 데이터를 사용합니다.
    const [staffs, setStaffs] = useState([
        { id: 's1', name: 'John Doe', role: 'dealer', contact: '010-1111-1111' },
        { id: 's2', name: 'Jane Smith', role: 'floor', contact: '010-2222-2222' },
    ]);

    const [name, setName] = useState('');
    const [role, setRole] = useState('dealer');
    const [contact, setContact] = useState('');
    const [editingStaff, setEditingStaff] = useState<any | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        const newStaff = { id: `s${staffs.length + 1}`, name, role, contact };
        setStaffs([...staffs, newStaff]);
        // dispatch({ type: 'ADD_STAFF', payload: { name, role, contact } });
        console.log("Dispatching ADD_STAFF (not implemented yet)", { name, role, contact });
        setName(''); setRole('dealer'); setContact('');
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;
        setStaffs(staffs.map(s => s.id === editingStaff.id ? editingStaff : s));
        // dispatch({ type: 'UPDATE_STAFF', payload: editingStaff });
        console.log("Dispatching UPDATE_STAFF (not implemented yet)", editingStaff);
        setEditingStaff(null);
    };

    const handleDelete = (id: string) => {
        setStaffs(staffs.filter(s => s.id !== id));
        // dispatch({ type: 'DELETE_STAFF', payload: { id } });
        console.log("Dispatching DELETE_STAFF (not implemented yet)", { id });
    };

    const startEdit = (staff: any) => {
        setEditingStaff({ ...staff });
    };

    const cancelEdit = () => {
        setEditingStaff(null);
    }

    return (
        <div className="card">
            <h2 className="text-2xl font-bold mb-4">직원 관리</h2>
            
            <form onSubmit={editingStaff ? handleUpdate : handleAdd} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4 p-4 bg-gray-700 rounded-lg">
                <input type="text" placeholder="이름" value={editingStaff ? editingStaff.name : name} onChange={e => editingStaff ? setEditingStaff({...editingStaff, name: e.target.value}) : setName(e.target.value)} className="input-field" required />
                <select value={editingStaff ? editingStaff.role : role} onChange={e => editingStaff ? setEditingStaff({...editingStaff, role: e.target.value}) : setRole(e.target.value)} className="input-field">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="text" placeholder="연락처 (선택)" value={editingStaff ? editingStaff.contact : contact} onChange={e => editingStaff ? setEditingStaff({...editingStaff, contact: e.target.value}) : setContact(e.target.value)} className="input-field" />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary w-full">{editingStaff ? '저장' : '추가'}</button>
                  {editingStaff && <button type="button" onClick={cancelEdit} className="btn btn-secondary w-full">취소</button>}
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                    <thead className="bg-gray-700">
                        <tr className="text-left text-gray-300">
                            <th className="p-3">이름</th>
                            <th className="p-3">역할</th>
                            <th className="p-3">연락처</th>
                            <th className="p-3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                        {staffs.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-700">
                                <td className="p-3">{s.name}</td>
                                <td className="p-3 capitalize">{s.role}</td>
                                <td className="p-3">{s.contact || '-'}</td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => startEdit(s)} className="btn btn-secondary text-xs">수정</button>
                                        <button onClick={() => handleDelete(s.id)} className="btn bg-red-600 hover:bg-red-700 text-white text-xs">삭제</button>
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