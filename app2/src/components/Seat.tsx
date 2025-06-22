import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Table } from '../hooks/useTables';

const ItemTypes = {
  SEAT: 'seat',
};

export interface SeatProps {
  table: Table;
  seatIndex: number;
  participantId: string | null;
  getParticipantName: (id: string | null) => string;
  onMoveSeat: (
    participantId: string,
    from: { tableId: string; seatIndex: number },
    to: { tableId: string; seatIndex: number }
  ) => void;
  onBustOut: (participantId: string) => void;
}

export const Seat: React.FC<SeatProps> = ({ table, seatIndex, participantId, getParticipantName, onMoveSeat }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SEAT,
    item: { participantId, from: { tableId: table.id, seatIndex } },
    canDrag: !!participantId,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [participantId, table.id, seatIndex]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.SEAT,
    drop: (item: { participantId: string; from: { tableId: string; seatIndex: number } }) => {
      if (item.participantId) {
        onMoveSeat(item.participantId, item.from, { tableId: table.id, seatIndex });
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [table.id, seatIndex, onMoveSeat]);

  const participantName = getParticipantName(participantId);

  return (
    <div
      ref={(node) => drag(drop(node))}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`relative p-2 rounded-md h-16 flex flex-col justify-center items-center text-xs group 
        ${participantId ? 'bg-blue-100 text-blue-800 cursor-pointer' : 'bg-gray-200 border-2 border-dashed border-gray-400'}
        ${isOver ? 'ring-2 ring-yellow-400' : ''}
      `}
    >
      <span className="font-bold text-sm mb-1">{seatIndex + 1}</span>
      <span className="font-semibold">{participantName}</span>
    </div>
  );
};
