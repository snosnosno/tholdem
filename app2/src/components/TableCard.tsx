import React from 'react';
import { Table } from '../hooks/useTables';
import { useDraggable } from '@dnd-kit/core';

interface TableCardProps {
  table: Table;
  activateTable: (tableId: string) => void;
  onTableSelect: (table: Table) => void;
  isProcessing: boolean;
  isDraggable: boolean;
  style?: React.CSSProperties;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  activateTable,
  onTableSelect,
  isProcessing,
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

  const combinedStyle = {
    ...style,
    border: `3px solid ${isStandby ? '#A0AEC0' : (table.borderColor || 'transparent')}`,
    ...draggableStyle,
  };
  
  const handleActivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    activateTable(table.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTableSelect(table);
  };

  const cardClasses = `rounded-lg p-3 flex flex-col shadow-md transition-all duration-300 ${
    isDraggable ? 'transform' : ''
  } ${
    isStandby 
      ? 'bg-gray-100' 
      : 'bg-white'
  } ${
    isDraggable && !isStandby ? 'hover:shadow-lg hover:scale-105' : ''
  }`;

  return (
    <div
      ref={setNodeRef}
      key={table.id}
      className={cardClasses}
      style={combinedStyle}
    >
      <div className="flex justify-between items-center w-full"> 
        <div className="flex items-center gap-2 flex-grow min-w-0">
            {isDraggable && (
                <button {...listeners} {...attributes} className="cursor-grab touch-none p-1 text-gray-400 hover:text-gray-600 flex-shrink-0" title="테이블 위치 이동">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 5.5C10 6.32843 9.32843 7 8.5 7C7.67157 7 7 6.32843 7 5.5C7 4.67157 7.67157 4 8.5 4C9.32843 4 10 4.67157 10 5.5ZM10 12C10 12.8284 9.32843 13.5 8.5 13.5C7.67157 13.5 7 12.8284 7 12C7 11.1716 7.67157 10.5 8.5 10.5C9.32843 10.5 10 11.1716 10 12ZM10 18.5C10 19.3284 9.32843 20 8.5 20C7.67157 20 7 19.3284 7 18.5C7 17.6716 7.67157 17 8.5 17C9.32843 17 10 17.6716 10 18.5ZM17 5.5C17 6.32843 16.3284 7 15.5 7C14.6716 7 14 6.32843 14 5.5C14 4.67157 14.6716 4 15.5 4C16.3284 4 17 4.67157 17 5.5ZM17 12C17 12.8284 16.3284 13.5 15.5 13.5C14.6716 13.5 14 12.8284 14 12C14 11.1716 14.6716 10.5 15.5 10.5C16.3284 10.5 17 11.1716 17 12ZM17 18.5C17 19.3284 16.3284 20 15.5 20C14.6716 20 14 19.3284 14 18.5C14 17.6716 14.6716 17 15.5 17C16.3284 17 17 17.6716 17 18.5Z"/></svg>
                </button>
            )}
            <span className="font-bold text-lg text-gray-800 truncate" title={table.name || `Table ${table.tableNumber}`}>{table.name || `Table ${table.tableNumber}`}</span>
            <span className="text-sm font-normal text-gray-500 ml-2 flex-shrink-0">
              ({(table.seats || []).filter(s => s !== null).length} / {(table.seats || []).length})
            </span>
            {isStandby && (
              <span className="ml-auto mr-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800 flex-shrink-0">
                대기 중
              </span>
            )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
            {!isStandby && (
              <button 
                onClick={handleEditClick}
                className="p-1 text-gray-500 hover:text-gray-800" 
                disabled={isProcessing}
                title="테이블 메뉴"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            )}
        </div>
      </div>
      
      {isStandby && (
        <div className="flex items-center justify-center mt-2">
          <button 
            onClick={handleActivateClick}
            className="btn btn-primary btn-xs"
            style={{ height: 'auto', minHeight: '0', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}
            disabled={isProcessing}
          >
            활성화
          </button>
        </div>
      )}
    </div>
  );
};

export default TableCard;
