import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface Tournament {
  id: string;
  name: string;
  level: number;
  playerCount: number;
  avgStack: number;
  status: string;
}

interface BlindLevel {
  level: number;
  sb: number;
  bb: number;
  ante: number;
  duration: number;
}

interface Notice {
  id: string;
  message: string;
}

const BLIND_LEVELS: BlindLevel[] = [
  { level: 1, sb: 100, bb: 200, ante: 0, duration: 20 },
  { level: 2, sb: 200, bb: 400, ante: 0, duration: 20 },
  { level: 3, sb: 300, bb: 600, ante: 100, duration: 20 },
  { level: 4, sb: 400, bb: 800, ante: 100, duration: 20 },
];

const ParticipantLivePage: React.FC = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seat, setSeat] = useState("");

  useEffect(() => {
    // 대회 정보 실시간 동기화 (예시: 첫번째 대회)
    const unsub = onSnapshot(collection(db, "tournaments"), (snap) => {
      const t = snap.docs[0]?.data();
      if (t) setTournament({ id: snap.docs[0].id, ...t } as Tournament);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // 공지사항 실시간 동기화
    const unsub = onSnapshot(collection(db, "notices"), (snap) => {
      setNotices(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notice)));
    });
    return () => unsub();
  }, []);

  return (
    <div className="max-w-md mx-auto mt-4 p-4 bg-white rounded shadow text-center">
      <h2 className="text-xl font-bold mb-2">대회 실시간 현황</h2>
      {tournament ? (
        <>
          <div className="mb-2 font-semibold">{tournament.name}</div>
          <div className="mb-2">현재 레벨: Lv.{tournament.level} (SB {BLIND_LEVELS[tournament.level-1]?.sb} / BB {BLIND_LEVELS[tournament.level-1]?.bb})</div>
          <div className="mb-2">남은 참가자: {tournament.playerCount}명 / 평균 스택: {tournament.avgStack?.toLocaleString()}</div>
          <div className="mb-2">상태: {tournament.status}</div>
        </>
      ) : (
        <div>대회 정보 없음</div>
      )}
      <div className="mb-2">
        <input
          type="text"
          placeholder="본인 이름 또는 좌석번호 입력"
          value={seat}
          onChange={e => setSeat(e.target.value)}
          className="border p-1 rounded w-2/3"
        />
        <button className="ml-2 bg-blue-500 text-white px-2 rounded">좌석 조회</button>
      </div>
      <div className="mb-2">
        <h3 className="font-bold">블라인드 구조표</h3>
        <table className="w-full text-xs border mb-2">
          <thead>
            <tr className="bg-gray-100">
              <th>Lv</th><th>SB</th><th>BB</th><th>Ante</th><th>분</th>
            </tr>
          </thead>
          <tbody>
            {BLIND_LEVELS.map((b) => (
              <tr key={b.level} className={b.level === tournament?.level ? "bg-blue-100" : ""}>
                <td>{b.level}</td>
                <td>{b.sb}</td>
                <td>{b.bb}</td>
                <td>{b.ante}</td>
                <td>{b.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-2">
        <h3 className="font-bold">공지사항</h3>
        <ul>
          {notices.map(n => (
            <li key={n.id} className="text-red-600">{n.message}</li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <h3 className="font-bold">대회 규정</h3>
        <div className="text-xs">토너먼트 규정, 예의, 페널티 등 주요 규정 안내 (예시)</div>
      </div>
    </div>
  );
};

export default ParticipantLivePage;
