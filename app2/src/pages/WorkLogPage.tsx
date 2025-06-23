import React, { useState } from 'react';
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
  const { settings, loading: settingsLoading } = useSettings();

  const [isQRModalOpen, setQRModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myStaffProfile = staff.find((s: Staff) => s.id === currentUser?.uid);
  const myCurrentLog = workLogs.find((log: WorkLog) => log.clockOut === null);
  
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
        if (!settings.gpsClockInEnabled) {
            setError("GPS 출근 기능이 비활성화되어 있습니다.");
            return;
        }
        if (!settings.allowedLocation) {
            setError("GPS 출근을 위한 기준 위치가 설정되지 않았습니다.");
            return;
        }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const { latitude: targetLat, longitude: targetLon, radius } = settings.allowedLocation!;
          const distance = getDistance(latitude, longitude, targetLat, targetLon);
          
          if (distance > radius) {
            setError(`지정된 장소 반경 ${radius}m 외부에 있습니다. (현재거리: ${Math.round(distance)}m)`);
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
        clockIn: Date.now() / 1000,
        clockOut: null,
        clockInMethod: method,
        date: new Date().toISOString().slice(0, 10),
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
    await updateWorkLog(myCurrentLog.id, { clockOut: Date.now() / 1000 });
    await updateStaffStatus('clocked_out');
  };

  const handleQRScan = async (result: { text: string } | string | null) => {
    setQRModalOpen(false);
    
    if (!settings.qrClockInEnabled) {
      setError("QR 코드 출근 기능이 비활성화되어 있습니다.");
      return;
    }

    const qrText = typeof result === 'object' && result !== null ? result.text : result;

    if(qrText && qrText === settings.qrCodeValue) {
        await createWorkLog('qr');
    } else {
        setError("유효하지 않은 QR 코드입니다.");
    }
  };
  
  if (settingsLoading) {
    return <div>설정 정보를 불러오는 중...</div>;
  }

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
          <button onClick={() => handleClockIn('gps')} disabled={!!myCurrentLog || !settings.gpsClockInEnabled} className="btn btn-primary h-20 text-lg">GPS 출근</button>
          <button onClick={() => setQRModalOpen(true)} disabled={!!myCurrentLog || !settings.qrClockInEnabled} className="btn btn-secondary h-20 text-lg">QR 출근</button>
          <button onClick={handleClockOut} disabled={!myCurrentLog || !canClockOut} className="btn btn-danger col-span-2 h-20 text-lg">퇴근</button>
        </div>

        {error && <div className="text-red-500 text-center mb-4 p-3 bg-red-100 rounded">{error}</div>}

        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">나의 최근 기록</h2>
            {workLogs.length > 0 ? (
                <ul className="space-y-3">
                    {workLogs.map((log: WorkLog) => (
                        <li key={log.id} className="bg-white p-4 rounded-lg shadow">
                            <p><strong>출근:</strong> {new Date(log.clockIn * 1000).toLocaleString()}</p>
                            <p><strong>퇴근:</strong> {log.clockOut ? new Date(log.clockOut * 1000).toLocaleString() : '근무 중'}</p>
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
