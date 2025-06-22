import React, { useMemo, useState, Fragment } from 'react';
import { useTables, Table, BalancingResult } from '../hooks/useTables';
import { useParticipants } from '../hooks/useParticipants';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Modal from '../components/Modal';

const ItemTypes = {
  SEAT: 'seat',
};

interface SeatProps {
  table: Table;
  seatIndex: number;
  participantId: string | null;
  getParticipantName: (id: string | null) => string;
  onMoveSeat: (
    participantId: string,
    from: { tableId: string; seatIndex: number },
    to: { tableId: string; seatIndex: number }
  ) => void;
  onBustOut: (participantId: string) => void;
}

const Seat: React.FC<SeatProps> = ({ table, seatIndex, participantId, getParticipantName, onMoveSeat, onBustOut }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SEAT,
    item: { participantId, from: { tableId: table.id, seatIndex } },
    canDrag: !!participantId,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [participantId, table.id, seatIndex]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.SEAT,
    drop: (item: { participantId: string; from: { tableId: string; seatIndex: number } }) => {
      if (item.participantId) {
        onMoveSeat(item.participantId, item.from, { tableId: table.id, seatIndex });
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [table.id, seatIndex, onMoveSeat]);

  const participantName = getParticipantName(participantId);

  return (
    <div
      ref={(node) => drag(drop(node))}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`relative p-2 rounded-md h-20 flex flex-col justify-center items-center text-xs group 
        ${participantId ? 'bg-blue-100 text-blue-800 cursor-move' : 'bg-gray-200 border-2 border-dashed border-gray-400'}
        ${isOver ? 'ring-2 ring-yellow-400' : ''}
      `}
    >
      <span className="font-bold text-sm mb-1">{seatIndex + 1}</span>
      <span className="font-semibold">{participantName}</span>
      {participantId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBustOut(participantId);
          }}
          className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="탈락 처리"
        >
          X
        </button>
      )}
    </div>
  );
};

