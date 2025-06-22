import React, { useState, useMemo } from 'react';
import { useParticipants, Participant } from '../hooks/useParticipants';
import { useTables } from '../hooks/useTables';

const ParticipantsPage: React.FC = () => {
  const { participants, loading: participantsLoading, error: participantsError, addParticipant, updateParticipant, deleteParticipant, addParticipantAndAssignToSeat } = useParticipants();
  const { tables, loading: tablesLoading, error: tablesError } = useTables();

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '', playerIdentifier: '', participationMethod: '', chips: 10000, status: 'active' as const });

  const participantLocations = useMemo(() => {
    const locations = new Map<string, string>();
    tables.forEach(table => {
      (table.seats || []).forEach((participantId, seatIndex) => {
        if (participantId) {
          locations.set(participantId, `${table.tableNumber}-${seatIndex + 1}`);
        }
      });
    });
    return locations;
  }, [tables]);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aIsSeated = participantLocations.has(a.id);
      const bIsSeated = participantLocations.has(b.id);
      
      const aIsBusted = a.status === 'busted';
      const bIsBusted = b.status === 'busted';

      if (aIsBusted && !bIsBusted) return 1;
      if (!aIsBusted && bIsBusted) return -1;
      
      if (aIsSeated && !bIsSeated) return -1;
      if (!aIsSeated && bIsSeated) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [participants, participantLocations]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.name.trim()) return;
    try {
      const result = await addParticipantAndAssignToSeat(newParticipant);
      if (result.success) {
        alert(`성공: 참가자 ${newParticipant.name}님이 테이블 ${result.tableNumber}, 좌석 ${result.seatNumber}에 배정되었습니다.`);
        setNewParticipant({ name: '', phone: '', playerIdentifier: '', participationMethod: '', chips: 10000, status: 'active' as const });
      }
    } catch (error: any) {
      console.error("참가자 추가 및 배정 실패:", error);
      alert(`오류: ${error.message}`);
    }
  };

  const handleEdit = (p: Participant) => {
    setEditingParticipant({ ...p });
  };

  const handleUpdate = async () => {
    if (!editingParticipant) return;
    const { id, ...dataToUpdate } = editingParticipant;
    await updateParticipant(id, dataToUpdate);
    setEditingParticipant(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 이 참가자를 삭제하시겠습니까?')) {
      await deleteParticipant(id);
    }
  };
  
  const { totalChips, averageStack, activePlayers } = useMemo(() => {
    const totalChips = participants.reduce((sum, p) => sum + (p.chips || 0), 0);
    const activePs = participants.filter(p => p.status === 'active');
    const averageStack = activePs.length > 0 ? Math.round(totalChips / activePs.length) : 0;
    return { totalChips, averageStack, activePlayers: activePs.length };
  }, [participants]);

  const loading = participantsLoading || tablesLoading;
  const error = participantsError || tablesError;

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card">Error: {error.message}</div>;

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">참가자 관리</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div className="bg-gray-100 p-3 rounded-lg">
          <p className="text-sm text-gray-500">ENTRY</p>
          <p className="text-xl font-bold text-gray-800">{activePlayers} / {participants.length}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
          <p className="text-sm text-gray-500">총 칩</p>
          <p className="text-xl font-bold text-gray-800">{totalChips.toLocaleString()}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
          <p className="text-sm text-gray-500">평균 스택</p>
          <p className="text-xl font-bold text-gray-800">{averageStack.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4 items-start">
        <input
          type="text"
          placeholder="이름"
          value={newParticipant.name}
          onChange={e => setNewParticipant(prev => ({...prev, name: e.target.value}))}
          className="input-field flex-grow"
          required
        />
        <input
          type="tel"
          placeholder="연락처"
          value={newParticipant.phone}
          onChange={e => setNewParticipant(prev => ({...prev, phone: e.target.value}))}
          className="input-field"
        />
        <input
          type="text"
          placeholder="ID"
          value={newParticipant.playerIdentifier}
          onChange={e => setNewParticipant(prev => ({...prev, playerIdentifier: e.target.value}))}
          className="input-field"
        />
        <input
          type="text"
          placeholder="참여방법"
          value={newParticipant.participationMethod}
          onChange={e => setNewParticipant(prev => ({...prev, participationMethod: e.target.value}))}
          className="input-field"
        />
        <input
          type="number"
          placeholder="칩"
          value={newParticipant.chips}
          onChange={e => setNewParticipant(prev => ({...prev, chips: parseInt(e.target.value, 10) || 0}))}
          className="input-field"
        />
        <button type="submit" className="btn btn-primary mt-2 sm:mt-0 self-stretch">추가</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600 font-semibold">
              <th className="p-3">이름</th>
              <th className="p-3">연락처</th>
              <th className="p-3">ID</th>
              <th className="p-3">테이블</th>
              <th className="p-3">칩 개수</th>
              <th className="p-3">참여방법</th>
              <th className="p-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedParticipants.map((p: Participant) => (
              <tr key={p.id} className={'hover:bg-gray-50'}>
                <td className="p-3">
                  {editingParticipant?.id === p.id ? (
                    <input value={editingParticipant.name} onChange={(e) => setEditingParticipant({ ...editingParticipant, name: e.target.value })} className="input-field !mt-0"/>
                  ) : ( p.name )}
                </td>
                <td className="p-3">
                  {editingParticipant?.id === p.id ? (
                    <input value={editingParticipant.phone || ''} onChange={(e) => setEditingParticipant({ ...editingParticipant, phone: e.target.value })} className="input-field !mt-0"/>
                  ) : ( p.phone || '-' )}
                </td>
                <td className="p-3">
                  {editingParticipant?.id === p.id ? (
                    <input type="text" value={editingParticipant.playerIdentifier || ''} onChange={(e) => setEditingParticipant({ ...editingParticipant, playerIdentifier: e.target.value })} className="input-field !mt-0"/>
                  ) : ( p.playerIdentifier || '-' )}
                </td>
                <td className="p-3">{p.status === 'busted' ? '-' : (participantLocations.get(p.id) || '-')}</td>
                <td className="p-3">
                  {editingParticipant?.id === p.id ? (
                    <input type="number" value={editingParticipant.chips} onChange={(e) => setEditingParticipant({ ...editingParticipant, chips: parseInt(e.target.value, 10) || 0 })} className="input-field !mt-0"/>
                  ) : ( (p.chips || 0).toLocaleString() )}
                </td>
                <td className="p-3">
                  {editingParticipant?.id === p.id ? (
                    <input value={editingParticipant.participationMethod || ''} onChange={(e) => setEditingParticipant({ ...editingParticipant, participationMethod: e.target.value })} className="input-field !mt-0"/>
                  ) : ( p.participationMethod || '-' )}
                </td>
                <td className="p-3 text-right">
                   {editingParticipant?.id === p.id ? (
                    <>
                      <button onClick={handleUpdate} className="btn btn-primary text-xs mr-2">저장</button>
                      <button onClick={() => setEditingParticipant(null)} className="btn btn-secondary text-xs">취소</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(p)} className="btn btn-secondary text-xs mr-2">
                        수정
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="btn bg-red-600 hover:bg-red-700 text-white text-xs">삭제</button>
                    </>
                  )}
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
