import React, { useState, useMemo } from 'react';
import { useParticipants, Participant } from '../hooks/useParticipants';
import { useTables, Table } from '../hooks/useTables';

const ParticipantsPage: React.FC = () => {
  const { participants, loading: participantsLoading, error: participantsError, addParticipant, updateParticipant, deleteParticipant, addParticipantAndAssignToSeat } = useParticipants();
  const { tables, loading: tablesLoading, error: tablesError } = useTables();

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '', playerIdentifier: '', participationMethod: '', chips: 10000, status: 'active' as const });

  const participantLocations = useMemo(() => {
    const locations = new Map<string, string>();
    tables.forEach((table: Table) => {
      (table.seats || []).forEach((participantId: string | null, seatIndex: number) => {
        if (participantId) {
            locations.set(participantId, `${table.name}-${seatIndex + 1}`);
        }
      });
    });
    return locations;
  }, [tables]);

  // ... (the rest of the file is unchanged)
};

export default ParticipantsPage;
