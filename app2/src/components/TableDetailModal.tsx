import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Table } from '../hooks/useTables';
import { Seat } from './Seat';
import Modal from './Modal';

interface TableDetailModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  getParticipantName: (id: string | null) => string;
  onMoveSeat: (
    participantId: string,
    from: { tableId: string; seatIndex: number },
    to: { tableId: string; seatIndex: number }
  ) => void;
  onBustOut: (participantId: string, tableId: string) => void;
  onPlayerSelect: (participantId: string, tableId: string, seatIndex: number) => void;
  updateTableDetails: (tableId: string, data: { name?: string; borderColor?: string }) => void;
  onCloseTable: (tableId: string) => void;
  isDimmed?: boolean;
}

const PRESET_COLORS = [
  '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7D842', '#8A2BE2', '#32CD32', '#FF8C00'
];

const TableDetailModal: React.FC<TableDetailModalProps> = ({
  table,
  isOpen,
  onClose,
  getParticipantName,
  onMoveSeat,
  onBustOut,
  onPlayerSelect,
  updateTableDetails,
  onCloseTable,
  isDimmed = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tableName, setTableName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (table) {
      setTableName(table.name || '');
    }
  }, [table]);

  if (!table) return null;

  const handleNameUpdate = (e: React.FocusEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (tableName.trim() && tableName !== table.name) {
      updateTableDetails(table.id, { name: tableName.trim() });
    }
    setIsEditingName(false);
  };

  const handleColorSelect = (e: React.MouseEvent, color: string) => {
    e.stopPropagation();
    updateTableDetails(table.id, { borderColor: color });
    setShowColorPicker(false);
  }

  const handleCloseTableClick = () => {
    if (table) {
      onCloseTable(table.id);
      onClose();
    }
  };

  const totalSeats = (table.seats || []).length;
  const filledSeats = (table.seats || []).filter(s => s !== null).length;
  const emptySeatCount = totalSeats - filledSeats;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <DndProvider backend={HTML5Backend}>
        <div className="relative">
          {isDimmed && <div className="absolute inset-0 bg-black bg-opacity-50 z-10 rounded-md" aria-hidden="true"></div>}
          
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: table.borderColor || '#cccccc' }}
                    title="테두리 색상 변경"
                />
                {showColorPicker && (
                    <div className="absolute z-30 top-8 left-0 bg-white p-2 rounded-md shadow-lg flex gap-2">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={(e) => handleColorSelect(e, color)}
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                )}
              </div>
              {isEditingName ? (
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => {e.stopPropagation(); setTableName(e.target.value);}}
                  onBlur={handleNameUpdate}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate(e)}
                  className="font-bold text-xl text-gray-800 border-b-2 border-blue-500 focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h2
                  className="text-xl font-bold text-gray-800 cursor-pointer"
                  onClick={() => setIsEditingName(true)}
                >
                  {table.name || `Table ${table.tableNumber}`}
                </h2>
              )}
            </div>
            <div className="flex items-center">
                <div className="text-sm text-gray-600 space-x-4 mr-4">
                    <span>참가자: {filledSeats}/{totalSeats}</span>
                    <span>빈 좌석: {emptySeatCount}</span>
                </div>
                <button
                  onClick={handleCloseTableClick}
                  className="btn btn-sm text-white bg-red-500 hover:bg-red-600 border-none"
                >
                  테이블 닫기
                </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 text-center">
            {(table.seats || []).map((participantId, i) => (
              <div key={i} onClick={() => participantId && onPlayerSelect(participantId, table.id, i)}>
                <Seat
                  table={table}
                  seatIndex={i}
                  participantId={participantId}
                  getParticipantName={getParticipantName}
                  onMoveSeat={onMoveSeat}
                  onBustOut={() => participantId && onBustOut(participantId, table.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </DndProvider>
    </Modal>
  );
};

export default TableDetailModal;
