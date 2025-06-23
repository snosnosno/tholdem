import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTables, Table, BalancingResult } from '../hooks/useTables';
// ... (imports)

const TablesPage: React.FC = () => {
    // ... (hooks and state)

    useEffect(() => {
        if (detailModalTable) {
            const updatedTable = tables.find((t: Table) => t.id === detailModalTable.id);
            setDetailModalTable(updatedTable || null);
        }
    }, [tables]);

    const handleDragEnd = (event: DragEndEvent) => {
        if (isMobile) return;
        const { active, delta } = event;
        const tableId = active.id as string;
    
        setTables((currentTables: Table[]) => {
            const newTables = currentTables.map((table: Table) => {
                if (table.id === tableId) {
                    const newPosition = {
                        x: (table.position?.x || 0) + delta.x,
                        y: (table.position?.y || 0) + delta.y,
                    };
                    updateTablePosition(tableId, newPosition);
                    return { ...table, position: newPosition };
                }
                return table;
            });
            return newTables;
        });
    };
    
    // ... (other handlers)

    const handlePlayerSelect = (participantId: string, tableId: string, seatIndex: number) => {
        const participant = participants.find((p: Participant) => p.id === participantId) || null;
        const table = tables.find((t: Table) => t.id === tableId) || null;
        setSelectedPlayer({ participant, table, seatIndex });
    };

    // ... (other handlers)
    
    const handleBustOutOptimistic = async (participantId: string, tableId: string) => {
        const originalTables = [...tables];
        const newTables = tables.map((t: Table) => {
            if (t.id === tableId) {
                return {
                    ...t,
                    seats: t.seats.map((seat: string | null) => seat === participantId ? null : seat)
                };
            }
            return t;
        });

        setTables(newTables);
        if (detailModalTable?.id === tableId) {
            setDetailModalTable(newTables.find((t: Table) => t.id === tableId) || null);
        }
        
        try {
            await bustOutParticipant(participantId);
        } catch (error) {
            console.error("Failed to bust out participant, rolling back UI.", error);
            setTables(originalTables);
             if (detailModalTable?.id === tableId) {
                setDetailModalTable(originalTables.find((t: Table) => t.id === tableId) || null);
            }
            alert("탈락 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };
    
    // ... (getParticipantName, getDealerName)

    const needsBalancing = useMemo(() => {
        const playerCounts = tables
            .filter((t: Table) => t.status === 'open')
            .map((t: Table) => (t.seats || []).filter((s: string | null) => s !== null).length)
            .filter((count: number) => count > 0); 

        if (playerCounts.length <= 1) return false;

        const minPlayers = Math.min(...playerCounts);
        const maxPlayers = Math.max(...playerCounts);

        return maxPlayers - minPlayers >= 2;
    }, [tables]);

    const emptySeats = useMemo(() => {
        return tables.filter((t: Table) => t.status === 'open').reduce((acc: number, table: Table) => {
            const empty = (table.seats || []).filter((s: string | null) => s === null).length;
            return acc + empty;
        }, 0);
    }, [tables]);
    
    // ... (loading/error handling)

    // ... (renderTableCards)
    
    return (
        <div className="card">
            {/* ... (JSX with no changes) */}
            
            <div className="flex items-center space-x-4">
                <div className="text-lg font-semibold">테이블: {tables.length} (활성: {tables.filter((t: Table) => t.status==='open').length})</div>
                <div className="text-lg font-semibold">빈좌석: {emptySeats}</div>
            </div>

            {/* ... (JSX with no changes) */}
            
            <MoveSeatModal
                isOpen={isMoveSeatModalOpen}
                onClose={handleCloseMoveSeatModal}
                tables={tables.filter((t: Table) => t.status === 'open')}
                movingParticipant={selectedPlayer.participant}
                onConfirmMove={handleConfirmMove}
                getParticipantName={getParticipantName}
            />
        </div>
    );
};

export default TablesPage;
