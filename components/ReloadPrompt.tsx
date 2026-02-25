import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            if (r) {
                // Check for updates every hour
                setInterval(() => {
                    r.update()
                }, 60 * 60 * 1000)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    // Enhanced Update Check: Check on mount and when window regains focus
    React.useEffect(() => {
        const checkForUpdate = () => {
            if (updateServiceWorker) {
                console.log("Checking for SW update on visibility change...");
                updateServiceWorker(true);
            }
        };

        if (document.visibilityState === 'visible') {
            checkForUpdate();
        }

        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        });

        return () => window.removeEventListener('visibilitychange', checkForUpdate);
    }, [updateServiceWorker]);

    // FORCE UPDATE ON LOAD: If needRefresh is true, update immediately.
    React.useEffect(() => {
        if (needRefresh && updateServiceWorker) {
            console.log("Force updating to new version...");
            updateServiceWorker(true);
        }
    }, [needRefresh, updateServiceWorker]);

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    if (!offlineReady && !needRefresh) return null

    return (
        <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-white rounded-xl shadow-2xl border border-indigo-100 animate-in slide-in-from-bottom-4 flex flex-col gap-2 max-w-sm">
            <div className="flex items-start gap-3">
                <div className="text-xl">
                    {offlineReady ? '✅' : '🚀'}
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                        {offlineReady ? 'App ready to work offline' : 'New version available!'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {offlineReady
                            ? 'You can now use this app without internet.'
                            : 'Click below to update to the latest features.'}
                    </p>
                </div>
                <button onClick={close} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {needRefresh && (
                <button
                    className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm mt-1"
                    onClick={() => updateServiceWorker(true)}
                >
                    Refresh & Update
                </button>
            )}
        </div>
    )
}

export default ReloadPrompt
