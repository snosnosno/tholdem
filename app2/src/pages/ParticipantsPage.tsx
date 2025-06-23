import React, { useState, useMemo, useCallback } from 'react';
import { useParticipants, Participant } from '../hooks/useParticipants';
import { useTables, Table } from '../hooks/useTables';
import Modal from '../components/Modal';

const ParticipantsPage: React.FC = () => {
  const { participants, loading: participantsLoading, error: participantsError, addParticipant, updateParticipant, deleteParticipant, addParticipantAndAssignToSeat } = useParticipants();
  const { tables, loading: tablesLoading, error: tablesError } = useTables();

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newParticipant, setNewParticipant] = useState<Omit<Participant, 'id'>>({ name: '', phone: '', playerIdentifier: '', participationMethod: '', chips: 10000, status: 'active' as const });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const participantLocations = useMemo(() => {
    const locations = new Map<string, string>();
    tables.forEach((table: Table) => {
      (table.seats || []).forEach((participantId: string | null, seatIndex: number) => {
        if (participantId) {
            locations.set(participantId, `${table.name || `T${table.tableNumber}`}-${seatIndex + 1}`);
        }
      });
    });
    return locations;
  }, [tables]);
  
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [participants, searchTerm]);

  const handleOpenModal = (participant: Participant | null) => {
    setEditingParticipant(participant);
    if (participant) {
      setNewParticipant(participant);
    } else {
      setNewParticipant({ name: '', phone: '', playerIdentifier: '', participationMethod: '', chips: 10000, status: 'active' as const });
    }
    setIsModalOpen(true);
  };
  
  const handleAddOrUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if(editingParticipant) {
      await updateParticipant(editingParticipant.id, newParticipant);
    } else {
      await addParticipant(newParticipant);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      await deleteParticipant(id);
    }
  };

  const getParticipantLocation = useCallback((participantId: string) => {
    return participantLocations.get(participantId) || '대기중';
  }, [participantLocations]);

  if (participantsLoading || tablesLoading) return <div>로딩 중...</div>;
  if (participantsError) return <div className="text-red-500">참가자 로딩 오류: {participantsError.message}</div>;
  if (tablesError) return <div className="text-red-500">테이블 로딩 오류: {tablesError.message}</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">참가자 관리</h1>
      <div className="mb-4 flex gap-2">
        <input 
          type="text"
          placeholder="이름으로 검색"
          className="input-field w-full md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => handleOpenModal(null)} className="btn btn-primary">
          + 참가자 추가
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">연락처</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2">칩</th>
              <th className="px-4 py-2">위치</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((p: Participant) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.phone}</td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2">{p.chips}</td>
                <td className="px-4 py-2">{getParticipantLocation(p.id)}</td>
                <td className="px-4 py-2">
                  <button onClick={() => handleOpenModal(p)} className="btn btn-secondary btn-xs mr-2">수정</button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-danger btn-xs">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingParticipant ? '참가자 수정' : '참가자 추가'}>
        <form onSubmit={handleAddOrUpdateParticipant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이름</label>
            <input type="text" value={newParticipant.name} onChange={e => setNewParticipant(p => ({ ...p, name: e.target.value }))} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">연락처</label>
            <input type="text" value={newParticipant.phone} onChange={e => setNewParticipant(p => ({ ...p, phone: e.target.value }))} className="input-field w-full" />
          </div>
           <div>
            <label className="block text-sm font-medium mb-1">칩</label>
            <input type="number" value={newParticipant.chips} onChange={e => setNewParticipant(p => ({ ...p, chips: Number(e.target.value) }))} className="input-field w-full" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">취소</button>
            <button type="submit" className="btn btn-primary">{editingParticipant ? '수정' : '추가'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ParticipantsPage;
