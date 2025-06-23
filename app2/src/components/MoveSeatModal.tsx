import React, { useState } from 'react';
import Modal from './Modal';
import { Table } from '../hooks/useTables';
import { Participant } from '../hooks/useParticipants';

interface MoveSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  movingParticipant: Participant | null;
  onConfirmMove: (tableId: string, seatIndex: number) => void;
  getParticipantName: (participantId: string | null) => string;
}

const MoveSeatModal: React.FC<MoveSeatModalProps> = ({
  isOpen,
  onClose,
  tables,
  movingParticipant,
  onConfirmMove,
  getParticipantName,
}) => {
  const [selectedSeat, setSelectedSeat] = useState<{ tableId: string; seatIndex: number } | null>(null);

  if (!isOpen || !movingParticipant) return null;

  const handleSeatSelect = (tableId: string, seatIndex: number, participantId: string | null, tableStatus?: string) => {
    // FIX: Use a looser check for empty seat (!participantId) to handle both null and undefined.
    if (!participantId && tableStatus === 'open') {
      setSelectedSeat({ tableId, seatIndex });
    }
  };

  const handleConfirm = () => {
    if (selectedSeat) {
      onConfirmMove(selectedSeat.tableId, selectedSeat.seatIndex);
      setSelectedSeat(null);
    }
  };
  
  const currentSeatInfo = tables.flatMap(t => t.seats.map((pId, sIdx) => ({pId, tId: t.id, sIdx})))
                                .find(s => s.pId === movingParticipant.id);
  const currentTable = tables.find(t => t.id === currentSeatInfo?.tId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${movingParticipant.name}님 자리 이동`}>
        <div className="mb-4 bg-blue-50 p-3 rounded-lg">
            <h4 className="font-bold text-blue-800">이동 대상 플레이어</h4>
            <p><strong>이름:</strong> {movingParticipant.name}</p>
            <p><strong>현재 위치:</strong> {currentTable?.name || `Table ${currentTable?.tableNumber}`} - {currentSeatInfo ? currentSeatInfo.sIdx + 1 : 'N/A'}번 좌석</p>
        </div>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
        {tables.map(table => (
          <div key={table.id} className={`border rounded-lg p-3 ${table.status !== 'open' ? 'bg-gray-100 opacity-70' : ''}`}>
            <h4 className="font-bold text-lg mb-2">{table.name || `Table ${table.tableNumber}`} <span className="text-sm font-normal text-gray-500">({table.status})</span></h4>
            <div className="grid grid-cols-5 gap-2">
              {table.seats.map((participantId, seatIndex) => {
                const isSelected = selectedSeat?.tableId === table.id && selectedSeat?.seatIndex === seatIndex;
                const isSelectable = !participantId && table.status === 'open';

                return (
                  <div
                    key={seatIndex}
                    onClick={() => handleSeatSelect(table.id, seatIndex, participantId, table.status)}
                    className={`relative p-2 rounded-md h-16 flex flex-col justify-center items-center text-xs group
                      ${isSelectable ? 'cursor-pointer bg-green-100 text-green-800 border-2 border-dashed border-green-400' : 'bg-gray-300 text-gray-600'}
                      ${isSelected ? 'ring-4 ring-blue-500' : ''}
                    `}
                  >
                    <span className="font-bold text-sm mb-1">{seatIndex + 1}</span>
                    <span className="font-semibold">{getParticipantName(participantId)}</span>
                    {participantId && <span className="text-xs text-gray-500">(자리 있음)</span>}
                    {!participantId && table.status === 'open' && <span className="text-xs text-green-600">(빈 자리)</span>}
                    {!participantId && table.status !== 'open' && <span className="text-xs text-gray-500">(이동 불가)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn btn-secondary mr-2">
          취소
        </button>
        <button onClick={handleConfirm} className="btn btn-primary" disabled={!selectedSeat}>
          이동 확인
        </button>
      </div>
    </Modal>
  );
};


export default MoveSeatModal;
