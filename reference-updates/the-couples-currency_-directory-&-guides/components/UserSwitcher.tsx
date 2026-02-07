
import React from 'react';
import { User } from '../../App';


interface UserSwitcherProps {
    currentUser: User;
    otherUser: User;
    onSwitch: () => void;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ currentUser, otherUser, onSwitch }) => {
    return (
        <div className="bg-gray-100 rounded-lg p-3 mb-6 flex items-center justify-between text-sm">
            <p className="text-gray-700">
                Viewing as: <span className="font-bold text-blue-600">{currentUser.name}</span>
            </p>
            <button 
                onClick={onSwitch}
                className="px-4 py-2 font-semibold bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            >
                Switch to {otherUser.name}
            </button>
        </div>
    );
};

export default UserSwitcher;
