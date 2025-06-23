import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useTables, Table } from '../hooks/useTables';
import { useParticipants, Participant } from '../hooks/useParticipants';
import { useStaff } from '../hooks/useStaff';
import { useMediaQuery } from '../hooks/useMediaQuery';
import TableCard from '../components/TableCard';
import TableDetailModal from '../components/TableDetailModal';
import PlayerActionModal from '../components/PlayerActionModal';
import MoveSeatModal from '../components/MoveSeatModal';
import ParticipantDetailModal from '../components/ParticipantDetailModal';
import { FaPlus, FaUsers, FaThList } from 'react-icons/fa';

const TablesPage: React.FC = () => {
    const {
        tables,
        setTables,
        loading: tablesLoading,
        error: tablesError,
        updateTableOrder,
        bustOutParticipant,
        moveSeat,
        openNewTable,
        closeTable,
        autoAssignSeats,
        activateTable,
        updateTableDetails,
    } = useTables();
    
    const { 
        participants, 
        loading: participantsLoading, 
        error: participantsError, 
        updateParticipant 
    } = useParticipants();

    const { staff, loading: staffLoading, error: staffError } = useStaff();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [detailModalTable, setDetailModalTable] = useState<Table | null>(null);
    const [detailModalParticipant, setDetailModalParticipant] = useState<Participant | null>(null);
    const [isMoveSeatModalOpen, setMoveSeatModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<{ participant: Participant; table: Table; seatIndex: number } | null>(null);
    const [actionMenu, setActionMenu] = useState<{ x: number, y: number } | null>(null);
    
    useEffect(() => {
        if (detailModalTable) {
            const updatedTable = tables.find((t: Table) => t.id === detailModalTable.id);
            setDetailModalTable(updatedTable || null);
        }
    }, [tables, detailModalTable]);

    const handleDragEnd = (event: DragEndEvent) => {
        if (isMobile) return;
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            const oldIndex = tables.findIndex((t) => t.id === active.id);
            const newIndex = tables.findIndex((t) => t.id === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                const newTables = arrayMove(tables, oldIndex, newIndex);
                setTables(newTables);
                updateTableOrder(newTables);
            }
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

    const handlePlayerSelect = (participant: Participant | null, table: Table, seatIndex: number, event?: React.MouseEvent) => {
        if (participant && event) {
            event.preventDefault();
            event.stopPropagation();
            setActionMenu({ x: event.clientX, y: event.clientY });
            setSelectedPlayer({ participant, table, seatIndex });
        }
    };
    
    const handleShowDetails = () => {
        if (selectedPlayer?.participant) {
            setDetailModalParticipant(selectedPlayer.participant);
        }
        handleCloseActionMenu();
    };

    const handleCloseActionMenu = () => {
        setActionMenu(null);
        setSelectedPlayer(null);
    };
    
    const handleOpenMoveSeatModal = () => {
        if (selectedPlayer?.participant) {
            setMoveSeatModalOpen(true);
        }
        setActionMenu(null);
    };
    
    const handleCloseMoveSeatModal = () => {
        setMoveSeatModalOpen(false);
        setSelectedPlayer(null);
    };

    const handleConfirmMove = async (toTableId: string, toSeatIndex: number) => {
        if (selectedPlayer?.participant && selectedPlayer.table) {
            try {
                await moveSeat(selectedPlayer.participant.id,
                    { tableId: selectedPlayer.table.id, seatIndex: selectedPlayer.seatIndex },
                    { tableId: toTableId, seatIndex: toSeatIndex }
                );
                handleCloseMoveSeatModal();
            } catch (error) {
                console.error("Failed to move participant:", error);
                alert(`자리 이동에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const handleBustOut = async () => {
        if (selectedPlayer?.participant) {
            await bustOutParticipant(selectedPlayer.participant.id);
        }
        handleCloseActionMenu();
    };
    
    const onPlayerSelectInModal = (participantId: string, tableId: string, seatIndex: number, event: React.MouseEvent) => {
        const participant = participants.find(p => p.id === participantId);
        const table = tables.find(t => t.id === tableId);
        if (participant && table) {
            handlePlayerSelect(participant, table, seatIndex, event);
        }
    };

    if (tablesLoading || participantsLoading || staffLoading) return <div className="p-4">Loading...</div>;
    if (tablesError || participantsError || staffError) return <div className="p-4 text-red-500">Error: {tablesError?.message || participantsError?.message || staffError?.message}</div>;

    const waitingPlayers = participants.filter(p => p.status === 'active' && !tables.some(t => t.seats.includes(p.id)));

    return (
        <div className="p-4 bg-gray-100 min-h-screen" onClick={handleCloseActionMenu}>
            {/* Header */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-800">테이블 현황</h1>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => autoAssignSeats(participants.filter(p => p.status === 'active'))}
                            className="btn btn-secondary"
                            disabled={tablesLoading || participantsLoading || waitingPlayers.length === 0}
                        >
                            자동 자리 배정
                        </button>
                        <button onClick={openNewTable} className="btn btn-primary">
                            <FaPlus className="mr-2"/>새 테이블 (대기)
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-6 text-gray-600">
                    <div className="flex items-center"><FaThList className="mr-2 text-blue-500" /> 총 테이블: <span className="font-bold ml-1">{tables.length}</span></div>
                    <div className="flex items-center"><FaUsers className="mr-2 text-green-500" /> 대기 플레이어: <span className="font-bold ml-1">{waitingPlayers.length}</span></div>
                </div>
            </div>

            {/* Tables Grid */}
            <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <SortableContext items={tables} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                </SortableContext>
            </DndContext>

            {/* Modals */}
            {detailModalTable && (
                <TableDetailModal
                    isOpen={!!detailModalTable}
                    onClose={() => setDetailModalTable(null)}
                    table={detailModalTable}
                    activateTable={activateTable}
                    onCloseTable={closeTable}
                    getParticipantName={getParticipantName}
                    onMoveSeat={moveSeat}
                    onBustOut={(participantId, tableId) => bustOutParticipant(participantId)}
                    onPlayerSelect={onPlayerSelectInModal}
                    updateTableDetails={updateTableDetails}
                />
            )}
            
            {actionMenu && selectedPlayer?.participant && (
                <PlayerActionModal
                    isOpen={!!actionMenu}
                    onClose={handleCloseActionMenu}
                    position={{ top: actionMenu.y, left: actionMenu.x }}
                    onBustOut={handleBustOut}
                    onMoveSeat={handleOpenMoveSeatModal}
                    onShowDetails={handleShowDetails}
                />
            )}

            {isMoveSeatModalOpen && selectedPlayer?.participant && (
                <MoveSeatModal
                    isOpen={isMoveSeatModalOpen}
                    onClose={handleCloseMoveSeatModal}
                    tables={tables}
                    movingParticipant={selectedPlayer.participant}
                    onConfirmMove={handleConfirmMove}
                    getParticipantName={getParticipantName}
                />
            )}
            
            {detailModalParticipant && (
                <ParticipantDetailModal
                    isOpen={!!detailModalParticipant}
                    onClose={() => setDetailModalParticipant(null)}
                    participant={detailModalParticipant}
                    onUpdate={updateParticipant}
                />
            )}
        </div>
    );
};

export default TablesPage;
