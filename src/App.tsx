import { useEffect, useState } from "react";
import { Board } from "./components/Board";
import { Settings } from "./components/Settings";
import { useBoard, useProjects, useUpdateStatus } from "./hooks/useBoard";
import {
  getSelectedProjectId,
  getToken,
  setSelectedProjectId,
  setToken as persistToken,
} from "./lib/store";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // load persisted state on mount
  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([getToken(), getSelectedProjectId()]);
      setToken(t);
      setProjectId(p);
      setReady(true);
    })();
  }, []);

  const projects = useProjects(token);
  const board = useBoard(token, projectId);
  const updateStatus = useUpdateStatus(token, projectId);

  // auto-select first project once loaded
  useEffect(() => {
    if (!projectId && projects.data && projects.data.length > 0) {
      const first = projects.data[0].id;
      setProjectId(first);
      void setSelectedProjectId(first);
    }
  }, [projects.data, projectId]);

  if (!ready) {
    return <Centered>Loading…</Centered>;
  }

  if (!token || showSettings) {
    return (
      <Settings
        initialToken={token ?? ""}
        onSaved={async (t) => {
          await persistToken(t);
          setToken(t);
          setShowSettings(false);
        }}
        onCancel={token ? () => setShowSettings(false) : undefined}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
        <select
          value={projectId ?? ""}
          onChange={(e) => {
            setProjectId(e.target.value);
            void setSelectedProjectId(e.target.value);
          }}
          className="flex-1 truncate rounded-md border border-black/15 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-neutral-800"
        >
          {projects.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button
          onClick={() => board.refetch()}
          title="Refresh"
          className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
        >
          ↻
        </button>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
        >
          ⚙
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-hidden">
        {projects.isError && (
          <Centered>
            <span className="text-red-500">
              {(projects.error as Error).message}
            </span>
          </Centered>
        )}
        {board.isError && (
          <Centered>
            <span className="text-red-500">
              {(board.error as Error).message}
            </span>
          </Centered>
        )}
        {board.isLoading && <Centered>Loading board…</Centered>}
        {board.data && (
          <Board
            board={board.data}
            onMove={(itemId, fieldId, optionId) =>
              updateStatus.mutate({ itemId, fieldId, optionId })
            }
          />
        )}
        {board.data && board.data.statusFieldId === null && (
          <Centered>
            <span className="text-xs text-neutral-500">
              This project has no "Status" field.
            </span>
          </Centered>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-4 text-sm text-neutral-500">
      {children}
    </div>
  );
}
