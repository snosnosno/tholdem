import React from 'react';
import Modal from './Modal';
import { Participant } from '../hooks/useParticipants';
import { Table } from '../hooks/useTables';

interface PlayerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Participant | null;
  table: Table | null;
  seatIndex: number | null;
  onBustOut: (participantId: string) => void;
  onMoveSeatClick: () => void;
  onDetailClick: () => void;
}

const PlayerActionModal: React.FC<PlayerActionModalProps> = ({
  isOpen,
  onClose,
  player,
  table,
  seatIndex,
  onBustOut,
  onMoveSeatClick,
  onDetailClick,
}) => {
  if (!isOpen || !player || !table || seatIndex === null) {
    return null;
  }

  const handleBustOut = () => {
    if (window.confirm(`${player.name}님을 정말로 탈락 처리하시겠습니까?`)) {
        onBustOut(player.id);
        onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="플레이어 액션">
      <div>
        <h3 className="text-lg font-bold mb-2">{player.name}</h3>
        <p className="mb-1">
          <span className="font-semibold">테이블:</span> {table.name || `Table ${table.tableNumber}`}
        </p>
        <p className="mb-4">
          <span className="font-semibold">좌석:</span> {seatIndex + 1}
        </p>

        <div className="space-y-2">
            <button
                onClick={handleBustOut}
                className="w-full btn btn-danger"
            >
                탈락 처리 (Bust Out)
            </button>
            <button
                onClick={onMoveSeatClick}
                className="w-full btn btn-secondary"
            >
                자리 이동 (Move Seat)
            </button>
             <button
                onClick={onDetailClick}
                className="w-full btn btn-info"
            >
                상세 정보 보기
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default PlayerActionModal;
