import React from 'react';

interface PlayerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  onBustOut: () => void;
  onMoveSeat: () => void;
}

const PlayerActionModal: React.FC<PlayerActionModalProps> = ({
  isOpen,
  onClose,
  position,
  onBustOut,
  onMoveSeat,
}) => {
  if (!isOpen) {
    return null;
  }
  
  return (
    <div
      className="absolute z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-48">
            <ul className="divide-y divide-gray-200">
                <li>
                    <button
                        onClick={onBustOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        탈락 처리 (Bust Out)
                    </button>
                </li>
                <li>
                    <button
                        onClick={onMoveSeat}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        자리 이동 (Move Seat)
                    </button>
                </li>
                 <li>
                    <button
                        onClick={onClose}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        취소
                    </button>
                </li>
            </ul>
        </div>
    </div>
  );
};

export default PlayerActionModal;
