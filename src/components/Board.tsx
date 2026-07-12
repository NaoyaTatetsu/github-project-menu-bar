import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useMemo } from "react";
import type { BoardData } from "../types";
import { Column } from "./Column";

const NO_STATUS = "__none__";

interface Props {
  board: BoardData;
  onMove: (itemId: string, fieldId: string, optionId: string) => void;
  /** optionId is null when adding to the "No Status" column */
  onAddTask?: (title: string, optionId: string | null) => void;
}

export function Board({ board, onMove, onAddTask }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // group cards by status optionId
  const columns = useMemo(() => {
    const map = new Map<string, BoardData["cards"]>();
    map.set(NO_STATUS, []);
    for (const opt of board.statusOptions) map.set(opt.id, []);
    for (const card of board.cards) {
      const key = card.statusOptionId ?? NO_STATUS;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  }, [board]);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || !board.statusFieldId) return;

    const itemId = active.id as string;
    // `over` is either a column id or another card id — resolve to a column.
    let targetOption = over.id as string;
    if (!board.statusOptions.some((o) => o.id === targetOption) && targetOption !== NO_STATUS) {
      const overCard = board.cards.find((c) => c.itemId === over.id);
      targetOption = overCard?.statusOptionId ?? NO_STATUS;
    }
    if (targetOption === NO_STATUS) return; // GitHub has no "clear status" via option id

    const card = board.cards.find((c) => c.itemId === itemId);
    if (!card || card.statusOptionId === targetOption) return;

    onMove(itemId, board.statusFieldId, targetOption);
  }

  const noStatusCards = columns.get(NO_STATUS) ?? [];

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-2 overflow-x-auto p-2">
        {board.statusOptions.map((opt) => (
          <Column
            key={opt.id}
            id={opt.id}
            title={opt.name}
            cards={columns.get(opt.id) ?? []}
            onAdd={onAddTask ? (title) => onAddTask(title, opt.id) : undefined}
          />
        ))}
        {noStatusCards.length > 0 && (
          <Column
            id={NO_STATUS}
            title="No Status"
            cards={noStatusCards}
            onAdd={onAddTask ? (title) => onAddTask(title, null) : undefined}
          />
        )}
      </div>
    </DndContext>
  );
}
