import React, { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';

const AnnouncementsPage: React.FC = () => {
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
            <h2 className="text-2xl font-bold mb-4">공지 보내기</h2>
            <form onSubmit={handlePost}>
                <textarea
                    className="input-field w-full"
                    rows={3}
                    placeholder="플레이어에게 보낼 공지 내용을 입력하세요..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary w-full mt-2">
                    공지 게시
                </button>
            </form>
        </div>
    );
};

export default AnnouncementsPage; 