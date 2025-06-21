import React, { useState, useMemo } from 'react';
import { useTournament, Participant } from '../contexts/TournamentContext';

const ParticipantsPage: React.FC = () => {
  const { state, dispatch } = useTournament();
  const { participants } = state;

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newParticipantName, setNewParticipantName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim()) return;
    dispatch({ type: 'ADD_PARTICIPANT', payload: { name: newParticipantName } });
    setNewParticipantName('');
  };

  const handleEdit = (p: Participant) => {
    setEditingParticipant(p);
  };

  const handleUpdate = async (id: string) => {
    // dispatch({ type: 'UPDATE_PARTICIPANT', payload: { id, name: editName, phone: editPhone, chipCount: editChipCount } });
    console.log("Update participant action dispatched (not implemented yet)");
    setEditingParticipant(null);
  };

  const handleDelete = async (id: string) => {
    // dispatch({ type: 'DELETE_PARTICIPANT', payload: { id } });
    console.log("Delete participant action dispatched (not implemented yet)");
  };

  const handleToggleStatus = async (p: Participant) => {
    const newStatus = p.status === 'active' ? 'busted' : 'active';
    // dispatch({ type: 'UPDATE_PARTICIPANT_STATUS', payload: { id: p.id, status: newStatus } });
    console.log("Toggle status action dispatched (not implemented yet)");
  };

  const handleRebuy = (participantId: string) => {
    console.log(`Dispatching PERFORM_REBUY for participant ${participantId} (not implemented)`);
  };

  const handleAddon = (participantId: string) => {
    console.log(`Dispatching PERFORM_ADDON for participant ${participantId} (not implemented)`);
  };

  const handleEliminate = (participantId: string) => {
    console.log(`Dispatching ELIMINATE_PLAYER for participant ${participantId} (not implemented)`);
  };
  
  // 총 칩 및 평균 스택 계산
  const { totalChips, averageStack, activePlayers } = useMemo(() => {
    const activePlayers = participants.filter(p => p.status === 'active');
    const totalChips = activePlayers.reduce((sum, p) => sum + p.chipCount, 0);
    const averageStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;
    return { totalChips, averageStack, activePlayers: activePlayers.length };
  }, [participants]);

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">참가자 관리</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-400">활동중인 참가자</p>
          <p className="text-xl font-bold">{activePlayers}</p>
        </div>
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-400">총 칩</p>
          <p className="text-xl font-bold">{totalChips.toLocaleString()}</p>
        </div>
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-400">평균 스택</p>
          <p className="text-xl font-bold">{averageStack.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="이름"
          value={newParticipantName}
          onChange={e => setNewParticipantName(e.target.value)}
          className="input-field flex-grow"
          required
        />
        <button type="submit" className="btn btn-primary mt-2 sm:mt-0">추가</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead className="bg-gray-700">
            <tr className="text-left text-gray-300">
              <th className="p-3">이름</th>
              <th className="p-3">연락처</th>
              <th className="p-3">칩 개수</th>
              <th className="p-3">상태</th>
              <th className="p-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {participants.map((p: Participant) => (
              <tr key={p.id} className={p.status === 'busted' ? 'bg-gray-800 text-gray-500' : 'hover:bg-gray-700'}>
                <td className="p-3">
                  {editingParticipant === p ? (
                    <input value={p.name} onChange={(e) => setEditingParticipant({ ...p, name: e.target.value })} className="input-field !mt-0"/>
                  ) : ( p.name )}
                </td>
                <td className="p-3">
                  {editingParticipant === p ? (
                    <input value={p.phone || ''} onChange={(e) => setEditingParticipant({ ...p, phone: e.target.value })} className="input-field !mt-0"/>
                  ) : ( p.phone || '-' )}
                </td>
                <td className="p-3">
                  {editingParticipant === p ? (
                    <input type="number" value={p.chipCount} onChange={(e) => setEditingParticipant({ ...p, chipCount: parseInt(e.target.value, 10) })} className="input-field !mt-0"/>
                  ) : ( p.chipCount.toLocaleString() )}
                </td>
                <td className="p-3 capitalize">{p.status}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end items-center gap-2">
                    <button onClick={() => handleRebuy(p.id)} className="btn btn-secondary text-xs" disabled={p.status !== 'active'}>
                      리바이
                    </button>
                    <button onClick={() => handleAddon(p.id)} className="btn btn-secondary text-xs" disabled={p.status !== 'active'}>
                      애드온
                    </button>
                    <button onClick={() => handleEliminate(p.id)} className="btn bg-yellow-600 hover:bg-yellow-700 text-white text-xs" disabled={p.status !== 'active'}>
                      탈락
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="btn bg-red-600 hover:bg-red-700 text-white text-xs">삭제</button>
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

export default ParticipantsPage; 