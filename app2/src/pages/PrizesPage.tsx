import React, { useState, useEffect, useMemo } from 'react';
import { useTournament } from '../contexts/TournamentContext';

// 예시: ITM(In The Money) 비율에 따른 상금 분배 (조정 가능)
const PRIZE_DISTRIBUTION_RULES = {
  10: [1], // 10%
  15: [0.7, 0.3], // 15%
  20: [0.6, 0.3, 0.1], // 20%
};

// 가장 가까운 규칙을 찾는 헬퍼 함수
const getDistribution = (itmPercentage: number) => {
    const percentages = Object.keys(PRIZE_DISTRIBUTION_RULES).map(Number);
    const closest = percentages.reduce((prev, curr) => 
        (Math.abs(curr - itmPercentage) < Math.abs(prev - itmPercentage) ? curr : prev)
    );
    return PRIZE_DISTRIBUTION_RULES[closest as keyof typeof PRIZE_DISTRIBUTION_RULES];
}

const PrizesPage: React.FC = () => {
  const { state, dispatch } = useTournament();
  const { participants, settings } = state;

  const [manualPayouts, setManualPayouts] = useState<number[]>([]);
  const [isManual, setIsManual] = useState(false);

  const totalPlayers = participants.length;
  const buyIn = settings.startingChips; // 예시로 startingChips를 바이인으로 사용
  const prizePool = totalPlayers * buyIn;
  
  const itmCount = useMemo(() => {
    // ITM을 전체 참가자의 15%로 가정 (설정으로 뺄 수 있음)
    return Math.max(1, Math.floor(totalPlayers * 0.15));
  }, [totalPlayers]);

  const calculatedPayouts = useMemo(() => {
    if (totalPlayers === 0) return [];
    const itmPercentage = (itmCount / totalPlayers) * 100;
    const distribution = getDistribution(itmPercentage);
    return distribution.map(ratio => Math.floor(prizePool * ratio));
  }, [prizePool, itmCount, totalPlayers]);

  useEffect(() => {
    setManualPayouts(calculatedPayouts);
  }, [calculatedPayouts]);

  const handleManualChange = (index: number, value: string) => {
    const newPayouts = [...manualPayouts];
    newPayouts[index] = parseInt(value, 10) || 0;
    setManualPayouts(newPayouts);
  };
  
  const handleSave = () => {
    const payoutsToSave = isManual ? manualPayouts : calculatedPayouts;
    // dispatch({ type: 'SAVE_PAYOUTS', payload: payoutsToSave });
    console.log("Dispatching SAVE_PAYOUTS action (not implemented yet)", payoutsToSave);
    alert("상금 분배가 저장되었습니다.");
  }

  const totalManualPayout = manualPayouts.reduce((sum, v) => sum + v, 0);

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">상금 계산기</h2>

      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-400">총상금</p>
          <p className="text-xl font-bold">{prizePool.toLocaleString()}</p>
        </div>
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-400">참가자</p>
          <p className="text-xl font-bold">{totalPlayers}</p>
        </div>
        <div className="bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-400">ITM</p>
          <p className="text-xl font-bold">{itmCount}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isManual} onChange={e => setIsManual(e.target.checked)} className="rounded" />
          수동으로 상금 조정
        </label>
        {isManual && (
          <div className={`text-sm ${totalManualPayout > prizePool ? 'text-red-500' : 'text-gray-400'}`}>
            분배된 총액: {totalManualPayout.toLocaleString()}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {(isManual ? manualPayouts : calculatedPayouts).map((payout, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="font-semibold w-12 text-lg">{i + 1}등</span>
            {isManual ? (
               <input
                 type="number"
                 value={payout}
                 onChange={e => handleManualChange(i, e.target.value)}
                 className="input-field !mt-0 flex-grow"
               />
            ) : (
              <span className="text-lg font-mono bg-gray-800 px-3 py-1 rounded-md">{payout.toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={handleSave} className="btn btn-primary w-full mt-4">
        상금 구조 저장
      </button>
    </div>
  );
};

export default PrizesPage; 