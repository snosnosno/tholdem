import React from 'react';
import Modal from './Modal';
import { Participant } from '../hooks/useParticipants';

interface ParticipantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  tableName?: string | null; // tableNumber에서 tableName으로 변경
  seatNumber?: number | null;
}

const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  isOpen,
  onClose,
  participant,
  tableName, // tableNumber에서 tableName으로 변경
  seatNumber,
}) => {
  if (!isOpen || !participant) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="참가자 상세 정보">
      <div className="space-y-2">
        <div>
          <span className="font-semibold">이름:</span> {participant.name}
        </div>
        <div>
          <span className="font-semibold">ID:</span> <code className="text-sm bg-gray-100 p-1 rounded">{participant.id}</code>
        </div>
        <div>
          <span className="font-semibold">연락처:</span> {participant.phone || 'N/A'}
        </div>
        <div>
          <span className="font-semibold">고유 식별자:</span> {participant.playerIdentifier || 'N/A'}
        </div>
        <div>
          <span className="font-semibold">참가 방법:</span> {participant.participationMethod || 'N/A'}
        </div>
        <div>
          <span className="font-semibold">칩:</span> {participant.chips.toLocaleString()}
        </div>
        <div>
          <span className="font-semibold">상태:</span>
          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
              participant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {participant.status}
          </span>
        </div>
        {/* 테이블 정보 표시 로직 수정 */}
        <div>
          <span className="font-semibold">테이블:</span> 
          {tableName && typeof seatNumber === 'number' 
            ? `${tableName} - S${seatNumber + 1}` 
            : 'N/A'}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn btn-primary">
          닫기
        </button>
      </div>
    </Modal>
  );
};

export default ParticipantDetailModal;
