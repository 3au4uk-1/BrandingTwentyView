const getLocalStorage = (): Storage | null => {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const getSessionStorage = (): Storage | null => {
  try {
    if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) {
      return null;
    }

    return globalThis.sessionStorage;
  } catch {
    return null;
  }
};

export const readLocalStorage = (key: string): string | null => {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const writeLocalStorage = (key: string, value: string): void => {
  try {
    getLocalStorage()?.setItem(key, value);
  } catch {
    // Storage may be unavailable in the front component sandbox.
  }
};

export const readSessionStorage = (key: string): string | null => {
  try {
    return getSessionStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const writeSessionStorage = (key: string, value: string): void => {
  try {
    getSessionStorage()?.setItem(key, value);
  } catch {
    // Storage may be unavailable in the front component sandbox.
  }
};
