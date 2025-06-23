import React, { useState, useMemo } from 'react';
import { useStaff, Staff } from '../hooks/useStaff';
import { useTables, Table } from '../hooks/useTables';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FaSyncAlt } from 'react-icons/fa';

const DealerRotationPage: React.FC = () => {
  const { staff, loading: staffLoading, error: staffError } = useStaff();
  const { tables, loading: tablesLoading, error: tablesError } = useTables();
  
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const dealers = useMemo(() => staff.filter(s => s.role === 'Dealer'), [staff]);
  
  const availableDealers = useMemo(() => dealers.filter(d => d.status === 'available'), [dealers]);
  const onBreakDealers = useMemo(() => dealers.filter(d => d.status === 'on_break'), [dealers]);
  const onTableDealers = useMemo(() => dealers.filter(d => d.status === 'on_table'), [dealers]);

  const loading = staffLoading || tablesLoading;
  const error = staffError || tablesError;

  const handleManualAssign = async (dealerId: string) => {
    if (!selectedTable) {
      alert('배정할 테이블을 먼저 선택하세요.');
      return;
    }
    setIsAssigning(true);
    try {
      const functions = getFunctions();
      const assignDealer = httpsCallable(functions, 'assignDealerManually');
      await assignDealer({ tableId: selectedTable, dealerId });
      alert(`딜러를 테이블 ${selectedTable}에 성공적으로 배정했습니다.`);
      setSelectedTable(null); // Reset selection after assignment
    } catch (error) {
      console.error('Error assigning dealer manually:', error);
      alert(`수동 배정 중 오류가 발생했습니다: ${error}`);
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) return <div className="p-4">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-500">오류: {error.message}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">딜러 로테이션 현황판</h1>
        <button className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100">
          <FaSyncAlt className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 대기 중인 딜러 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-green-600">대기중인 딜러 ({availableDealers.length})</h2>
          <div className="space-y-3">
            {availableDealers.map(dealer => (
              <div key={dealer.id} className="p-3 bg-green-50 rounded-md flex justify-between items-center">
                <span className="font-medium">{dealer.name}</span>
                <button 
                  onClick={() => handleManualAssign(dealer.id)}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
                  disabled={!selectedTable || isAssigning}
                >
                  {isAssigning ? '배정중...' : '배정'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 휴식 중인 딜러 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-yellow-600">휴식중인 딜러 ({onBreakDealers.length})</h2>
          <div className="space-y-3">
            {onBreakDealers.map(dealer => (
              <div key={dealer.id} className="p-3 bg-yellow-50 rounded-md">
                <span className="font-medium">{dealer.name}</span>
                {/* 휴식 종료 시간 표시 */}
              </div>
            ))}
          </div>
        </div>
        
        {/* 테이블 목록 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">테이블 목록 ({tables.length})</h2>
          <div className="space-y-3">
            {tables.map(table => (
              <div 
                key={table.id} 
                className={`p-3 rounded-md cursor-pointer ${selectedTable === table.id ? 'bg-blue-200 ring-2 ring-blue-500' : 'bg-blue-50'}`}
                onClick={() => setSelectedTable(table.id)}
              >
                <span className="font-medium">테이블 {table.tableNumber}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 활동 중인 딜러 및 테이블 현황 */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">활동 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {onTableDealers.map(dealer => {
            const assignedTable = tables.find(t => t.id === dealer.assignedTableId);
            return (
              <div key={dealer.id} className="p-4 border rounded-lg bg-gray-50 text-center">
                <p className="font-bold text-lg">{dealer.name}</p>
                <p className="text-sm text-gray-600">
                  {assignedTable ? `테이블 ${assignedTable.tableNumber}` : '배정 정보 없음'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DealerRotationPage;
