import React, { useState } from 'react';

interface ImageModalProps {
    src: string;
    isOpen: boolean;
    onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ src, isOpen, onClose }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative max-w-full max-h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 z-50 text-white/50 hover:text-white p-2"
                >
                    ✕ Close
                </button>

                <div
                    className="relative group cursor-pointer touch-none select-none"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsRevealed(!isRevealed);
                    }}
                    style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                    <img
                        src={src}
                        alt="Restricted Content"
                        className={`max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all duration-200 pointer-events-none ${isRevealed ? 'filter-none' : 'blur-2xl opacity-50'}`}
                    />

                    {!isRevealed && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold text-lg border border-white/20 shadow-xl flex items-center gap-2 animate-pulse">
                                <span>👆</span>
                                <span>Tap to Reveal</span>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-white/40 text-xs mt-6 text-center">
                    Content is end-to-end encrypted.
                    <br />
                    Release to hide immediately.
                </p>
            </div>
        </div>
    );
};

export default ImageModal;
