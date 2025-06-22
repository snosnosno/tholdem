import React, { useMemo, useState, useEffect } from 'react';
import { useTables, Table, BalancingResult } from '../hooks/useTables';
import { useParticipants, Participant } from '../hooks/useParticipants';
import Modal from '../components/Modal';
import TableCard from '../components/TableCard';
import PlayerActionModal from '../components/PlayerActionModal';
import TableListView from '../components/TableListView';
import TableDetailModal from '../components/TableDetailModal';
import ParticipantDetailModal from '../components/ParticipantDetailModal';
import MoveSeatModal from '../components/MoveSeatModal';

const TablesPage: React.FC = () => {
    const { tables, setTables, loading: tablesLoading, error: tablesError, autoAssignSeats, moveSeat, bustOutParticipant, closeTable, openNewTable, updateTableDetails } = useTables();
    const { participants, loading: participantsLoading, error: participantsError } = useParticipants();

    const [isClosing, setIsClosing] = useState(false);
    const [isOpeningTable, setIsOpeningTable] = useState(false);
    const [closingTableId, setClosingTableId] = useState<string | null>(null);
    const [balancingResult, setBalancingResult] = useState<BalancingResult[] | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [gridSize, setGridSize] = useState(3);
    
    const [selectedPlayer, setSelectedPlayer] = useState<{
        participant: Participant | null;
        table: Table | null;
        seatIndex: number | null;
    }>({ participant: null, table: null, seatIndex: null });
    
    const [detailModalTable, setDetailModalTable] = useState<Table | null>(null);
    const [isParticipantDetailModalOpen, setIsParticipantDetailModalOpen] = useState(false);
    const [isMoveSeatModalOpen, setIsMoveSeatModalOpen] = useState(false);

    useEffect(() => {
        if (detailModalTable) {
            const updatedTable = tables.find(t => t.id === detailModalTable.id);
            setDetailModalTable(updatedTable || null);
        }
    }, [tables]);

    const handleTableSelect = (table: Table) => {
        setDetailModalTable(table);
    };

    const handleCloseDetailModal = () => {
        setDetailModalTable(null);
    };

    const handlePlayerSelect = (participantId: string, tableId: string, seatIndex: number) => {
        const participant = participants.find(p => p.id === participantId) || null;
        const table = tables.find(t => t.id === tableId) || null;
        setSelectedPlayer({ participant, table, seatIndex });
    };

    const handleClosePlayerActionModal = () => {
        setSelectedPlayer({ participant: null, table: null, seatIndex: null });
    };
    
    const handleOpenParticipantDetailModal = () => {
        setIsParticipantDetailModalOpen(true);
    };

    const handleCloseParticipantDetailModal = () => {
        setIsParticipantDetailModalOpen(false);
    };

    const handleOpenMoveSeatModal = () => {
        setIsMoveSeatModalOpen(true);
    };

    const handleCloseMoveSeatModal = () => {
        setIsMoveSeatModalOpen(false);
    };

    const handleConfirmMove = async (toTableId: string, toSeatIndex: number) => {
        if (!selectedPlayer.participant || !selectedPlayer.table || selectedPlayer.seatIndex === null) return;
    
        const from = {
            tableId: selectedPlayer.table.id,
            seatIndex: selectedPlayer.seatIndex,
        };
        const to = {
            tableId: toTableId,
            seatIndex: toSeatIndex,
        };
        
        try {
            await moveSeat(selectedPlayer.participant.id, from, to);
            handleCloseMoveSeatModal();
            handleClosePlayerActionModal();
        } catch (error: any) {
            alert(`자리 이동 실패: ${error.message}`);
        }
    };

    const handleAssignSeats = () => {
        if (!window.confirm('모든 플레이어의 자리를 리드로우합니다 진행하겠습니까?')) {
            return;
        }
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
            if (detailModalTable?.id === closingTableId) {
                setDetailModalTable(null);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsClosing(false);
            setClosingTableId(null);
        }
    };
    
    const handleBustOutOptimistic = async (participantId: string, tableId: string) => {
        const originalTables = [...tables];
        const newTables = tables.map(t => {
            if (t.id === tableId) {
                return {
                    ...t,
                    seats: t.seats.map(seat => seat === participantId ? null : seat)
                };
            }
            return t;
        });

        setTables(newTables);
        if (detailModalTable?.id === tableId) {
            setDetailModalTable(newTables.find(t => t.id === tableId) || null);
        }
        
        try {
            await bustOutParticipant(participantId);
        } catch (error) {
            console.error("Failed to bust out participant, rolling back UI.", error);
            setTables(originalTables);
             if (detailModalTable?.id === tableId) {
                setDetailModalTable(originalTables.find(t => t.id === tableId) || null);
            }
            alert("탈락 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
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

        return maxPlayers - minPlayers >= 2;
    }, [tables]);

    const emptySeats = useMemo(() => {
        return tables.reduce((acc, table) => {
            const empty = (table.seats || []).filter(s => s === null).length;
            return acc + empty;
        }, 0);
    }, [tables]);
    
    const gridColsClass = useMemo(() => {
        switch (gridSize) {
            case 1: return 'grid-cols-1';
            case 2: return 'grid-cols-1 md:grid-cols-2';
            case 3: return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
            case 4: return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
            case 5: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            default: return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
        }
    }, [gridSize]);

    if (tablesLoading || participantsLoading) return <div className="card">Loading...</div>;
    if (tablesError) return <div className="card">Error loading tables: {tablesError.message}</div>;
    if (participantsError) return <div className="card">Error loading participants: {participantsError.message}</div>;

    const getParticipantNameById = (id: string) => participants.find(p => p.id === id)?.name || 'Unknown';

    return (
        <div className="card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">테이블 및 좌석 관리</h2>
                <div className="flex items-center mt-2 sm:mt-0">
                    <button onClick={handleOpenTable} className="btn bg-green-500 hover:bg-green-600 text-white mr-4" disabled={isOpeningTable}>
                        {isOpeningTable ? '테이블 여는중...' : '새 테이블 열기'}
                    </button>
                    <button onClick={handleAssignSeats} className="btn btn-primary">
                        좌석 자동 배정
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                {viewMode === 'grid' ? (
                    <div className="flex items-center w-1/3">
                        <label htmlFor="grid-size-slider" className="mr-2 text-sm font-medium text-gray-700">카드 크기:</label>
                        <input
                            id="grid-size-slider"
                            type="range"
                            min="1"
                            max="5"
                            value={gridSize}
                            onChange={(e) => setGridSize(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                ) : <div className="w-1/3"></div>}
                
                <div className="flex items-center space-x-4">
                    <div className="text-lg font-semibold">테이블: {tables.length}</div>
                                        <div className="text-lg font-semibold">빈좌석: {emptySeats}</div>
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
                    <p>테이블간 인원 수 차이가 2명 이상입니다. 밸런스를 조정하는 것이 좋습니다.</p>
                </div>
            )}

            {viewMode === 'grid' ? (
                <div className={`grid ${gridColsClass} gap-6`}>
                    {tables.map((table: Table) => (
                        <TableCard
                            key={table.id}
                            table={table}
                            onCloseTable={handleCloseTable}
                            updateTableDetails={updateTableDetails}
                            onTableSelect={handleTableSelect}
                            isProcessing={isClosing || isOpeningTable}
                        />
                    ))}
                </div>
            ) : (
                <TableListView
                    tables={tables}
                    onTableSelect={handleTableSelect}
                />
            )}
            
            <TableDetailModal
                isOpen={!!detailModalTable}
                onClose={handleCloseDetailModal}
                table={detailModalTable}
                getParticipantName={getParticipantName}
                onMoveSeat={moveSeat}
                onBustOut={handleBustOutOptimistic}
                onPlayerSelect={handlePlayerSelect}
                updateTableDetails={updateTableDetails}
                isDimmed={!!selectedPlayer.participant || isParticipantDetailModalOpen || isMoveSeatModalOpen}
            />

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

            <PlayerActionModal
                isOpen={!!selectedPlayer.participant}
                onClose={handleClosePlayerActionModal}
                player={selectedPlayer.participant}
                table={selectedPlayer.table}
                seatIndex={selectedPlayer.seatIndex}
                onBustOut={(participantId) => handleBustOutOptimistic(participantId, selectedPlayer.table!.id)}
                onDetailClick={handleOpenParticipantDetailModal}
                onMoveSeatClick={handleOpenMoveSeatModal}
            />

            <ParticipantDetailModal
                isOpen={isParticipantDetailModalOpen}
                onClose={handleCloseParticipantDetailModal}
                participant={selectedPlayer.participant}
                tableNumber={selectedPlayer.table?.tableNumber}
                seatNumber={selectedPlayer.seatIndex}
            />

            <MoveSeatModal
                isOpen={isMoveSeatModalOpen}
                onClose={handleCloseMoveSeatModal}
                tables={tables}
                movingParticipant={selectedPlayer.participant}
                onConfirmMove={handleConfirmMove}
                getParticipantName={getParticipantName}
            />
        </div>
    );
};

export default TablesPage;
