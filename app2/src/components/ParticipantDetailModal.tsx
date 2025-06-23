import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Participant } from '../hooks/useParticipants';

interface ParticipantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  onUpdate: (id: string, data: Partial<Participant>) => Promise<void>;
  tableName?: string | null;
  seatNumber?: number | null;
}

const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  isOpen,
  onClose,
  participant,
  onUpdate,
  tableName,
  seatNumber,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Participant>>({});

  useEffect(() => {
    if (participant) {
      setFormData({
        name: participant.name,
        chips: participant.chips,
        phone: participant.phone,
      });
    }
  }, [participant]);

  if (!isOpen || !participant) {
    return null;
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const parsedValue = name === 'chips' ? parseInt(value, 10) || 0 : value;
      setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSave = async () => {
    await onUpdate(participant.id, formData);
    setIsEditing(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="참가자 상세 정보">
        {isEditing ? (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">이름</label>
                    <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="input input-bordered w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">연락처</label>
                    <input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="input input-bordered w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">칩</label>
                    <input type="number" name="chips" value={formData.chips || 0} onChange={handleInputChange} className="input input-bordered w-full" />
                </div>
            </div>
        ) : (
             <div className="space-y-2">
                <div><span className="font-semibold">이름:</span> {participant.name}</div>
                <div><span className="font-semibold">연락처:</span> {participant.phone || 'N/A'}</div>
                <div><span className="font-semibold">칩:</span> {participant.chips.toLocaleString()}</div>
                <div>
                    <span className="font-semibold">상태:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${participant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {participant.status}
                    </span>
                </div>
                <div>
                    <span className="font-semibold">테이블:</span> 
                    {tableName && typeof seatNumber === 'number' ? `${tableName} - S${seatNumber + 1}` : 'N/A'}
                </div>
            </div>
        )}
     
      <div className="flex justify-end mt-6 space-x-2">
        <button onClick={onClose} className="btn">닫기</button>
        {isEditing ? (
            <button onClick={handleSave} className="btn btn-primary">저장</button>
        ) : (
            <button onClick={() => setIsEditing(true)} className="btn btn-secondary">수정</button>
        )}
      </div>
    </Modal>
  );
};

export default ParticipantDetailModal;
