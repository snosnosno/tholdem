import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from "firebase/firestore";

interface Participant {
  id: string;
  chipCount: number;
  status: "active" | "busted";
}

interface BlindLevel {
  level: number;
  sb: number;
  bb: number;
  ante: number;
  duration: number; // minutes
}

const BLIND_LEVELS: BlindLevel[] = [
  { level: 1, sb: 100, bb: 200, ante: 0, duration: 20 },
  { level: 2, sb: 200, bb: 400, ante: 0, duration: 20 },
  { level: 3, sb: 300, bb: 600, ante: 100, duration: 20 },
  { level: 4, sb: 400, bb: 800, ante: 100, duration: 20 },
  // ... 추가 가능
];

const STARTING_CHIP = 30000;

const ChipBlindManager: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [level, setLevel] = useState(1);
  const [timer, setTimer] = useState(BLIND_LEVELS[0].duration * 60); // seconds
  const [running, setRunning] = useState(false);

  // 참가자 실시간 동기화
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "participants"), (snap) => {
      setParticipants(
        snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
          .filter((p) => p.status === "active")
      );
    });
    return () => unsub();
  }, []);

  // 타이머
  useEffect(() => {
    if (!running) return;
    if (timer <= 0) {
      setLevel((prev) => Math.min(prev + 1, BLIND_LEVELS.length));
      setTimer(BLIND_LEVELS[Math.min(level, BLIND_LEVELS.length - 1)].duration * 60);
      setRunning(false);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, timer, level]);

  // 칩/스택 계산
  const totalChips = participants.length * STARTING_CHIP;
  const avgStack = participants.length ? Math.floor(totalChips / participants.length) : 0;
  const bb = BLIND_LEVELS[level - 1]?.bb || 0;
  const avgBB = bb ? Math.floor(avgStack / bb) : 0;

  return (
    <div className="max-w-xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">칩 및 블라인드 타이머</h2>
      <div className="mb-2">현재 레벨: Lv.{level} (SB {BLIND_LEVELS[level-1]?.sb} / BB {bb} / Ante {BLIND_LEVELS[level-1]?.ante})</div>
      <div className="mb-2">남은 시간: {Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</div>
      <div className="mb-2">남은 참가자: {participants.length}명</div>
      <div className="mb-2">총 칩: {totalChips.toLocaleString()} / 평균 스택: {avgStack.toLocaleString()} / 평균 BB: {avgBB}</div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setRunning(true)} className="bg-green-600 text-white px-4 py-1 rounded">시작</button>
        <button onClick={() => setRunning(false)} className="bg-gray-600 text-white px-4 py-1 rounded">일시정지</button>
        <button onClick={() => setTimer(BLIND_LEVELS[level-1]?.duration*60)} className="bg-yellow-500 text-white px-4 py-1 rounded">리셋</button>
        <button onClick={() => setLevel((l) => Math.max(1, l-1))} className="bg-blue-400 text-white px-2 rounded">◀</button>
        <button onClick={() => setLevel((l) => Math.min(BLIND_LEVELS.length, l+1))} className="bg-blue-400 text-white px-2 rounded">▶</button>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-1">레벨</th>
            <th className="p-1">SB</th>
            <th className="p-1">BB</th>
            <th className="p-1">Ante</th>
            <th className="p-1">분</th>
          </tr>
        </thead>
        <tbody>
          {BLIND_LEVELS.map((b) => (
            <tr key={b.level} className={b.level === level ? "bg-blue-100" : ""}>
              <td className="p-1">{b.level}</td>
              <td className="p-1">{b.sb}</td>
              <td className="p-1">{b.bb}</td>
              <td className="p-1">{b.ante}</td>
              <td className="p-1">{b.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChipBlindManager;
