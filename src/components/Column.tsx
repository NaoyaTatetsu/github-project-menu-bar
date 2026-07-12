import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardCard } from "../types";
import { Card } from "./Card";

interface Props {
  id: string; // status optionId, or "__none__" for cards without a status
  title: string;
  cards: BoardCard[];
  onAdd?: (title: string) => void;
}

export function Column({ id, title, cards, onAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (t && onAdd) onAdd(t);
    setText("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex w-44 shrink-0 flex-col rounded-xl bg-black/[0.03] p-2 transition dark:bg-white/[0.04] ${
        isOver ? "ring-2 ring-blue-500/60" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-black/[0.06] px-1.5 text-[10px] tabular-nums text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
            {cards.length}
          </span>
          {onAdd && (
            <button
              onClick={() => setAdding(true)}
              title="タスクを追加"
              className="flex h-4 w-4 items-center justify-center rounded text-sm leading-none text-neutral-400 transition hover:bg-black/10 hover:text-neutral-600 dark:hover:bg-white/15 dark:hover:text-neutral-200"
            >
              +
            </button>
          )}
        </div>
      </div>
      <SortableContext
        items={cards.map((c) => c.itemId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {cards.map((card) => (
            <Card key={card.itemId} card={card} />
          ))}

          {adding && (
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") {
                  setText("");
                  setAdding(false);
                }
              }}
              placeholder="タスク名を入力…"
              rows={2}
              className="resize-none rounded-lg border border-black/10 bg-white/80 p-2 text-xs shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-white/10 dark:bg-white/[0.12]"
            />
          )}
        </div>
      </SortableContext>
    </div>
  );
}
