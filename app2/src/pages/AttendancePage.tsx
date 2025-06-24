import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';

const AttendancePage: React.FC = () => {
    const [scanResult, setScanResult] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const { currentUser } = useAuth();

    const handleScan = async (result: any, error: any) => {
        if (!!result) {
            const scannedUrl = result?.getText();
            setScanResult(scannedUrl);
            
            // Extract token from URL
            const urlParts = scannedUrl.split('/');
            const token = urlParts[urlParts.length - 1];

            if (token && !isSubmitting) {
                setIsSubmitting(true);
                setFeedback(null);
                try {
                    const functions = getFunctions();
                    const recordAttendance = httpsCallable(functions, 'recordAttendance');
                    await recordAttendance({ qrCodeToken: token });
                    setFeedback({ type: 'success', message: 'Attendance recorded successfully!' });
                } catch (err: any) {
                    console.error(err);
                    setFeedback({ type: 'error', message: err.message || 'Failed to record attendance.' });
                } finally {
                    setIsSubmitting(false);
                    // Optionally clear result after processing
                    setTimeout(() => setScanResult(''), 2000); 
                }
            }
        }

        if (!!error) {
            // console.info(error);
        }
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Scan Attendance QR Code</h1>
            <div className="w-full max-w-md bg-white p-4 rounded-lg shadow-xl">
                <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    containerStyle={{ width: '100%' }}
                />
                {scanResult && <p className="mt-4 text-center text-sm text-gray-600">Last Scanned: {scanResult}</p>}
            </div>

            {isSubmitting && <p className="mt-4 text-blue-600">Submitting attendance...</p>}
            
            {feedback && (
                 <div className={`mt-4 p-4 rounded-md w-full max-w-md text-center ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
