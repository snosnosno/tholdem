import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "firebase/firestore";

interface Staff {
  id: string;
  name: string;
  role: string;
  contact?: string;
}

const ROLES = ["admin", "dealer", "floor"];

const StaffManager: React.FC = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("dealer");
  const [contact, setContact] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("dealer");
  const [editContact, setEditContact] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "staff"), (snap) => {
      setStaffs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Staff)));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await addDoc(collection(db, "staff"), {
      name,
      role,
      contact
    });
    setName("");
    setRole("dealer");
    setContact("");
  };

  const handleEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRole(s.role);
    setEditContact(s.contact || "");
  };

  const handleUpdate = async (id: string) => {
    await updateDoc(doc(db, "staff", id), {
      name: editName,
      role: editRole,
      contact: editContact
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
  };

  return (
    <div className="max-w-xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">직원 관리</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border p-2 rounded w-1/3"
          required
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="border p-2 rounded w-1/3"
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          type="text"
          placeholder="연락처(선택)"
          value={contact}
          onChange={e => setContact(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 rounded">추가</button>
      </form>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">이름</th>
            <th className="p-2">역할</th>
            <th className="p-2">연락처</th>
            <th className="p-2">수정</th>
            <th className="p-2">삭제</th>
          </tr>
        </thead>
        <tbody>
          {staffs.map((s) => (
            <tr key={s.id}>
              <td className="p-2">
                {editingId === s.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="border p-1 rounded"
                  />
                ) : (
                  s.name
                )}
              </td>
              <td className="p-2">
                {editingId === s.id ? (
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="border p-1 rounded"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  s.role
                )}
              </td>
              <td className="p-2">
                {editingId === s.id ? (
                  <input
                    value={editContact}
                    onChange={e => setEditContact(e.target.value)}
                    className="border p-1 rounded"
                  />
                ) : (
                  s.contact || "-"
                )}
              </td>
              <td className="p-2">
                {editingId === s.id ? (
                  <button
                    onClick={() => handleUpdate(s.id)}
                    className="bg-blue-500 text-white px-2 rounded"
                  >
                    저장
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(s)}
                    className="bg-yellow-500 text-white px-2 rounded"
                  >
                    수정
                  </button>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleDelete(s.id)}
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

export default StaffManager;
