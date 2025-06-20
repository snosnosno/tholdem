import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDocs,
  updateDoc
} from "firebase/firestore";

interface Participant {
  id: string;
  name: string;
  status: "active" | "busted";
}

interface Table {
  id: string;
  players: Participant[];
  dealer?: string;
}

const TABLE_SIZE = 9;

const TableManager: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [dealers, setDealers] = useState<string[]>([]);

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

  // 테이블 실시간 동기화
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tables"), (snap) => {
      setTables(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Table))
      );
    });
    return () => unsub();
  }, []);

  // 딜러 목록(임시 더미)
  useEffect(() => {
    setDealers(["딜러A", "딜러B", "딜러C", "딜러D"]);
  }, []);

  // 자동 배정 알고리즘
  const autoAssign = async () => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const tableCount = Math.ceil(shuffled.length / TABLE_SIZE);
    for (let t = 0; t < tableCount; t++) {
      const tablePlayers = shuffled.slice(t * TABLE_SIZE, (t + 1) * TABLE_SIZE);
      const dealer = dealers[t % dealers.length];
      await setDoc(doc(db, "tables", `table${t + 1}`), {
        id: `table${t + 1}`,
        players: tablePlayers,
        dealer
      });
    }
  };

  // 딜러 수동 변경
  const changeDealer = async (tableId: string, dealer: string) => {
    await updateDoc(doc(db, "tables", tableId), { dealer });
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">테이블/좌석 자동 배정</h2>
      <button onClick={autoAssign} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">자동 배정</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="border rounded p-4 bg-white">
            <div className="font-bold mb-2">{table.id} (딜러: {table.dealer || "미지정"})</div>
            <div className="mb-2">
              <label>딜러 변경: </label>
              <select
                value={table.dealer || ""}
                onChange={e => changeDealer(table.id, e.target.value)}
                className="border p-1 rounded"
              >
                <option value="">--선택--</option>
                {dealers.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1">좌석</th>
                  <th className="p-1">이름</th>
                </tr>
              </thead>
              <tbody>
                {table.players.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-1">{idx + 1}</td>
                    <td className="p-1">{p.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableManager;
