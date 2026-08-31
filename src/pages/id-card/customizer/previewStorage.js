const storageKey = "id-card-preview-work";
const databaseName = "id-card-studio";
const storeName = "preview-work";

export const getStoredConfig = () => {
  try { return JSON.parse(localStorage.getItem("id-card-customizer-config")) || null; }
  catch { return null; }
};

export const getStoredPreviewWork = () => {
  try { return JSON.parse(localStorage.getItem(storageKey)) || null; }
  catch { return null; }
};

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(databaseName, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const loadPreviewWork = async () => {
  const fallback = getStoredPreviewWork();
  if (!window.indexedDB) return fallback;
  try {
    const database = await openDatabase();
    const stored = await new Promise((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).get(storageKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return stored || fallback;
  } catch { return fallback; }
};

export const savePreviewWork = async (work) => {
  if (!window.indexedDB) {
    localStorage.setItem(storageKey, JSON.stringify(work));
    return;
  }
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(work, storageKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
  localStorage.setItem(storageKey, JSON.stringify({ selectedStudentIndex: work.selectedStudentIndex, page: work.page }));
};
