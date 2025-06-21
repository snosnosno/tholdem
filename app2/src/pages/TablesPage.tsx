import React from 'react';
import { useTournament, Participant, Table } from '../contexts/TournamentContext';

// 임시 스태프 데이터 (원래는 컨텍스트나 props로 받아야 함)
const dummyStaff = [
    { id: 's1', name: 'John Doe', role: 'dealer' },
    { id: 's2', name: 'Jane Smith', role: 'dealer' },
    { id: 's3', name: 'Mike Ross', role: 'floor' },
];

const TablesPage: React.FC = () => {
    const { state, dispatch } = useTournament();
    const { participants, tables, settings } = state;

    // 딜러 역할만 필터링
    const dealers = dummyStaff.filter(s => s.role === 'dealer');

    const handleAssignSeats = () => {
        const activeParticipants = participants.filter(p => p.status === 'active');
        // dispatch({ type: 'ASSIGN_SEATS', payload: { players: activeParticipants, seatsPerTable: settings.seatsPerTable } });
        console.log("Assign seats action dispatched (not implemented yet)");
    };

    const handleAssignDealer = (tableId: string, dealerId: string) => {
        // dispatch({ type: 'ASSIGN_DEALER', payload: { tableId, dealerId } });
        console.log(`Dispatching ASSIGN_DEALER for table ${tableId} with dealer ${dealerId} (not implemented)`);
    }

    const handleMovePlayer = (participantId: string, fromTableId: string, toTableId: string) => {
        // dispatch({ type: 'MOVE_PLAYER', payload: { participantId, fromTableId, toTableId } });
        console.log(`Move player action dispatched for ${participantId} from ${fromTableId} to ${toTableId} (not implemented yet)`);
    }

    return (
        <div className="card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-2xl font-bold">테이블 및 좌석 관리</h2>
                <button onClick={handleAssignSeats} className="btn btn-primary mt-2 sm:mt-0">
                    좌석 자동 배정
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tables.map((table: Table) => (
                    <div key={table.id} className="bg-gray-700 rounded-lg p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg">
                                Table {table.tableNumber}
                                <span className="text-sm font-normal text-gray-400 ml-2">
                                    ({table.players.length} / {settings.seatsPerTable})
                                </span>
                            </h3>
                            <select 
                                className="input-field !mt-0 !py-1 text-sm max-w-[120px]"
                                value={table.dealerId || ''}
                                onChange={(e) => handleAssignDealer(table.id, e.target.value)}
                            >
                                <option value="">딜러 선택</option>
                                {dealers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-grow grid grid-cols-3 gap-2 text-center">
                            {Array.from({ length: settings.seatsPerTable }).map((_, i) => {
                                const seatNumber = i + 1;
                                const player = table.players.find((p: Participant) => p.seatNumber === seatNumber);
                                return (
                                    <div
                                        key={seatNumber}
                                        className={`p-2 rounded-md h-20 flex flex-col justify-center items-center text-xs
                                          ${player ? 'bg-blue-900' : 'bg-gray-800 border-2 border-dashed border-gray-600'}
                                        `}
                                    >
                                        <span className="font-bold text-sm mb-1">{seatNumber}</span>
                                        {player ? (
                                            <span className="font-semibold">{player.name}</span>
                                        ) : (
                                            <span className="text-gray-500">비어있음</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TablesPage; 