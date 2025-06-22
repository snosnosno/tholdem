import React from 'react';
import { Table } from '../hooks/useTables';

interface TableListViewProps {
  tables: Table[];
  onTableSelect: (table: Table) => void;
}

const TableListView: React.FC<TableListViewProps> = ({ tables, onTableSelect }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-4 font-bold text-gray-600 px-4 py-2 border-b-2">
        <span>테이블 이름</span>
        <span className="text-center">참가자</span>
        <span className="text-right">빈 좌석</span>
      </div>
      {tables.map((table) => (
        <div 
          key={table.id} 
          className="grid grid-cols-3 gap-4 items-center bg-white rounded-lg p-4 shadow-md cursor-pointer hover:bg-gray-50"
          style={{ borderLeft: `4px solid ${table.borderColor || '#eee'}` }}
          onClick={() => onTableSelect(table)}
        >
          <span className="font-bold text-lg text-gray-800">
            {table.name || `Table ${table.tableNumber}`}
          </span>
          <span className="text-center font-mono text-blue-600">
            {(table.seats || []).filter(s => s !== null).length} / {(table.seats || []).length}
          </span>
          <span className="text-right font-mono text-green-600">
            {(table.seats || []).filter(s => s === null).length}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TableListView;
