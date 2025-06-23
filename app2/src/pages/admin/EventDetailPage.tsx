```typescript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import QRCode from 'qrcode.react';
import { StarIcon } from '@heroicons/react/24/solid';

import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

// Interfaces
interface EventData {
    name: string;
    description: string;
    qrCodeToken?: string;
}
interface Dealer {
    id: string;
    name: string;
    email: string;
}
interface Assignment {
    id: string;
    dealerId: string;
    dealerName?: string;
}

// Rating Modal Component
const RatingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (score: number, comment: string) => void;
    dealerName: string;
    loading: boolean;
}> = ({ isOpen, onClose, onSubmit, dealerName, loading }) => {
    const [score, setScore] = useState(0);
    const [hoverScore, setHoverScore] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (score > 0) {
            onSubmit(score, comment);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Rate ${dealerName}`}>
            <div className="p-4">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Score</label>
                    <div className="flex items-center mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                                key={star}
                                className={`h-8 w-8 cursor-pointer ${
                                    (hoverScore || score) >= star ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                onMouseEnter={() => setHoverScore(star)}
                                onMouseLeave={() => setHoverScore(0)}
                                onClick={() => setScore(star)}
                            />
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                        Comment (optional)
                    </label>
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        rows={3}
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || score === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                        {loading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const EventDetailPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const [event, setEvent] = useState<EventData | null>(null);
    const [recommendedDealers, setRecommendedDealers] = useState<Dealer[]>([]);
    const [assignedDealers, setAssignedDealers] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { isAdmin } = useAuth();
    
    // QR Code Modal State
    const [qrCodeValue, setQrCodeValue] = useState('');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    // Rating Modal State
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState<Assignment | null>(null);
    const [ratingLoading, setRatingLoading] = useState(false);

    const functions = getFunctions();
    const matchDealers = httpsCallable(functions, 'matchDealersToEvent');
    const assignDealer = httpsCallable(functions, 'assignDealerToEvent');
    const generateQrToken = httpsCallable(functions, 'generateEventQrToken');
    const submitDealerRating = httpsCallable(functions, 'submitDealerRating');

    useEffect(() => {
        if (!eventId) return;

        const unsubEvent = onSnapshot(doc(db, 'events', eventId), (doc) => {
            const eventData = doc.data() as EventData;
            setEvent(eventData);
            if (eventData.qrCodeToken) {
                setQrCodeValue(eventData.qrCodeToken);
            }
        });

        const q = query(collection(db, 'assignments'), where('eventId', '==', eventId));
        const unsubAssignments = onSnapshot(q, async (snapshot) => {
            const assignments: Assignment[] = [];
            for(const docSnap of snapshot.docs) {
                const assignmentData = docSnap.data();
                const userDoc = await getDoc(doc(db, "users", assignmentData.dealerId));
                assignments.push({ 
                    id: docSnap.id, 
                    dealerId: assignmentData.dealerId, 
                    dealerName: userDoc.exists() ? userDoc.data().name : 'Unknown' 
                });
            }
            setAssignedDealers(assignments);
        });

        return () => {
            unsubEvent();
            unsubAssignments();
        };
    }, [eventId]);

    const handleMatchDealers = async () => {
        setLoading(true);
        setError('');
        try {
            const result: any = await matchDealers({ eventId });
            setRecommendedDealers(result.data.matchedDealers);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleAssignDealer = async (dealerId: string) => {
        setLoading(true);
        try {
            await assignDealer({ eventId, dealerId });
            setRecommendedDealers(prev => prev.filter(d => d.id !== dealerId));
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleShowQrCode = async () => {
        if (!eventId) return;

        if (event?.qrCodeToken) {
            setQrCodeValue(event.qrCodeToken);
            setIsQrModalOpen(true);
            return;
        }
        
        setLoading(true);
        try {
            const result: any = await generateQrToken({ eventId });
            setQrCodeValue(result.data.token);
            setIsQrModalOpen(true);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleOpenRatingModal = (dealer: Assignment) => {
        setSelectedDealer(dealer);
        setIsRatingModalOpen(true);
    };

    const handleCloseRatingModal = () => {
        setSelectedDealer(null);
        setIsRatingModalOpen(false);
    };

    const handleSubmitRating = async (score: number, comment: string) => {
        if (!selectedDealer || !eventId) return;
        
        setRatingLoading(true);
        setError('');
        try {
            await submitDealerRating({
                dealerId: selectedDealer.dealerId,
                eventId,
                score,
                comment
            });
            handleCloseRatingModal();
        } catch (err: any) {
            setError(err.message);
        }
        setRatingLoading(false);
    };


    if (!isAdmin) return <p>Access Denied.</p>;
    if (!event) return <p>Loading event details...</p>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
                <h1 className="text-3xl font-bold mb-2 text-gray-800">{event.name}</h1>
                <p className="mb-6 text-gray-600">{event.description}</p>
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">{error}</div>}

                <div className="my-6">
                    <button onClick={handleShowQrCode} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        {loading ? 'Generating...' : 'Show Attendance QR Code'}
                    </button>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">Assigned Dealers</h2>
                        {assignedDealers.length > 0 ? (
                            <ul className="space-y-3">
                                {assignedDealers.map(d => (
                                    <li key={d.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                                        <span className="font-medium text-gray-800">{d.dealerName}</span>
                                        <button 
                                            onClick={() => handleOpenRatingModal(d)}
                                            className="bg-yellow-500 text-white px-3 py-1 text-sm rounded-md hover:bg-yellow-600"
                                        >
                                            Rate
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-2 text-gray-500">No dealers assigned yet.</p>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-3">Dealer Matching</h2>
                        <button onClick={handleMatchDealers} disabled={loading} className="my-2 w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                            {loading ? 'Finding...' : 'Find Recommended Dealers'}
                        </button>
                        {recommendedDealers.length > 0 && (
                            <ul className="mt-4 space-y-2">
                                {recommendedDealers.map(dealer => (
                                    <li key={dealer.id} className="flex justify-between items-center my-1 p-2 border rounded-md">
                                        <div>
                                            <p className="font-medium">{dealer.name}</p>
                                            <p className="text-sm text-gray-500">{dealer.email}</p>
                                        </div>
                                        <button onClick={() => handleAssignDealer(dealer.id)} disabled={loading} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">
                                            Assign
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* QR Code Modal */}
                <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Attendance QR Code">
                    <div className="p-4 text-center">
                        {qrCodeValue ? (
                            <div className="flex justify-center">
                               <QRCode value={qrCodeValue} size={256} />
                            </div>
                        ) : (
                            <p>Generating QR Code...</p>
                        )}
                    </div>
                </Modal>

                {/* Rating Modal */}
                {selectedDealer && (
                    <RatingModal
                        isOpen={isRatingModalOpen}
                        onClose={handleCloseRatingModal}
                        onSubmit={handleSubmitRating}
                        dealerName={selectedDealer.dealerName || 'Dealer'}
                        loading={ratingLoading}
                    />
                )}
            </div>
        </div>
    );
};

export default EventDetailPage;
```