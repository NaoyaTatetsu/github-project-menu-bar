import { useState } from "react";
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
        className="rounded-md border border-black/15 bg-white px-2 py-1.5 font-mono text-xs dark:border-white/15 dark:bg-neutral-800"
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
