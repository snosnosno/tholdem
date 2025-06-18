import React, { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebase";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {!user ? (
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80">
          <h2 className="text-2xl font-bold mb-4">관리자 로그인</h2>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
            required
          />
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">로그인</button>
        </form>
      ) : (
        <div className="bg-white p-8 rounded shadow-md w-80 flex flex-col items-center">
          <div className="mb-4">{user.email}님, 환영합니다!</div>
          <button onClick={handleLogout} className="bg-gray-600 text-white p-2 rounded">로그아웃</button>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
