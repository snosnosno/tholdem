import React, { useState } from 'react';
import { Table } from '../hooks/useTables';
import { Seat as SeatComponent, SeatProps } from '../pages/TablesPage';

interface TableCardProps {
  table: Table;
  getParticipantName: (id: string | null) => string;
  onMoveSeat: (
    participantId: string,
    from: { tableId: string; seatIndex: number },
    to: { tableId: string; seatIndex: number }
  ) => void;
  onBustOut: (participantId: string) => void;
  onCloseTable: (tableId: string) => void;
  updateTableDetails: (tableId: string, data: { name?: string; borderColor?: string }) => void;
  onPlayerSelect: (participantId: string, tableId: string, seatIndex: number) => void;
  isProcessing: boolean;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7D842', '#8A2BE2', '#32CD32', '#FF8C00'
];

const TableCard: React.FC<TableCardProps> = ({
  table,
  getParticipantName,
  onMoveSeat,
  onBustOut,
  onCloseTable,
  updateTableDetails,
  onPlayerSelect,
  isProcessing
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tableName, setTableName] = useState(table.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleNameUpdate = () => {
    if (tableName.trim() && tableName !== table.name) {
      updateTableDetails(table.id, { name: tableName.trim() });
    }
    setIsEditingName(false);
  };

  const handleColorSelect = (color: string) => {
    updateTableDetails(table.id, { borderColor: color });
    setShowColorPicker(false);
  }

  return (
    <div
      key={table.id}
      className="bg-white rounded-lg p-4 flex flex-col shadow-md transition-all duration-300"
      style={{ border: `3px solid ${table.borderColor || 'transparent'}` }}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
            <div className="relative">
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: table.borderColor || '#cccccc' }}
                    title="테두리 색상 변경"
                />
                {showColorPicker && (
                    <div className="absolute z-10 top-8 left-0 bg-white p-2 rounded-md shadow-lg flex gap-2">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => handleColorSelect(color)}
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
                onChange={(e) => setTableName(e.target.value)}
                onBlur={handleNameUpdate}
                onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate()}
                className="font-bold text-lg text-gray-800 border-b-2 border-blue-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <h3
                className="font-bold text-lg text-gray-800 cursor-pointer"
                onClick={() => setIsEditingName(true)}
              >
                {table.name}
              </h3>
            )}
        </div>
        
        <div className="flex items-center">
            <span className="text-sm font-normal text-gray-500 mr-4">
              ({(table.seats || []).filter(s => s !== null).length} / {(table.seats || []).length})
            </span>
            <button
              onClick={() => onCloseTable(table.id)}
              className="text-red-500 hover:text-red-700 font-bold"
              disabled={isProcessing}
              title="테이블 닫기"
            >
              X
            </button>
        </div>
      </div>
      <div className="flex-grow grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 text-center">
        {(table.seats || []).map((participantId, i) => (
          <div key={i} onClick={() => participantId && onPlayerSelect(participantId, table.id, i)}>
            <SeatComponent
              table={table}
              seatIndex={i}
              participantId={participantId}
              getParticipantName={getParticipantName}
              onMoveSeat={onMoveSeat}
              onBustOut={onBustOut}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableCard; 