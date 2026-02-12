import React, { useState, useRef } from 'react';

const AudioRecorder: React.FC<{ onStop: (blob: Blob) => void; minimal?: boolean }> = ({ onStop, minimal }) => {
    const [recording, setRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const startTimeRef = useRef<number>(0);
    const stoppingRef = useRef<boolean>(false);

    const start = async () => {
        stoppingRef.current = false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (stoppingRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else {
                mimeType = '';
            }

            console.log(`Using MIME type: ${mimeType || 'default'}`);

            mediaRecorder.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                const duration = Date.now() - startTimeRef.current;

                if (duration < 500) {
                    console.warn(`Recording too short (${duration}ms). Discarding.`);
                    stream.getTracks().forEach(t => t.stop());

                    const btn = document.getElementById('record-btn');
                    if (btn) {
                        btn.style.backgroundColor = '#fee2e2';
                        setTimeout(() => btn.style.backgroundColor = '', 500);
                    }
                    return;
                }

                const type = mimeType || 'audio/webm';
                const blob = new Blob(chunks.current, { type });

                if (blob.size === 0) {
                    alert("Recording failed (0 bytes). Check microphone permissions.");
                    return;
                }
                onStop(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.current.start();
            setRecording(true);
            startTimeRef.current = Date.now();

            if (stoppingRef.current) {
                mediaRecorder.current.stop();
                setRecording(false);
            }

        } catch (e: any) {
            console.error("Mic Error", e);
            alert(`Could not access microphone: ${e.message}`);
        }
    };

    const stop = () => {
        stoppingRef.current = true;
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            setRecording(false);
        } else {
            setRecording(false);
        }
    };

    return (
        <button
            id="record-btn"
            type="button"
            onMouseDown={start}
            onMouseUp={stop}
            onTouchStart={start}
            onTouchEnd={stop}
            onMouseLeave={stop}
            className={`rounded-full transition-all duration-200 shadow-sm flex items-center justify-center ${minimal
                    ? 'p-2 w-9 h-9'
                    : 'p-3'
                } ${recording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title="Hold to Record"
        >
            <span className={`${minimal ? 'text-sm' : 'text-xl'}`}>{recording ? '🎙️' : '🎤'}</span>
        </button>
    );
};

export default AudioRecorder;
