import { useEffect, useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { verifyToken } from "../lib/github";

interface Props {
  initialToken: string;
  onSaved: (token: string) => void;
  onCancel?: () => void;
}

export function Settings({ initialToken, onSaved, onCancel }: Props) {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [message, setMessage] = useState("");
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    isEnabled()
      .then(setAutostart)
      .catch(() => {});
  }, []);

  async function toggleAutostart(next: boolean) {
    setAutostart(next); // optimistic
    try {
      await (next ? enable() : disable());
    } catch {
      setAutostart(!next); // revert on failure
    }
  }

  async function handleSave() {
    setStatus("checking");
    setMessage("");
    try {
      const login = await verifyToken(token.trim());
      setMessage(`Connected as @${login}`);
      onSaved(token.trim());
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Invalid token");
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-sm">
      <h1 className="text-base font-semibold">GitHub Token</h1>
      <p className="text-xs leading-relaxed text-neutral-500">
        Create a{" "}
        <span className="font-medium">Fine-grained personal access token</span>{" "}
        with <span className="font-mono">Projects: Read and write</span>{" "}
        permission, then paste it below.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="github_pat_..."
        className="rounded-md border border-black/10 bg-white/60 px-2 py-1.5 font-mono text-xs backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-white/10 dark:bg-white/10"
      />
      {message && (
        <p
          className={`text-xs ${
            status === "error" ? "text-red-500" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}

      <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <input
          type="checkbox"
          checked={autostart}
          onChange={(e) => toggleAutostart(e.target.checked)}
        />
        <span className="text-xs text-neutral-600 dark:text-neutral-300">
          ログイン時に自動起動する
        </span>
      </label>

      <div className="mt-auto flex gap-2">
        <button
          onClick={handleSave}
          disabled={!token.trim() || status === "checking"}
          className="flex-1 rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {status === "checking" ? "Verifying…" : "Save & Connect"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-md border border-black/15 px-3 text-xs dark:border-white/15"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
