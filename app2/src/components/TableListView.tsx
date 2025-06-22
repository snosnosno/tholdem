import React from 'react';
import { Table } from '../hooks/useTables';

interface TableListViewProps {
  tables: Table[];
  getParticipantName: (id: string | null) => string;
  onPlayerSelect: (participantId: string, tableId: string, seatIndex: number) => void;
}

const TableListView: React.FC<TableListViewProps> = ({ tables, getParticipantName, onPlayerSelect }) => {
  return (
    <div className="space-y-4">
      {tables.map((table) => (
        <div key={table.id} className="bg-white rounded-lg p-4 shadow-md" style={{ border: `2px solid ${table.borderColor || '#eee'}` }}>
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            {table.name}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({(table.seats || []).filter(s => s !== null).length} / {(table.seats || []).length})
            </span>
          </h3>
          <ul className="divide-y divide-gray-200">
            {(table.seats || []).map((participantId, index) => {
              const participantName = getParticipantName(participantId);
              const hasParticipant = participantId && participantName !== '알수없음';
              
              return (
                <li
                  key={index}
                  onClick={() => hasParticipant && onPlayerSelect(participantId, table.id, index)}
                  className={`flex items-center justify-between p-2 text-sm ${hasParticipant ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  <span className="font-semibold text-gray-600">Seat {index + 1}</span>
                  <span className={`font-medium ${hasParticipant ? 'text-blue-600' : 'text-gray-400'}`}>
                    {participantName}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default TableListView; 