
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="py-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
                <span className="bg-gradient-to-r from-purple-400 to-indigo-500 text-transparent bg-clip-text">
                    SONICS.ai : : Comics & Scripts - Generator / Editor
                </span>
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Bring your stories to life, one panel at a time.</p>
        </header>
    );
};

export default Header;
