import React, { useContext } from 'react';
import { TournamentContext, Participant } from '../contexts/TournamentContext';
import { IconType } from 'react-icons';
import { FaUsers, FaClock, FaTrophy } from 'react-icons/fa';

const TournamentDashboard = () => {
    const context = useContext(TournamentContext);

    if (!context) {
        return <div>Loading...</div>;
    }

    const { state } = context;
    const { participants, tournamentStatus, blindLevel, settings } = state;

    // Calculate total prize pool (example calculation)
    const totalBuyIn = participants.reduce((acc: number, p: Participant) => {
        const entryFee = 100000; // Example entry fee
        const rebuyCost = 50000; // Example rebuy cost
        return acc + entryFee + ((p.rebuyCount || 0) * rebuyCost);
    }, 0);
    const totalPrize = totalBuyIn;

    interface StatCardProps {
        icon: IconType;
        title: string;
        value: string | number;
        color: string;
    }

    const StatCard = ({ icon: Icon, title, value, color }: StatCardProps) => (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>
                {React.createElement(Icon, { size: 24, className: "text-white" })}
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Tournament Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    icon={FaUsers} 
                    title="Total Participants" 
                    value={participants.length}
                    color="bg-blue-500"
                />
                <StatCard 
                    icon={FaClock} 
                    title="Current Blind Level" 
                    value={blindLevel !== null ? `#${blindLevel + 1}` : 'N/A'}
                    color="bg-green-500"
                />
                <StatCard 
                    icon={FaTrophy} 
                    title="Estimated Prize Pool" 
                    value={`₩${totalPrize.toLocaleString()}`}
                    color="bg-yellow-500"
                />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Tournament Status</h2>
                <p className={`text-lg font-semibold ${tournamentStatus === 'running' ? 'text-green-600' : 'text-red-600'}`}>
                    {tournamentStatus.charAt(0).toUpperCase() + tournamentStatus.slice(1)}
                </p>
                <p className="text-gray-600 mt-2">
                    Welcome to the tournament control panel. Use the menu on the left to manage different aspects of the event.
                </p>
            </div>
        </div>
    );
};

export default TournamentDashboard; 