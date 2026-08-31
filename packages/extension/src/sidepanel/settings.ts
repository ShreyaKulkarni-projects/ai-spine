export interface PanelSettings {
  apiKey: string;
}

const DEFAULTS: PanelSettings = { apiKey: "" };
const STORAGE_KEY = "ai-spine-settings";

export async function loadSettings(): Promise<PanelSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULTS, ...(stored[STORAGE_KEY] ?? {}) };
}

export async function saveSettings(partial: Partial<PanelSettings>): Promise<PanelSettings> {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}
