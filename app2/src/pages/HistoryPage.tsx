import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// import { getCompletedTournaments } from "../firebase"; // 나중에 firebase 서비스로 대체

// 임시 데이터
const dummyTournaments = [
    { id: 't1', name: '데일리 토너먼트 #1', date: '2023-10-26', status: 'completed', playerCount: 50, winner: 'Player A' },
    { id: 't2', name: '위클리 스페셜', date: '2023-10-22', status: 'completed', playerCount: 80, winner: 'Player B' },
];

const HistoryPage: React.FC = () => {
    const [tournaments, setTournaments] = useState<any[]>([]);
    
    useEffect(() => {
        // const fetchTournaments = async () => {
        //     const result = await getCompletedTournaments();
        //     setTournaments(result);
        // };
        // fetchTournaments();
        setTournaments(dummyTournaments); // 임시 데이터 사용
    }, []);

    return (
        <div className="card max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">토너먼트 기록</h2>
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                    <thead className="bg-gray-700">
                        <tr className="text-left text-gray-300">
                            <th className="p-3">대회명</th>
                            <th className="p-3">날짜</th>
                            <th className="p-3">참가자 수</th>
                            <th className="p-3">우승자</th>
                            <th className="p-3 text-right">상세</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                        {tournaments.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-700">
                                <td className="p-3">{t.name}</td>
                                <td className="p-3">{t.date}</td>
                                <td className="p-3">{t.playerCount}</td>
                                <td className="p-3">{t.winner || '-'}</td>
                                <td className="p-3 text-right">
                                    <Link to={`/history/${t.id}`} className="btn btn-primary text-xs">
                                        결과 보기
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryPage;
