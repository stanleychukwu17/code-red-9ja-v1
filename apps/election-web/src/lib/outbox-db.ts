// Lightweight native IndexedDB storage for offline outbox updates and active issues
const DB_NAME = "election_offline_store";
const DB_VERSION = 2;
const STORE_NAME = "pending_updates";
const ISSUES_STORE_NAME = "active_issues";

export type OutboxUpdateItem = {
  id: string;
  pollingUnitId: number;
  electionGroupId: number;
  assignmentId?: number;
  partyId?: number;
  statusCategoryId: number;
  statusOptionId?: number;
  hasIssues: boolean;
  issueAction: "none" | "link_existing" | "create_new";
  existingIssueIds?: number[];
  newIssueOptionIds?: number[];
  message: string;
  mediaFiles: {
    name: string;
    type: "image" | "video" | "audio";
    blob: Blob;
  }[];
  createdAt: number;
  syncStatus: "pending" | "syncing" | "failed";
  retryCount: number;
  lastError?: string;
};

export type CachedActiveIssue = {
  id: number;
  pollingUnitId: number;
  issueOptionId: number;
  issueName: string;
  categoryName: string;
  startedAt: number;
};

// Open or initialize IndexedDB instance
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(ISSUES_STORE_NAME)) {
        const issuesStore = db.createObjectStore(ISSUES_STORE_NAME, { keyPath: "id" });
        issuesStore.createIndex("pollingUnitId", "pollingUnitId", { unique: false });
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
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Retrieve all pending or failed outbox updates
export async function getPendingUpdates(): Promise<OutboxUpdateItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
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
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
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
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
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
export async function removeFromOutbox(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get cached active issues for a polling unit
export async function getActiveIssuesForPU(pollingUnitId: number): Promise<CachedActiveIssue[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(ISSUES_STORE_NAME, "readonly");
      const store = tx.objectStore(ISSUES_STORE_NAME);
      const index = store.index("pollingUnitId");
      const request = index.getAll(pollingUnitId);

      request.onsuccess = () => resolve((request.result as CachedActiveIssue[]) || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Save active issue to cache
export async function cacheActiveIssue(issue: CachedActiveIssue): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(ISSUES_STORE_NAME, "readwrite");
      const store = tx.objectStore(ISSUES_STORE_NAME);
      store.put(issue);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore cache error
  }
}
