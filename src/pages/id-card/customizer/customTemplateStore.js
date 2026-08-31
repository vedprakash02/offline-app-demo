const DATABASE_NAME = "id-card-template-library";
const DATABASE_VERSION = 1;
const STORE_NAME = "templates";

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: "id" });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const getCustomTemplates = async () => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
    transaction.addEventListener("complete", () => database.close());
  });
};

export const saveCustomTemplate = async (file) => {
  const template = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    blob: file,
    createdAt: Date.now(),
  };
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).put(template);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.addEventListener("complete", () => database.close());
  });
  return template;
};

export const deleteCustomTemplate = async (templateId) => {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).delete(templateId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.addEventListener("complete", () => database.close());
  });
};
