
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface KeyDB extends DBSchema {
    keys: {
        key: string;
        value: CryptoKey;
    };
}

const DB_NAME = 'CouplesCurrencyKeys';
const STORE_NAME = 'keys';
const PRIVATE_KEY_ID = 'user_private_key';

let dbPromise: Promise<IDBPDatabase<KeyDB>> | null = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<KeyDB>(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME);
            },
        });
    }
    return dbPromise;
}

export async function savePrivateKey(key: CryptoKey): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, key, PRIVATE_KEY_ID);
}

export async function getPrivateKey(): Promise<CryptoKey | undefined> {
    const db = await getDB();
    return await db.get(STORE_NAME, PRIVATE_KEY_ID);
}

export async function clearPrivateKey(): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, PRIVATE_KEY_ID);
}
