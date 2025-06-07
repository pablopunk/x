const DB_NAME = "ImageAnnotationDB";
const STORE_NAME = "images";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error("IndexedDB error:", request.error);
			reject(new Error("Failed to open IndexedDB"));
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
	return dbPromise;
};

export const storeBlob = async (id: string, blob: Blob): Promise<void> => {
	const db = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.put(blob, id);

		request.onsuccess = () => resolve();
		request.onerror = () => {
			console.error("Failed to store blob:", request.error);
			reject(request.error);
		};
	});
};

export const getBlob = async (id: string): Promise<Blob | null> => {
	const db = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(id);

		request.onsuccess = () => {
			resolve(request.result ? (request.result as Blob) : null);
		};
		request.onerror = () => {
			console.error("Failed to get blob:", request.error);
			reject(request.error);
		};
	});
};

export const deleteBlob = async (id: string): Promise<void> => {
	const db = await initDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(id);

		request.onsuccess = () => resolve();
		request.onerror = () => {
			console.error("Failed to delete blob:", request.error);
			reject(request.error);
		};
	});
};
