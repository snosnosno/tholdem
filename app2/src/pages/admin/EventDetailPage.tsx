import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

import { db, functions, promoteToStaff } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import { httpsCallable } from 'firebase/functions';

interface EventData {
  name: string;
  startDate: any;
  endDate: any;
  location: string;
  description: string;
  status: string;
  assignedDealers: { id: string; name: string; }[];
  qrCodeToken?: string;
  managerId?: string;
}


interface Dealer {
    id: string;
    name: string;
}

interface Rating {
    dealerId: string;
    dealerName: string;
    rating: number;
    comment: string;
    createdAt: Date;
}


const EventDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [assignedDealers, setAssignedDealers] = useState<any[]>([]);
  const [availableDealers, setAvailableDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isRatingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const { currentUser } = useAuth();

  const formatDate = (dateInput: any): string => {
    if (!dateInput) return t('eventDetail.dateNotAvailable');
    let date: Date | null = null;
    if (typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      const parsedDate = new Date(dateInput);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
    if(date) {
      return date.toLocaleString(i18n.language, { dateStyle: 'long', timeStyle: 'short' });
    }
    return t('eventDetail.dateInvalid');
  };

  useEffect(() => {
    if (!eventId) {
      setError(t('eventDetail.errorIdMissing'));
      setLoading(false);
      return;
    }

    const eventRef = doc(db, 'events', eventId);
    
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
        if (docSnap.exists()) {
            const eventData = docSnap.data() as EventData;
            setEvent(eventData);

            if (eventData.assignedDealers && eventData.assignedDealers.length > 0) {
                const dealerIds = eventData.assignedDealers.map(d => d.id);
                const dealersQuery = query(collection(db, 'users'), where('__name__', 'in', dealerIds));
                getDocs(dealersQuery).then(dealerDocs => {
                    const dealersMap = new Map(dealerDocs.docs.map(d => [d.id, d.data()]));
                    setAssignedDealers(eventData.assignedDealers.map(ad => ({
                        ...ad,
                        ...dealersMap.get(ad.id)
                    })));
                });
            } else {
                setAssignedDealers([]);
            }

        } else {
            setError(t('eventDetail.notFound'));
        }
        setLoading(false);
    }, (err) => {
        console.error("Error fetching event details:", err);
        setError(t('eventDetail.errorFailedLoad'));
        setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, t]);


  const fetchAvailableDealers = async () => {
    const q = query(collection(db, "users"), where("role", "==", "dealer"));
    const querySnapshot = await getDocs(q);
    const allDealers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const assignedDealerIds = assignedDealers.map(d => d.id);
    setAvailableDealers(allDealers.filter(d => !assignedDealerIds.includes(d.id)));
  };

  const handleOpenModal = () => {
    fetchAvailableDealers();
    setModalOpen(true);
  };

  const handleAssignDealer = async (dealerId: string) => {
    if (!eventId || !event || !currentUser) return;
    const selectedDealer = availableDealers.find(d => d.id === dealerId);
    if (!selectedDealer) return;
  
    try {
      // 먼저 Staff 정보를 업데이트/생성합니다.
      const managerId = event.managerId || currentUser.uid;
      console.log('🔍 EventDetailPage - 지원자 확정 시도:', {
        dealerId: selectedDealer.id,
        dealerName: selectedDealer.name,
        eventId,
        managerId,
        eventManagerId: event.managerId,
        currentUserId: currentUser.uid
      });
      
      await promoteToStaff(selectedDealer.id, selectedDealer.name, 'Dealer', eventId, managerId);
      console.log('✅ promoteToStaff 성공!');
    
      // 기존 로직: 이벤트에 딜러를 배정합니다.
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        assignedDealers: arrayUnion({
            id: selectedDealer.id,
            name: selectedDealer.name
        })
        });
        console.log("Dealer assigned successfully");
      setModalOpen(false);
    } catch (error) {
      console.error("Error assigning dealer: ", error);
      setError(t('eventDetail.errorFailedAssign'));
    }
  };

  const handleOpenRatingModal = (dealer: any) => {
    setSelectedDealer(dealer);
    setRating(0);
    setComment('');
    setRatingModalOpen(true);
  };

  const handleSubmitRating = async () => {
    if (!eventId || !selectedDealer || rating === 0) {
        alert(t('eventDetail.alertRatingRequired'));
        return;
    }

    const submitRatingFunc = httpsCallable(functions, 'submitDealerRating');
    try {
        await submitRatingFunc({
            dealerId: selectedDealer.id,
            eventId: eventId,
            rating: rating,
            comment: comment
        });
        alert(t('eventDetail.alertRatingSuccess'));
        setRatingModalOpen(false);
    } catch (error) {
        console.error("Error submitting rating:", error);
        alert(t('eventDetail.alertRatingFailed'));
    }
  };

  const handleGenerateQrCode = async () => {
    if (!eventId) return;
    try {
        const generateTokenFunc = httpsCallable(functions, 'generateQrCodeToken');
        const result = await generateTokenFunc({ eventId });
        const token = (result.data as { token: string }).token;
        if (token) {
            setQrCodeValue(`${window.location.origin}/attend/${token}`);
            setQrModalOpen(true);
        } else {
            throw new Error("Token was not generated.");
        }
    } catch (error) {
        console.error("Error generating QR code:", error);
        setError(t('eventDetail.errorFailedQr'));
    }
  };
  
  if (loading) return <div className="p-6 text-center">{t('eventDetail.loading')}</div>;
  if (error) return <div className="p-6 text-center text-red-500">{t('eventDetail.errorPrefix')}: {error}</div>;
  if (!event) return <div className="p-6 text-center">{t('eventDetail.notFound')}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-xl">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2">{event.name}</h1>
            <p className="text-lg text-gray-500 mb-4">{event.location}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6 border-b pb-4">
                <span><strong>{t('eventDetail.labelStarts')}:</strong> {formatDate(event.startDate)}</span>
                <span><strong>{t('eventDetail.labelEnds')}:</strong> {formatDate(event.endDate)}</span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${event.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {t(`eventDetail.status.${event.status.toLowerCase()}`, event.status)}
                </span>
            </div>
            
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-3">{t('eventDetail.labelDescription')}</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>

            <div className="flex justify-end space-x-4 mb-6">
                <button onClick={handleGenerateQrCode} className="btn btn-outline">{t('eventDetail.btnGenerateQr')}</button>
                <button onClick={handleOpenModal} className="btn btn-primary">{t('eventDetail.btnAssignDealer')}</button>
            </div>
            
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-3">{t('eventDetail.assignedDealersTitle')}</h2>
                <ul className="space-y-3">
                    {assignedDealers.length > 0 ? assignedDealers.map(dealer => (
                        <li key={dealer.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <span className="font-semibold text-gray-800">{dealer.name}</span>
                            <button onClick={() => handleOpenRatingModal(dealer)} className="btn btn-secondary btn-sm">{t('eventDetail.btnRateDealer')}</button>
                        </li>
                    )) : (
                        <p className="text-gray-500">{t('eventDetail.noDealersAssigned')}</p>
                    )}
                </ul>
            </div>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={t('eventDetail.modalTitleAssign')}>
            <ul className="space-y-2">
                {availableDealers.map(dealer => (
                    <li key={dealer.id} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
                        <span>{dealer.name}</span>
                        <button onClick={() => handleAssignDealer(dealer.id)} className="btn btn-success btn-sm">{t('eventDetail.btnAssign')}</button>
                    </li>
                ))}
            </ul>
        </Modal>

        <Modal isOpen={isRatingModalOpen} onClose={() => setRatingModalOpen(false)} title={t('eventDetail.modalTitleRate', { dealerName: selectedDealer?.name })}>
            <div className="space-y-4">
                <div className="flex justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRating(star)} className="text-3xl text-yellow-400">
                            {rating >= star ? <StarIconSolid className="h-8 w-8"/> : <StarIconOutline className="h-8 w-8"/>}
                        </button>
                    ))}
                </div>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('eventDetail.ratingCommentPlaceholder')}
                    className="w-full p-2 border rounded-md"
                    rows={4}
                />
                <button onClick={handleSubmitRating} className="btn btn-primary w-full">{t('eventDetail.btnSubmitRating')}</button>
            </div>
        </Modal>

        <Modal isOpen={isQrModalOpen} onClose={() => setQrModalOpen(false)} title={t('eventDetail.modalTitleQr')}>
             <div className="p-4 flex flex-col items-center">
                <p className="mb-4 text-center">{t('eventDetail.qrModalDescription')}</p>
                <div className="p-4 bg-white rounded-lg">
                    {qrCodeValue ? (
                        <div className="flex justify-center">
                           <QRCodeSVG value={qrCodeValue} size={256} />
                        </div>
                    ) : (
                        <p>{t('eventDetail.qrGenerating')}</p>
                    )}
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default EventDetailPage;
