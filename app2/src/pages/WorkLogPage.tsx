import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkLogs, WorkLog } from '../hooks/useWorkLogs';
import { useStaff, Staff } from '../hooks/useStaff';
import { useSettings } from '../hooks/useSettings';
import QRScannerModal from '../components/QRScannerModal';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

// Helper function to calculate distance between two lat/lon points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

const WorkLogPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { workLogs, addWorkLog, updateWorkLog } = useWorkLogs({ staffId: currentUser?.uid });
  const { staff } = useStaff();
  const { settings } = useSettings();

  const [isQRModalOpen, setQRModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myStaffProfile = staff.find(s => s.id === currentUser?.uid);
  const myCurrentLog = workLogs.find(log => log.staffId === currentUser?.uid && log.clockOut === null);
  
  const canClockOut = myCurrentLog && settings.minWorkMinutesForClockOut 
    ? (Date.now() - myCurrentLog.clockIn) / (1000 * 60) >= settings.minWorkMinutesForClockOut
    : false;

  const updateStaffStatus = async (status: Staff['status']) => {
    if (!currentUser) return;
    const staffDocRef = doc(db, 'staff', currentUser.uid);
    await updateDoc(staffDocRef, { status });
  }

  const handleClockIn = async (method: 'gps' | 'qr' | 'manual') => {
    if (!currentUser) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (myCurrentLog) {
      setError("이미 출근한 상태입니다.");
      return;
    }

    let locationData: { latitude: number, longitude: number } | undefined = undefined;

    if (method === 'gps') {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const distance = getDistance(latitude, longitude, settings.venueLocation.latitude, settings.venueLocation.longitude);
          if (distance > settings.venueRadius) {
            setError(`지정된 장소 반경 ${settings.venueRadius}m 외부에 있습니다.`);
            return;
          }
          locationData = { latitude, longitude };
          await createWorkLog('gps', locationData);
        },
        (err) => {
          setError(`GPS 위치를 가져올 수 없습니다: ${err.message}`);
        }
      );
    } else {
        await createWorkLog(method);
    }
  };

  const createWorkLog = async (method: WorkLog['clockInMethod'], locationData?: WorkLog['clockInLocation']) => {
      if (!currentUser) return;
      const newLog: Omit<WorkLog, 'id'> = {
        staffId: currentUser.uid,
        clockIn: Date.now(),
        clockOut: null,
        clockInMethod: method,
        ...(locationData && { clockInLocation: locationData })
      };
      await addWorkLog(newLog);
      await updateStaffStatus('available');
      setError(null);
  }

  const handleClockOut = async () => {
    if (!myCurrentLog) {
      setError("출근 기록이 없습니다.");
      return;
    }
    if(!canClockOut){
      setError(`최소 근무 시간(${settings.minWorkMinutesForClockOut}분)을 채워야 퇴근할 수 있습니다.`);
      return;
    }
    await updateWorkLog(myCurrentLog.id, { clockOut: Date.now() });
    await updateStaffStatus('clocked_out');
  };

  const handleQRScan = async (data: any) => { // data can be an object with a 'text' property or a string
    setQRModalOpen(false);
    const qrText = typeof data === 'object' && data !== null && 'text' in data ? data.text : data;

    if(qrText) {
        // Here you might want to validate the QR data
        // For now, we'll just assume it's a valid clock-in request
        await createWorkLog('qr');
    } else {
        setError("QR 코드 스캔에 실패했습니다.");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">출퇴근 기록</h1>
        
        {myStaffProfile && (
            <div className="card bg-white p-6 shadow-md mb-6">
                <h2 className="text-xl font-bold">{myStaffProfile.name}</h2>
                <p className="text-gray-600">{myStaffProfile.role}</p>
                <p className={`mt-2 font-semibold ${
                    myStaffProfile.status === 'on_table' ? 'text-green-500' :
                    myStaffProfile.status === 'on_break' ? 'text-yellow-500' :
                    myStaffProfile.status === 'available' ? 'text-blue-500' : 'text-gray-500'
                }`}>
                    상태: {myStaffProfile.status || 'N/A'}
                </p>
            </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button onClick={() => handleClockIn('gps')} disabled={!!myCurrentLog} className="btn btn-primary h-20 text-lg">GPS 출근</button>
          <button onClick={() => setQRModalOpen(true)} disabled={!!myCurrentLog} className="btn btn-secondary h-20 text-lg">QR 출근</button>
          <button onClick={handleClockOut} disabled={!myCurrentLog || !canClockOut} className="btn btn-danger col-span-2 h-20 text-lg">퇴근</button>
        </div>

        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">나의 최근 기록</h2>
            {workLogs.length > 0 ? (
                <ul className="space-y-3">
                    {workLogs.map(log => (
                        <li key={log.id} className="bg-white p-4 rounded-lg shadow">
                            <p><strong>출근:</strong> {new Date(log.clockIn).toLocaleString()}</p>
                            <p><strong>퇴근:</strong> {log.clockOut ? new Date(log.clockOut).toLocaleString() : '근무 중'}</p>
                            <p><strong>방식:</strong> {log.clockInMethod.toUpperCase()}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-center">출퇴근 기록이 없습니다.</p>
            )}
        </div>
      </div>

      <QRScannerModal 
        isOpen={isQRModalOpen}
        onClose={() => setQRModalOpen(false)}
        onScan={handleQRScan}
        onError={(e: Error) => setError(`QR 스캔 오류: ${e.message}`)}
      />
    </div>
  );
};

export default WorkLogPage;
