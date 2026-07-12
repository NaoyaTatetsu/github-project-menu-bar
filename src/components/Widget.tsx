import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Board } from "./Board";
import { useAddTask, useBoard, useUpdateStatus } from "../hooks/useBoard";
import { getSelectedProjectId, getToken } from "../lib/store";

/**
 * Desktop widget: the same kanban board as the menu-bar panel, in a frameless
 * always-on-top window. Drag the header to move it, ✕ to hide (re-show from the
 * tray menu or the panel's 🪟 button).
 */
export default function Widget() {
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([getToken(), getSelectedProjectId()]);
      setToken(t);
      setProjectId(p);
      setReady(true);
    })();
  }, []);

  const board = useBoard(token, projectId);
  const updateStatus = useUpdateStatus(token, projectId);
  const addTask = useAddTask(token, projectId);

  return (
    <div className="flex h-screen flex-col text-neutral-800 dark:text-neutral-100">
      {/* header (draggable) */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-1.5 border-b border-black/5 px-2.5 py-1.5 dark:border-white/10"
      >
        <span
          data-tauri-drag-region
          className="flex-1 truncate text-xs font-semibold"
        >
          {board.data?.title ?? "GitHub Project"}
        </span>
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
          onClick={() => getCurrentWindow().hide()}
          title="Hide"
          className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-neutral-500 transition hover:bg-black/10 dark:text-neutral-300 dark:hover:bg-white/15"
        >
          ✕
        </button>
      </div>

      {/* body: identical kanban board */}
      <div className="flex-1 overflow-hidden">
        {(!ready || board.isLoading) && <Centered>読み込み中…</Centered>}
        {ready && !token && (
          <Centered>メニューバーの設定でトークンを登録してください</Centered>
        )}
        {board.isError && (
          <Centered>
            <span className="text-red-500">
              {(board.error as Error).message}
            </span>
          </Centered>
        )}
        {board.data && board.data.statusFieldId === null && (
          <Centered>このプロジェクトには "Status" フィールドがありません。</Centered>
        )}
        {board.data && board.data.statusFieldId !== null && (
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
      </div>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-4 text-center text-xs text-neutral-500">
      {children}
    </div>
  );
}
