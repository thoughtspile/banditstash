export function makeMemoryStorage() {
  const storageData = new Map<string, string>();
  const storage = {
    getItem: (key: string) => storageData.get(key) ?? null,
    setItem: (key: string, value: string) => storageData.set(key, value),
  };
  return { storage, storageData };
}
