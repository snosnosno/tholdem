import React from 'react';
import { Table } from '../hooks/useTables';
import { Participant } from '../hooks/useParticipants';
import { useDraggable } from '@dnd-kit/core';

interface TableCardProps {
  table: Table;
  participants: Participant[];
  onTableClick: () => void;
  onPlayerSelect: (participant: Participant | null, table: Table, seatIndex: number, event?: React.MouseEvent) => void;
  isMobile: boolean;
  getParticipantName: (participantId: string | null) => string;
  getDealerName: (dealerId: string | null) => string;
  isDraggable?: boolean;
  style?: React.CSSProperties;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  onTableClick,
  onPlayerSelect,
  isMobile,
  getParticipantName,
  getDealerName,
  isDraggable,
  style,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
    disabled: !isDraggable,
  });
  
  const isStandby = table.status === 'standby';

  const draggableStyle = isDraggable ? {
    '--tw-translate-x': transform ? `${transform.x}px` : '0px',
    '--tw-translate-y': transform ? `${transform.y}px` : '0px',
  } : {};
  
  const combinedStyle = { ...style, ...draggableStyle };

  const getSeatClass = (participantId: string | null) => {
    return participantId
      ? 'bg-blue-500 hover:bg-blue-700 text-white'
      : 'bg-gray-300 hover:bg-gray-400';
  };
  
  const handleSeatClick = (e: React.MouseEvent, participantId: string | null, seatIndex: number) => {
      e.stopPropagation();
      onPlayerSelect(null, table, seatIndex, e);
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={`relative p-3 rounded-lg shadow-lg flex flex-col items-center justify-center transition-all ${isDraggable ? 'transform' : ''} ${isStandby ? 'bg-gray-200' : 'bg-white'}`}
      onClick={onTableClick}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
    >
      <div className="w-full text-center mb-2">
        <p className="font-bold text-lg truncate">{table.name || `Table ${table.tableNumber}`}</p>
        <p className="text-sm text-gray-500">
          딜러: {getDealerName(table.assignedDealerId || null)}
        </p>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-5' : 'grid-cols-5'} gap-2 w-full`}>
        {(table.seats || []).map((participantId, index) => (
          <button
            key={index}
            onClick={(e) => handleSeatClick(e, participantId, index)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-transform transform hover:scale-110 ${getSeatClass(participantId)}`}
          >
            {getParticipantName(participantId).substring(0, 3) || index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableCard;
