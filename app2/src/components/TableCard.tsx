import React, { useState } from 'react';
import { Table } from '../hooks/useTables';

interface TableCardProps {
  table: Table;
  onCloseTable: (tableId: string) => void;
  updateTableDetails: (tableId: string, data: { name?: string; borderColor?: string }) => void;
  activateTable: (tableId: string) => void;
  onTableSelect: (table: Table) => void;
  isProcessing: boolean;
}

const PRESET_COLORS = [
  '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7D842', '#8A2BE2', '#32CD32', '#FF8C00'
];

const TableCard: React.FC<TableCardProps> = ({
  table,
  onCloseTable,
  updateTableDetails,
  activateTable,
  onTableSelect,
  isProcessing
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tableName, setTableName] = useState(table.name || '');

  const isStandby = table.status === 'standby';

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
  }
  
  const handleActivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    activateTable(table.id);
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCloseTable(table.id);
  }

  const [showColorPicker, setShowColorPicker] = useState(false);

  const cardClasses = `rounded-lg p-3 flex flex-col shadow-md transition-all duration-300 ${ // p-4 -> p-3
    isStandby 
      ? 'bg-gray-100' 
      : 'bg-white cursor-pointer hover:shadow-lg hover:scale-105'
  }`;

  return (
    <div
      key={table.id}
      className={cardClasses}
      style={{ border: `3px solid ${isStandby ? '#A0AEC0' : (table.borderColor || 'transparent')}` }}
      onClick={() => !isStandby && onTableSelect(table)}
    >
      <div className="flex justify-between items-center mb-2"> 
        <div className="flex items-center gap-2">
            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: isStandby ? '#A0AEC0' : (table.borderColor || '#cccccc') }}
                    title="테두리 색상 변경"
                    disabled={isStandby}
                />
                {showColorPicker && (
                    <div className="absolute z-10 top-8 left-0 bg-white p-2 rounded-md shadow-lg flex gap-2">
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
                className="font-bold text-lg text-gray-800 border-b-2 border-blue-500 focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className="font-bold text-lg text-gray-800"
                onClick={handleEditClick}
              >
                {table.name || `Table ${table.tableNumber}`}
              </h3>
            )}
            {isStandby && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">
                대기 중
              </span>
            )}
        </div>
        
        <div className="flex items-center">
            <span className="text-sm font-normal text-gray-500 mr-4">
              ({(table.seats || []).filter(s => s !== null).length} / {(table.seats || []).length})
            </span>
            <button
              onClick={handleCloseClick}
              className="text-red-500 hover:text-red-700 font-bold"
              disabled={isProcessing}
              title="테이블 닫기"
            >
              X
            </button>
        </div>
      </div>
      
      {isStandby && (
        <div className="flex items-center justify-center mt-1">
          <button 
            onClick={handleActivateClick}
            className="btn btn-primary w-full btn-sm"
            disabled={isProcessing}
          >
            테이블 활성화
          </button>
        </div>
      )}
    </div>
  );
};

export default TableCard;
