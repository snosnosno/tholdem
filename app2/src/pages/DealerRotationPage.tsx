import React, { useMemo } from 'react';
import { useStaff } from '../hooks/useStaff';
import { useTables } from '../hooks/useTables';
import DealerStatusGrid from '../components/DealerStatusGrid';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase'; // Assuming you have this export from your firebase.ts

const assignDealerManuallyCallable = httpsCallable(functions, 'assignDealerManually');

const DealerRotationPage: React.FC = () => {
  const { staff, loading: staffLoading, error: staffError } = useStaff();
  const { tables, loading: tablesLoading, error: tablesError } = useTables();

  const dealers = useMemo(() => staff.filter(s => s.role === 'Dealer'), [staff]);

  const handleAssignDealer = async (dealerId: string, tableId: string) => {
    try {
      await assignDealerManuallyCallable({ dealerId, tableId });
      console.log(`Successfully triggered assignment of ${dealerId} to ${tableId}`);
    } catch (error) {
      console.error("Failed to assign dealer:", error);
      // You could show an error toast to the user here
    }
  };

  const isLoading = staffLoading || tablesLoading;
  const error = staffError || tablesError;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">실시간 딜러 현황판</h1>
        
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        
        {!isLoading && !error && (
          <DealerStatusGrid 
            dealers={dealers} 
            tables={tables}
            onAssignDealer={handleAssignDealer}
          />
        )}
      </div>
    </div>
  );
};

export default DealerRotationPage;
