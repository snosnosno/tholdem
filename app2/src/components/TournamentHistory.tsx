import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
  playerCount: number;
  totalChips: number;
  winner?: string;
}

const TournamentHistory: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tournaments"), (snap) => {
      setTournaments(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Tournament))
      );
    });
    return () => unsub();
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">대회 기록/히스토리</h2>
      <table className="w-full border mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-1">대회명</th>
            <th className="p-1">일자</th>
            <th className="p-1">상태</th>
            <th className="p-1">참가자</th>
            <th className="p-1">상세</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id}>
              <td className="p-1">{t.name}</td>
              <td className="p-1">{t.date}</td>
              <td className="p-1">{t.status}</td>
              <td className="p-1">{t.playerCount}</td>
              <td className="p-1">
                <button onClick={() => setSelected(t)} className="bg-blue-500 text-white px-2 rounded">보기</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <h3 className="font-bold mb-2">{selected.name} 상세</h3>
          <div>일자: {selected.date}</div>
          <div>상태: {selected.status}</div>
          <div>참가자: {selected.playerCount}</div>
          <div>총 칩: {selected.totalChips?.toLocaleString()}</div>
          <div>우승자: {selected.winner || "-"}</div>
          <div className="flex gap-2 mt-2">
            <button className="bg-green-600 text-white px-2 rounded">PDF로 내보내기</button>
            <button className="bg-yellow-500 text-white px-2 rounded">Excel로 내보내기</button>
            <button onClick={() => setSelected(null)} className="bg-gray-400 text-white px-2 rounded">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentHistory;
