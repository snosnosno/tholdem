import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase';

interface Event {
    id: string;
    name: string;
}

interface Payroll {
    id: string;
    dealerId: string; // We'll need to fetch dealer name
    dealerName?: string;
    workDurationInHours: number;
    hourlyRate: number;
    calculatedPay: number;
    status: string;
}

const PayrollAdminPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const functions = getFunctions();
    const getPayrolls = httpsCallable(functions, 'getPayrolls');
    const calculatePayrollsForEvent = httpsCallable(functions, 'calculatePayrollsForEvent');

    useEffect(() => {
        const fetchEvents = async () => {
            const eventsSnapshot = await getDocs(collection(db, 'events'));
            const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(eventsList);
        };
        fetchEvents();
    }, []);

    const handleFetchPayrolls = async (eventId: string) => {
        if (!eventId) return;
        setSelectedEventId(eventId);
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const result: any = await getPayrolls({ eventId });
            // Fetch dealer names for display
            const payrollsWithNames = await Promise.all(result.data.payrolls.map(async (p: Payroll) => {
                const userDoc = await getDocs(collection(db, 'users'), p.dealerId);
                return { ...p, dealerName: userDoc.docs[0]?.data().name || 'Unknown Dealer' };
            }));
            setPayrolls(payrollsWithNames);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleCalculate = async () => {
        if (!selectedEventId) {
            setError('Please select an event first.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const result: any = await calculatePayrollsForEvent({ eventId: selectedEventId });
            setMessage(result.data.message);
            // Refresh payrolls after calculation
            handleFetchPayrolls(selectedEventId);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Payroll Management</h1>

            <div className="mb-4">
                <label htmlFor="event-select" className="block text-sm font-medium text-gray-700">Select Event</label>
                <select
                    id="event-select"
                    value={selectedEventId}
                    onChange={(e) => handleFetchPayrolls(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="">-- Select an Event --</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                </select>
            </div>

            {error && <p className="text-red-500 my-2">{error}</p>}
            {message && <p className="text-green-500 my-2">{message}</p>}

            {selectedEventId && (
                <button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="my-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                >
                    {loading ? 'Calculating...' : 'Calculate Payroll for Selected Event'}
                </button>
            )}

            <div className="mt-6">
                <h2 className="text-xl font-semibold">Payroll Details</h2>
                {loading && !payrolls.length ? (
                    <p>Loading payrolls...</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 mt-2">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payrolls.map((p) => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{p.dealerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{p.workDurationInHours.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">${p.hourlyRate.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">${p.calculatedPay.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{p.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                 {payrolls.length === 0 && !loading && <p className="mt-2 text-gray-500">No payroll data to display. Try calculating it.</p>}
            </div>
        </div>
    );
};

export default PayrollAdminPage;
