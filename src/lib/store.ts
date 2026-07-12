import { invoke } from "@tauri-apps/api/core";
import { load, Store } from "@tauri-apps/plugin-store";

// The GitHub PAT is kept in the OS keychain (see src-tauri commands).
// Only non-sensitive UI state (the selected project) stays in this JSON store.
let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("settings.json", { defaults: {}, autoSave: true });
  }
  return storePromise;
}

const LEGACY_TOKEN_KEY = "github_token"; // where older builds stored the PAT
const PROJECT_KEY = "selected_project_id";

export async function getToken(): Promise<string | null> {
  const fromKeychain = await invoke<string | null>("get_token");
  if (fromKeychain) return fromKeychain;

  // one-time migration: move any plaintext token into the keychain, then wipe it
  const store = await getStore();
  const legacy = (await store.get<string>(LEGACY_TOKEN_KEY)) ?? null;
  if (legacy) {
    await invoke("set_token", { token: legacy });
    await store.delete(LEGACY_TOKEN_KEY);
    await store.save();
    return legacy;
  }
  return null;
}

export async function setToken(token: string): Promise<void> {
  await invoke("set_token", { token });
}

export async function clearToken(): Promise<void> {
  await invoke("delete_token");
}

export async function getSelectedProjectId(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(PROJECT_KEY)) ?? null;
}

export async function setSelectedProjectId(id: string): Promise<void> {
  const store = await getStore();
  await store.set(PROJECT_KEY, id);
}
