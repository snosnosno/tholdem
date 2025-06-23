import React, { useMemo, useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { useTables, Table } from '../hooks/useTables';
import { useParticipants, Participant } from '../hooks/useParticipants';
import { useStaff, Staff } from '../hooks/useStaff';
import { useMediaQuery } from '../hooks/useMediaQuery';
import TableCard from '../components/TableCard';
import TableDetailModal from '../components/TableDetailModal';
import PlayerActionModal from '../components/PlayerActionModal';
import MoveSeatModal from '../components/MoveSeatModal';
import { FaPlus } from 'react-icons/fa';

const TablesPage: React.FC = () => {
    const {
        tables,
        setTables,
        loading: tablesLoading,
        error: tablesError,
        updateTablePosition,
        bustOutParticipant,
        moveSeat,
        openNewTable,
        closeTable,
        autoAssignSeats,
        activateTable
    } = useTables();
    
    const { participants, loading: participantsLoading, error: participantsError } = useParticipants();
    const { staff, loading: staffLoading, error: staffError } = useStaff();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [detailModalTable, setDetailModalTable] = useState<Table | null>(null);
    const [isMoveSeatModalOpen, setMoveSeatModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<{ participant: Participant | null; table: Table | null; seatIndex: number } | null>(null);
    const [actionMenu, setActionMenu] = useState<{ x: number, y: number, participant: Participant, table: Table, seatIndex: number } | null>(null);
    
    useEffect(() => {
        if (detailModalTable) {
            const updatedTable = tables.find((t: Table) => t.id === detailModalTable.id);
            setDetailModalTable(updatedTable || null);
        }
    }, [tables, detailModalTable]);

    const handleDragEnd = (event: DragEndEvent) => {
        if (isMobile) return;
        const { active, delta } = event;
        const tableId = active.id as string;
        
        const table = tables.find(t => t.id === tableId);
        if (table) {
            const newPosition = {
                x: (table.position?.x || 0) + delta.x,
                y: (table.position?.y || 0) + delta.y,
            };
            // Optimistic update
            const updatedTables = tables.map(t => t.id === tableId ? { ...t, position: newPosition } : t);
            setTables(updatedTables);
            // Debounced update to backend can be added here
            updateTablePosition(tableId, newPosition);
        }
    };

    const getParticipantName = (participantId: string | null): string => {
        if (!participantId) return 'Empty';
        const p = participants.find(p => p.id === participantId);
        return p ? p.name : 'Unknown';
    };

    const getDealerName = (dealerId: string | null): string => {
        if (!dealerId) return 'N/A';
        const d = staff.find(s => s.id === dealerId);
        return d ? d.name : 'Unknown';
    };

    const handlePlayerSelect = (participant: Participant | null, table: Table | null, seatIndex: number, event?: React.MouseEvent) => {
        if (event) {
            event.preventDefault();
            setActionMenu({ x: event.pageX, y: event.pageY, participant: participant!, table: table!, seatIndex });
        }
        setSelectedPlayer({ participant, table, seatIndex });
    };

    const handleCloseActionMenu = () => {
        setActionMenu(null);
    };

    const handleOpenMoveSeatModal = () => {
        if (selectedPlayer && selectedPlayer.participant) {
            setMoveSeatModalOpen(true);
        }
        handleCloseActionMenu();
    };
    
    const handleCloseMoveSeatModal = () => {
        setMoveSeatModalOpen(false);
        setSelectedPlayer(null);
    };

    const handleConfirmMove = async (toTableId: string, toSeatIndex: number) => {
        if (selectedPlayer && selectedPlayer.participant && selectedPlayer.table) {
            await moveSeat(selectedPlayer.participant.id,
                { tableId: selectedPlayer.table.id, seatIndex: selectedPlayer.seatIndex },
                { tableId: toTableId, seatIndex: toSeatIndex }
            );
            handleCloseMoveSeatModal();
        }
    };

    const handleBustOutOptimistic = async (participantId: string, tableId: string) => {
        if (!participantId || !tableId) return;

        const originalTables = tables;
        const newTables = tables.map((t) => {
            if (t.id === tableId) {
                return {
                    ...t,
                    seats: t.seats.map((seat) => (seat === participantId ? null : seat)),
                };
            }
            return t;
        });
        setTables(newTables);
        handleCloseActionMenu();

        try {
            await bustOutParticipant(participantId);
        } catch (error) {
            console.error("Failed to bust out participant, rolling back UI.", error);
            setTables(originalTables);
            alert("탈락 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    const needsBalancing = useMemo(() => {
        const playerCounts = tables
            .filter(t => t.status === 'open')
            .map(t => (t.seats || []).filter(s => s !== null).length)
            .filter(count => count > 0);

        if (playerCounts.length <= 1) return false;
        const minPlayers = Math.min(...playerCounts);
        const maxPlayers = Math.max(...playerCounts);
        return maxPlayers - minPlayers >= 2;
    }, [tables]);

    const emptySeats = useMemo(() => {
        return tables.filter(t => t.status === 'open').reduce((acc, table) => {
            return acc + (table.seats || []).filter(s => s === null).length;
        }, 0);
    }, [tables]);

    if (tablesLoading || participantsLoading || staffLoading) return <div>Loading...</div>;
    if (tablesError || participantsError || staffError) return <div>Error: {tablesError?.message || participantsError?.message || staffError?.message}</div>;

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="p-4 bg-gray-100 min-h-screen">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">테이블 현황</h1>
                     <div className="flex items-center space-x-2">
                         {needsBalancing && <button onClick={() => autoAssignSeats(participants.filter(p => p.status === 'active'))} className="btn btn-warning">테이블 밸런싱</button>}
                        <button onClick={openNewTable} className="btn btn-primary"><FaPlus className="mr-2"/>새 테이블 (대기)</button>
                    </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                    <div className="text-lg font-semibold">테이블: {tables.length} (활성: {tables.filter(t => t.status === 'open').length})</div>
                    <div className="text-lg font-semibold">참가자: {participants.filter(p => p.status === 'active').length}</div>
                    <div className="text-lg font-semibold">빈좌석: {emptySeats}</div>
                </div>

                <div className="relative" style={{ height: 'calc(100vh - 200px)' }}>
                    {tables.map(table => (
                        <TableCard
                            key={table.id}
                            table={table}
                            participants={participants}
                            onTableClick={() => setDetailModalTable(table)}
                            onPlayerSelect={handlePlayerSelect}
                            isMobile={isMobile}
                            getParticipantName={getParticipantName}
                            getDealerName={getDealerName}
                        />
                    ))}
                </div>

                {detailModalTable && (
                    <TableDetailModal
                        isOpen={!!detailModalTable}
                        onClose={() => setDetailModalTable(null)}
                        table={detailModalTable}
                        activateTable={activateTable}
                        onCloseTable={closeTable}
                        getParticipantName={getParticipantName}
                    />
                )}
                
                {actionMenu && selectedPlayer && selectedPlayer.participant && selectedPlayer.table && (
                    <PlayerActionModal
                        isOpen={!!actionMenu}
                        onClose={handleCloseActionMenu}
                        position={{ top: actionMenu.y, left: actionMenu.x }}
                        onBustOut={() => handleBustOutOptimistic(selectedPlayer.participant!.id, selectedPlayer.table!.id)}
                        onMoveSeat={handleOpenMoveSeatModal}
                    />
                )}

                {isMoveSeatModalOpen && selectedPlayer && selectedPlayer.participant && (
                    <MoveSeatModal
                        isOpen={isMoveSeatModalOpen}
                        onClose={handleCloseMoveSeatModal}
                        tables={tables.filter(t => t.status === 'open')}
                        movingParticipant={selectedPlayer.participant}
                        onConfirmMove={handleConfirmMove}
                        getParticipantName={getParticipantName}
                    />
                )}
            </div>
        </DndContext>
    );
};

export default TablesPage;