const TablesPage: React.FC = () => {
    const { tables, loading: tablesLoading, error: tablesError, autoAssignSeats, moveSeat, bustOutParticipant, closeTable, openNewTable, updateTableDetails } = useTables();
    const { participants, loading: participantsLoading, error: participantsError } = useParticipants();

    const [isClosing, setIsClosing] = useState(false);
    const [isOpeningTable, setIsOpeningTable] = useState(false);
    const [closingTableId, setClosingTableId] = useState<string | null>(null);
    const [balancingResult, setBalancingResult] = useState<BalancingResult[] | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');

    const handleAssignSeats = () => {
        const activeParticipants = participants.filter(p => p.status === 'active');
        if (activeParticipants.length > 0) {
            autoAssignSeats(activeParticipants);
        } else {
            alert("배정할 활동중인 참가자가 없습니다.");
        }
    };
    
    const handleOpenTable = async () => {
        setIsOpeningTable(true);
        try {
            await openNewTable();
        } catch (error: any) {
            alert(`Error opening new table: ${error.message}`);
        } finally {
            setIsOpeningTable(false);
        }
    };

    const handleCloseTable = (tableId: string) => {
        setClosingTableId(tableId);
    };

    const confirmCloseTable = async () => {
        if (!closingTableId) return;

        setIsClosing(true);
        try {
            const result = await closeTable(closingTableId);
            setBalancingResult(result);
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsClosing(false);
            setClosingTableId(null);
        }
    };

    const handleBustOut = (participantId: string) => {
        if(window.confirm("정말로 해당 참가자를 탈락 처리하시겠습니까?")) {
            bustOutParticipant(participantId);
        }
    };

    const getParticipantName = (participantId: string | null): string => {
        if (!participantId) return "비어있음";
        const participant = participants.find(p => p.id === participantId);
        if (!participant) return "알수없음";
        return participant.status === 'busted' ? `(탈락) ${participant.name}` : participant.name;
    };

    const needsBalancing = useMemo(() => {
        const playerCounts = tables
            .map(t => (t.seats || []).filter(s => s !== null).length)
            .filter(count => count > 0); 

        if (playerCounts.length <= 1) return false;

        const minPlayers = Math.min(...playerCounts);
        const maxPlayers = Math.max(...playerCounts);

        return maxPlayers - minPlayers >= 3;
    }, [tables]);

    if (tablesLoading || participantsLoading) return <div className="card">Loading...</div>;
    if (tablesError) return <div className="card">Error loading tables: {tablesError.message}</div>;
    if (participantsError) return <div className="card">Error loading participants: {participantsError.message}</div>;

    const getParticipantNameById = (id: string) => participants.find(p => p.id === id)?.name || 'Unknown';

    return (
      <DndProvider backend={HTML5Backend}>
        <div className="card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">테이블 및 좌석 관리</h2>
                <div className="flex items-center mt-2 sm:mt-0">
                    <button onClick={handleOpenTable} className="btn btn-success mr-4" disabled={isOpeningTable}>
                        {isOpeningTable ? '테이블 여는중...' : '새 테이블 열기'}
                    </button>
                    <button onClick={handleAssignSeats} className="btn btn-primary">
                        좌석 자동 배정
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                {/* 검색 기능은 다음 Task에서 구현 */}
                <div className="w-1/3">
                    {/* Placeholder for search */}
                </div>
                <div className="flex items-center">
                    <span className="mr-2 text-sm font-medium text-gray-700">보기:</span>
                    <div className="inline-flex rounded-md shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 text-sm font-medium ${
                                viewMode === 'grid'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } rounded-l-md border border-gray-300 focus:z-10 focus:ring-2 focus:ring-blue-500`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm font-medium ${
                                viewMode === 'list'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } rounded-r-md border border-gray-300 focus:z-10 focus:ring-2 focus:ring-blue-500`}
                        >
                            List
                        </button>
                    </div>
                </div>
            </div>

            {needsBalancing && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                    <p className="font-bold">밸런싱 경고</p>
                    <p>테이블간 인원 수 차이가 3명 이상입니다. 밸런스를 조정하는 것이 좋습니다.</p>
                </div>
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tables.map((table: Table) => (
                        <div key={table.id} className="bg-white rounded-lg p-4 flex flex-col shadow-md">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-lg text-gray-800">
                                    {table.name}
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({(table.seats || []).filter(s => s !== null).length} / {(table.seats || []).length})
                                    </span>
                                </h3>
                                <button
                                    onClick={() => handleCloseTable(table.id)}
                                    className="text-red-500 hover:text-red-700 font-bold"
                                    disabled={isClosing || isOpeningTable}
                                    title="테이블 닫기"
                                >
                                    X
                                </button>
                            </div>
                            <div className="flex-grow grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 text-center">
                                {(table.seats || []).map((participantId, i) => (
                                    <Seat
                                      key={i}
                                      table={table}
                                      seatIndex={i}
                                      participantId={participantId}
                                      getParticipantName={getParticipantName}
                                      onMoveSeat={moveSeat}
                                      onBustOut={handleBustOut}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold mb-2">List View (Placeholder)</h3>
                    {/* 리스트 뷰는 다음 Task에서 구현 */}
                </div>
            )}

            {closingTableId && (
                <Modal
                    isOpen={!!closingTableId}
                    onClose={() => setClosingTableId(null)}
                    title="테이블 닫기 확인"
                >
                    <p>정말로 해당 테이블을 닫으시겠습니까? 해당 테이블의 모든 참가자는 다른 테이블의 빈자리로 자동 이동됩니다.</p>
                    <div className="flex justify-end mt-4">
                        <button onClick={() => setClosingTableId(null)} className="btn btn-secondary mr-2" disabled={isClosing}>
                            취소
                        </button>
                        <button onClick={confirmCloseTable} className="btn btn-danger" disabled={isClosing}>
                            {isClosing ? '닫는 중...' : '확인'}
                        </button>
                    </div>
                </Modal>
            )}

            {balancingResult && (
                <Modal
                    isOpen={!!balancingResult}
                    onClose={() => setBalancingResult(null)}
                    title="자동 밸런싱 결과"
                >
                    <ul className="list-disc pl-5">
                        {balancingResult.map((result, index) => (
                            <li key={index} className="mb-1">
                                <span className="font-semibold">{getParticipantNameById(result.participantId)}</span>:
                                <span className="mx-2 font-mono bg-gray-100 p-1 rounded">
                                    {result.fromTableNumber}-{result.fromSeatIndex! + 1}
                                </span>
                                <span className="font-bold">&rarr;</span>
                                <span className="mx-2 font-mono bg-blue-100 p-1 rounded">
                                    {result.toTableNumber}-{result.toSeatIndex! + 1}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-end mt-4">
                        <button onClick={() => setBalancingResult(null)} className="btn btn-primary">
                            닫기
                        </button>
                    </div>
                </Modal>
            )}
        </div>
      </DndProvider>
    );
};

export default TablesPage; 
