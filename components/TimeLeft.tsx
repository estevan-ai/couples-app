import React, { useState, useEffect } from 'react';

const TimeLeft = ({ timestamp, expiresAt }: { timestamp: number, expiresAt?: number }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (!expiresAt) {
            setTimeLeft(new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                clearInterval(interval);
            } else {
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                setTimeLeft(`${hrs}h ${mins}m`);
            }
        }, 60000); // Update every minute

        // Initial set
        const now = Date.now();
        const diff = expiresAt - now;
        if (diff > 0) {
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            setTimeLeft(`${hrs}h ${mins}m`);
        } else {
            setTimeLeft('Expired');
        }

        return () => clearInterval(interval);
    }, [expiresAt, timestamp]);

    return (
        <span className="text-[9px] text-gray-400 capitalize">{timeLeft}</span>
    );
};

export default TimeLeft;
