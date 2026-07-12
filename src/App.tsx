import { useEffect, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Board } from "./components/Board";
import { Settings } from "./components/Settings";
import {
  useAddTask,
  useBoard,
  useProjects,
  useUpdateStatus,
} from "./hooks/useBoard";
import {
  getSelectedProjectId,
  getToken,
  setSelectedProjectId,
  setToken as persistToken,
} from "./lib/store";

async function toggleWidget() {
  const w = await WebviewWindow.getByLabel("widget");
  if (!w) return;
  if (await w.isVisible()) {
    await w.hide();
  } else {
    await w.show();
    await w.setFocus();
  }
}

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
  const addTask = useAddTask(token, projectId);

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
    <div className="flex h-full flex-col text-neutral-800 dark:text-neutral-100">
      {/* header */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-1.5 border-b border-black/5 px-2.5 py-1.5 dark:border-white/10"
      >
        <select
          value={projectId ?? ""}
          onChange={(e) => {
            setProjectId(e.target.value);
            void setSelectedProjectId(e.target.value);
          }}
          className="flex-1 truncate rounded-md border border-black/10 bg-white/60 px-2 py-1 text-xs font-medium backdrop-blur transition hover:bg-white/80 focus:outline-none dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/[0.15]"
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
          disabled={board.isFetching}
          className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-neutral-500 transition hover:bg-black/10 disabled:hover:bg-transparent dark:text-neutral-300 dark:hover:bg-white/15"
        >
          <span className={board.isFetching ? "inline-block animate-spin" : "inline-block"}>
            ↻
          </span>
        </button>
        <button
          onClick={toggleWidget}
          title="Toggle desktop widget"
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-black/10 dark:text-neutral-300 dark:hover:bg-white/15"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18" />
          </svg>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-black/10 dark:text-neutral-300 dark:hover:bg-white/15"
        >
          <span className="text-lg leading-none">⚙</span>
        </button>
      </div>

      {(addTask.error || updateStatus.error) && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] text-red-600 dark:text-red-400">
          {((addTask.error || updateStatus.error) as Error).message}
        </div>
      )}

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
            onAddTask={(title, optionId) =>
              addTask.mutate({
                title,
                fieldId: board.data!.statusFieldId,
                optionId,
              })
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
