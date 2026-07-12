import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { open } from "@tauri-apps/plugin-shell";
import type { BoardCard } from "../types";

const kindColor: Record<BoardCard["kind"], string> = {
  Issue: "bg-green-500",
  PullRequest: "bg-purple-500",
  DraftIssue: "bg-gray-400",
  Unknown: "bg-gray-300",
};

export function Card({ card }: { card: BoardCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group cursor-grab rounded-lg border border-black/5 bg-white/70 p-2 text-xs shadow-sm backdrop-blur-sm transition hover:bg-white/90 hover:shadow active:cursor-grabbing dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
    >
      <div className="flex items-start gap-1.5">
        <span
          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${kindColor[card.kind]}`}
        />
        <span className="line-clamp-3 text-neutral-800 dark:text-neutral-100">
          {card.title}
        </span>
      </div>
      {card.number != null && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (card.url) void open(card.url);
          }}
          className="mt-1 text-[10px] text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:text-blue-500"
        >
          #{card.number}
        </button>
      )}
    </div>
  );
}
