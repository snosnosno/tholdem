import React, { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { useTranslation } from 'react-i18next';

const AnnouncementsPage: React.FC = () => {
    const { t } = useTranslation();
    const { dispatch } = useTournament();
    const [message, setMessage] = useState('');

    const handlePost = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        // dispatch({ type: 'POST_ANNOUNCEMENT', payload: { message } });
        console.log(`Dispatching POST_ANNOUNCEMENT with message: "${message}" (not implemented yet)`);
        
        setMessage('');
    };

    return (
        <div className="card">
            <h2 className="text-2xl font-bold mb-4">{t('announcements.title')}</h2>
            <form onSubmit={handlePost}>
                <textarea
                    className="input-field w-full"
                    rows={3}
                    placeholder={t('announcements.placeholder')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary w-full mt-2">
                    {t('announcements.buttonPost')}
                </button>
            </form>
        </div>
    );
};

export default AnnouncementsPage; 