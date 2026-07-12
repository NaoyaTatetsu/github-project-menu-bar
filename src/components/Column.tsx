import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardCard } from "../types";
import { Card } from "./Card";

interface Props {
  id: string; // status optionId, or "__none__" for cards without a status
  title: string;
  cards: BoardCard[];
}

export function Column({ id, title, cards }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

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
        <span className="rounded-full bg-black/[0.06] px-1.5 text-[10px] tabular-nums text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
          {cards.length}
        </span>
      </div>
      <SortableContext
        items={cards.map((c) => c.itemId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {cards.map((card) => (
            <Card key={card.itemId} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
