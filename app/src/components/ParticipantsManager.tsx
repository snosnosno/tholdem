import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

interface Participant {
  id: string;
  name: string;
  phone?: string;
  status: "active" | "busted";
}

const ParticipantsManager: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    const q = query(collection(db, "participants"), orderBy("name"));
    const unsub = onSnapshot(q, (snapshot) => {
      setParticipants(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
      );
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await addDoc(collection(db, "participants"), {
      name,
      phone,
      status: "active"
    });
    setName("");
    setPhone("");
  };

  const handleEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPhone(p.phone || "");
  };

  const handleUpdate = async (id: string) => {
    await updateDoc(doc(db, "participants", id), {
      name: editName,
      phone: editPhone
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "participants", id));
  };

  const handleToggleStatus = async (p: Participant) => {
    await updateDoc(doc(db, "participants", p.id), {
      status: p.status === "active" ? "busted" : "active"
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">참가자 관리</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border p-2 rounded w-1/3"
          required
        />
        <input
          type="text"
          placeholder="연락처(선택)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 rounded">추가</button>
      </form>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">이름</th>
            <th className="p-2">연락처</th>
            <th className="p-2">상태</th>
            <th className="p-2">수정</th>
            <th className="p-2">삭제</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className={p.status === "busted" ? "bg-gray-100 text-gray-400" : ""}>
              <td className="p-2">
                {editingId === p.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="border p-1 rounded"
                  />
                ) : (
                  p.name
                )}
              </td>
              <td className="p-2">
                {editingId === p.id ? (
                  <input
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="border p-1 rounded"
                  />
                ) : (
                  p.phone || "-"
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleToggleStatus(p)}
                  className={
                    p.status === "active"
                      ? "bg-green-500 text-white px-2 rounded"
                      : "bg-gray-400 text-white px-2 rounded"
                  }
                >
                  {p.status === "active" ? "활동" : "탈락"}
                </button>
              </td>
              <td className="p-2">
                {editingId === p.id ? (
                  <button
                    onClick={() => handleUpdate(p.id)}
                    className="bg-blue-500 text-white px-2 rounded"
                  >
                    저장
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(p)}
                    className="bg-yellow-500 text-white px-2 rounded"
                  >
                    수정
                  </button>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="bg-red-500 text-white px-2 rounded"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantsManager;
