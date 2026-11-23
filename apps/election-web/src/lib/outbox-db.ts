// Lightweight native IndexedDB storage for offline outbox updates, results, and active issues
const DB_NAME = "election_offline_store";
const DB_VERSION = 1;
const UPDATES_STORE_NAME = "pending_updates";
const RESULTS_STORE_NAME = "pending_results";

export type OutboxUpdateItem = {
  id: string;
  assignmentId: number;
  pollingUnitId?: number;
  electionGroupId: number;
  partyId?: number;
  statusCategoryId: number;
  statusOptionId?: number;
  hasIssues: boolean;
  isEmergency?: boolean;
  issueAction: "none" | "link_existing" | "create_new";
  existingIssueIds?: number[];
  newIssueOptionIds?: number[];
  title?: string;
  message: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  mediaFiles: {
    name: string;
    type: "image" | "video" | "audio";
    blob: Blob;
    durationSeconds?: number;
  }[];
  createdAt: number;
  syncStatus: "pending" | "syncing" | "failed";
  retryCount: number;
  lastError?: string;
};

export type OutboxResultItem = {
  id: string;
  electionId: number;
  electionGroupId: number;
  pollingUnitId: number;
  assignmentId: number;
  image: {
    name: string;
    blob: Blob;
  };
  video?: {
    name: string;
    blob: Blob;
  };
  createdAt: number;
  syncStatus: "pending" | "syncing" | "failed";
  retryCount: number;
  lastError?: string;
};

// Open or initialize IndexedDB instance
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // SSR guard
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    // Open database connection
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Schema setup on initial create or version bump
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store for queueing situation updates offline
      if (!db.objectStoreNames.contains(UPDATES_STORE_NAME)) {
        const store = db.createObjectStore(UPDATES_STORE_NAME, { keyPath: "id" });

        // Indexes for status queries and chronological sorting
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Object store for queueing polling unit result uploads offline
      if (!db.objectStoreNames.contains(RESULTS_STORE_NAME)) {
        const resultsStore = db.createObjectStore(RESULTS_STORE_NAME, { keyPath: "id" });
        resultsStore.createIndex("syncStatus", "syncStatus", { unique: false });
        resultsStore.createIndex("electionId", "electionId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save a new pending update to the outbox
export async function saveToOutbox(item: OutboxUpdateItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPDATES_STORE_NAME, "readwrite");
    const store = tx.objectStore(UPDATES_STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Retrieve all pending or failed outbox updates
export async function getPendingUpdates(): Promise<OutboxUpdateItem[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPDATES_STORE_NAME, "readonly");
    const store = tx.objectStore(UPDATES_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result as OutboxUpdateItem[]) || [];
      resolve(items.filter((i) => i.syncStatus !== "syncing"));
    };

    request.onerror = () => reject(request.error);
  });
}

// Retrieve count of pending outbox items
export async function getOutboxCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPDATES_STORE_NAME, "readonly");
    const store = tx.objectStore(UPDATES_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Update status of an outbox item
export async function updateOutboxItemStatus(
  id: string,
  syncStatus: "pending" | "syncing" | "failed",
  error?: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPDATES_STORE_NAME, "readwrite");
    const store = tx.objectStore(UPDATES_STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as OutboxUpdateItem;
      if (!item) {
        resolve();
        return;
      }

      item.syncStatus = syncStatus;
      if (syncStatus === "failed") {
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = error;
      }

      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

// Remove an item from the outbox upon successful sync
export async function removeUpdateFromOutbox(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPDATES_STORE_NAME, "readwrite");
    const store = tx.objectStore(UPDATES_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Save a new pending result upload to the outbox
export async function saveResultToOutbox(item: OutboxResultItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESULTS_STORE_NAME, "readwrite");
    const store = tx.objectStore(RESULTS_STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Retrieve queued result uploads (optionally including items currently syncing)
export async function getPendingResults(includeSyncing = false): Promise<OutboxResultItem[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESULTS_STORE_NAME, "readonly");
    const store = tx.objectStore(RESULTS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result as OutboxResultItem[]) || [];
      resolve(includeSyncing ? items : items.filter((i) => i.syncStatus !== "syncing"));
    };
    request.onerror = () => reject(request.error);
  });
}

// Update sync status of a queued result upload
export async function updateResultOutboxItemStatus(
  id: string,
  syncStatus: "pending" | "syncing" | "failed",
  error?: string,
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESULTS_STORE_NAME, "readwrite");
    const store = tx.objectStore(RESULTS_STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as OutboxResultItem;
      if (!item) {
        resolve();
        return;
      }

      item.syncStatus = syncStatus;
      if (syncStatus === "failed") {
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = error;
      }

      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

// Remove a result upload from the outbox upon successful sync
export async function removeResultFromOutbox(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESULTS_STORE_NAME, "readwrite");
    const store = tx.objectStore(RESULTS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
