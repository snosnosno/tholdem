import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const DEFAULT_PRIZE_RATIOS = [0.5, 0.3, 0.2]; // 1~3위 비율

const PrizeCalculator: React.FC = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const [buyIn, setBuyIn] = useState(0);
  const [ratios, setRatios] = useState(DEFAULT_PRIZE_RATIOS);
  const [custom, setCustom] = useState(false);
  const [result, setResult] = useState<number[]>([]);

  const calcPrize = () => {
    const pool = playerCount * buyIn;
    let r = ratios;
    if (custom) {
      const sum = ratios.reduce((a, b) => a + b, 0);
      r = ratios.map(v => v / sum);
    }
    const prizes = r.map(v => Math.floor(pool * v));
    setResult(prizes);
  };

  const handleRatioChange = (idx: number, value: number) => {
    const newRatios = [...ratios];
    newRatios[idx] = value;
    setRatios(newRatios);
  };

  const saveResult = async () => {
    await addDoc(collection(db, "payouts"), {
      playerCount,
      buyIn,
      ratios,
      prizes: result,
      createdAt: new Date()
    });
    alert("상금 분배 결과가 저장되었습니다.");
  };

  return (
    <div className="max-w-xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">상금 자동 계산기</h2>
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          placeholder="참가자 수"
          value={playerCount || ""}
          onChange={e => setPlayerCount(Number(e.target.value))}
          className="border p-2 rounded w-1/3"
        />
        <input
          type="number"
          placeholder="바이인(₩)"
          value={buyIn || ""}
          onChange={e => setBuyIn(Number(e.target.value))}
          className="border p-2 rounded w-1/3"
        />
        <button onClick={calcPrize} className="bg-blue-600 text-white px-4 rounded">계산</button>
      </div>
      <div className="mb-2">
        <label>
          <input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} />
          상금 비율 커스터마이징
        </label>
      </div>
      <div className="mb-4">
        {ratios.map((r, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span>{i + 1}위</span>
            <input
              type="number"
              value={r}
              step="0.01"
              min="0"
              onChange={e => handleRatioChange(i, Number(e.target.value))}
              className="border p-1 rounded w-20"
              disabled={!custom}
            />
            <span>{custom ? "(비율)" : "(기본)"}</span>
          </div>
        ))}
      </div>
      {result.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold mb-2">상금 분배 결과</h3>
          <ul>
            {result.map((p, i) => (
              <li key={i}>{i + 1}위: {p.toLocaleString()}원</li>
            ))}
          </ul>
          <button onClick={saveResult} className="bg-green-600 text-white px-4 mt-2 rounded">결과 저장</button>
        </div>
      )}
    </div>
  );
};

export default PrizeCalculator;
