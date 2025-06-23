import React from 'react';
import { Staff } from '../hooks/useStaff';
import { Table } from '../hooks/useTables';

interface DealerStatusGridProps {
  dealers: Staff[];
  tables: Table[];
  onAssignDealer: (dealerId: string, tableId: string) => void; // Placeholder for future drag-drop
}

const DealerStatusGrid: React.FC<DealerStatusGridProps> = ({ dealers, tables, onAssignDealer }) => {

  const getStatusColor = (status: Staff['status']) => {
    switch (status) {
      case 'on_table':
        return 'bg-green-100';
      case 'on_break':
        return 'bg-yellow-100';
      case 'available':
        return 'bg-blue-100';
      case 'clocked_out':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-white';
    }
  };

  const getTableName = (tableId: string | null | undefined) => {
    if (!tableId) return 'N/A';
    return tables.find(t => t.id === tableId)?.name || 'Unknown Table';
  }
  
  // Simple time formatter for display
  const formatMinutes = (minutes: number = 0) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow-md rounded-lg">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Assigned Table</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Work Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Break Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dealers.map((dealer) => (
            <tr key={dealer.id} className={`${getStatusColor(dealer.status)} hover:bg-gray-50`}>
              <td className="px-6 py-4 whitespace-nowrap">{dealer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    dealer.status === 'on_table' ? 'bg-green-200 text-green-800' :
                    dealer.status === 'on_break' ? 'bg-yellow-200 text-yellow-800' :
                    dealer.status === 'available' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'
                }`}>
                    {dealer.status || 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{getTableName(dealer.assignedTableId)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMinutes(dealer.totalWorkMinutes)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{formatMinutes(dealer.totalBreakMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DealerStatusGrid;
