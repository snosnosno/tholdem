import React, { useEffect } from 'react';
import { useTournament } from '../contexts/TournamentContext';

const BlindsPage: React.FC = () => {
    const { state, dispatch } = useTournament();
    const { settings, blindLevel, remainingTime, isTimerRunning } = state;

    const currentBlind = settings.blindLevels[blindLevel];
    const nextBlind = settings.blindLevels[blindLevel + 1];
    const currentLevelIsBreak = currentBlind?.isBreak;

    // Timer logic
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isTimerRunning && remainingTime > 0) {
            timer = setInterval(() => {
                dispatch({ type: 'TICK_TIMER' });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isTimerRunning, remainingTime, dispatch]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleTimerToggle = () => {
        dispatch({ type: 'SET_TIMER_RUNNING', payload: !isTimerRunning });
    };

    const handleNextLevel = () => {
        const nextLevel = blindLevel + 1;
        if (nextLevel < settings.blindLevels.length) {
            dispatch({ type: 'SET_BLIND_LEVEL', payload: nextLevel });
        }
    };

    const handlePrevLevel = () => {
        const prevLevel = blindLevel - 1;
        if (prevLevel >= 0) {
            dispatch({ type: 'SET_BLIND_LEVEL', payload: prevLevel });
        }
    };

    return (
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">블라인드 컨트롤</h2>

            <div className="bg-gray-900 p-6 rounded-lg mb-6 text-center">
                <p className="text-gray-400 text-sm mb-1">
                    {currentLevelIsBreak ? "휴식 시간" : `레벨 ${currentBlind?.level}`}
                </p>
                <h3 className="text-7xl font-bold font-mono tracking-wider my-2 text-green-400">
                    {formatTime(remainingTime)}
                </h3>
                {!currentLevelIsBreak && currentBlind && (
                     <div className="text-3xl font-semibold">
                        {currentBlind.sb} / {currentBlind.bb}
                        {currentBlind.ante && <span className="text-xl ml-2">(Ante {currentBlind.ante})</span>}
                    </div>
                )}
                <div className="text-gray-500 mt-2 text-sm">
                    다음: {nextBlind ? (nextBlind.isBreak ? "휴식" : `${nextBlind.sb}/${nextBlind.bb}`) : "종료"}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <button 
                    onClick={handlePrevLevel} 
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                    disabled={blindLevel === 0}
                >
                    이전
                </button>
                <button 
                    onClick={handleTimerToggle} 
                    className={`font-bold py-3 rounded-lg transition text-white ${isTimerRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                >
                    {isTimerRunning ? '일시정지' : '시작'}
                </button>
                <button 
                    onClick={handleNextLevel} 
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                    disabled={blindLevel >= settings.blindLevels.length - 1}
                >
                    다음
                </button>
            </div>
        </div>
    );
};

export default BlindsPage;
