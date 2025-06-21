import React from 'react';
import { useParams } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';

// 임시 공지 데이터 (나중에 컨텍스트의 announcements에서 실시간으로 받아옴)
const dummyAnnouncements = [
    { id: 'a1', message: '다음 블라인드 레벨은 5분 후에 시작됩니다.', timestamp: new Date() },
    { id: 'a2', message: '10분간 휴식 시간을 갖겠습니다.', timestamp: new Date(Date.now() - 100000) },
];

const ParticipantLivePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { state } = useTournament();
    
    const { participants, settings, blindLevel, remainingTime } = state;
    const participant = participants.find(p => p.id === id);
    const announcements = dummyAnnouncements; // 임시 데이터

    // 컨텍스트에서 현재 블라인드 정보 가져오기
    const currentBlind = settings.blindLevels[blindLevel - 1];
    const nextBlind = settings.blindLevels[blindLevel];

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    if (!participant) {
        return <div className="card text-center">참가자 정보를 찾을 수 없습니다. (ID: {id})</div>;
    }
    
    const activePlayers = participants.filter(p => p.status === 'active').length;
    const totalChips = participants.reduce((sum, p) => sum + p.chipCount, 0);
    const avgStack = activePlayers > 0 ? Math.floor(totalChips / activePlayers) : 0;

    return (
        <div className="max-w-md mx-auto p-4 space-y-6 font-sans">
            {/* Announcements Section */}
            {announcements.length > 0 && (
                <div className="bg-yellow-500 text-black p-4 rounded-lg shadow-lg">
                    <h3 className="font-bold text-lg mb-2">📢 공지사항</h3>
                    <p>{announcements[announcements.length - 1].message}</p>
                </div>
            )}
            
            {/* My Info */}
            <div className="card text-center !bg-blue-900 border border-blue-600">
                <h2 className="text-3xl font-bold">{participant.name}</h2>
                <div className="grid grid-cols-3 gap-2 mt-2 text-blue-200">
                    <span>테이블: {participant.tableNumber || 'N/A'}</span>
                    <span>좌석: {participant.seatNumber || 'N/A'}</span>
                    <span>칩: {participant.chipCount.toLocaleString()}</span>
                </div>
            </div>

            {/* Blind Timer */}
            <div className="card text-center">
                 <p className="text-gray-400 text-sm">다음 레벨까지</p>
                 <h3 className="text-6xl font-bold font-mono tracking-widest">{formatTime(remainingTime)}</h3>
                 <div className="mt-2 text-gray-300">
                     다음 블라인드: {nextBlind ? `${nextBlind.sb}/${nextBlind.bb}` : '토너먼트 종료'}
                 </div>
            </div>
            
            {/* Tournament Info */}
            <div className="card">
                <h3 className="text-xl font-bold mb-4">토너먼트 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                    <InfoBox title="현재 블라인드" value={`${currentBlind.sb} / ${currentBlind.bb}`} />
                    <InfoBox title="남은 플레이어" value={`${activePlayers} / ${participants.length}`} />
                    <InfoBox title="평균 스택" value={avgStack.toLocaleString()} />
                    <InfoBox title="총 칩" value={totalChips.toLocaleString()} />
                </div>
            </div>

             <div className="card">
                <h3 className="text-xl font-bold mb-4">대회 규칙</h3>
                <div className="text-sm text-gray-400 space-y-2">
                   <p>1. TDA 룰을 기본으로 합니다.</p>
                   <p>2. 참가자 간의 예의를 지켜주세요.</p>
                </div>
            </div>
        </div>
    );
};

// 작은 정보 박스 컴포넌트
const InfoBox: React.FC<{title: string, value: string | number}> = ({title, value}) => (
    <div className="bg-gray-700 p-4 rounded-lg text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
)

export default ParticipantLivePage;
