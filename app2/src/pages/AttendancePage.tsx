import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';

const AttendancePage: React.FC = () => {
    const [scanResult, setScanResult] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const { user } = useAuth();
    const functions = getFunctions();
    const recordAttendance = httpsCallable(functions, 'recordAttendance');

    const handleScan = async (result: any, error: any) => {
        if (!!result) {
            const qrCodeToken = result?.text;
            if (qrCodeToken && qrCodeToken !== scanResult) {
                setScanResult(qrCodeToken);
                setLoading(true);
                setMessage('');
                setError('');
                
                try {
                    const response: any = await recordAttendance({ qrCodeToken });
                    setMessage(response.data.message || 'Attendance recorded successfully!');
                } catch (err: any) {
                    setError(err.message || 'Failed to record attendance.');
                } finally {
                    setLoading(false);
                }
            }
        }

        if (!!error) {
            // You can log the error if needed, but we won't display it to the user
            // console.info(error);
        }
    };

    if (!user) {
        return <p className="p-6 text-center">Please log in to access this page.</p>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-center mb-4">Scan QR Code for Attendance</h1>
            <div className="max-w-md mx-auto border-2 border-dashed rounded-lg p-2">
                <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    containerStyle={{ width: '100%' }}
                />
            </div>
            {loading && <p className="text-center mt-4 text-blue-500">Processing...</p>}
            {scanResult && !loading && (
                 <div className="mt-4 text-center">
                    {message && <p className="text-green-500 font-bold">{message}</p>}
                    {error && <p className="text-red-500 font-bold">{error}</p>}
                    <button 
                        onClick={() => setScanResult('')} 
                        className="mt-2 bg-gray-500 text-white px-4 py-2 rounded"
                    >
                        Scan Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
