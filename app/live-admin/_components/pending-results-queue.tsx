"use client";

import { LiveAdminConsoleData } from "./types";
import { GameResultCard } from "./game-result-card";

export function PendingResultsQueue({
  queue,
  showCompleted,
  onToggleCompleted,
  editingSlotId,
  selectedWinnerBySlot,
  savingSlotId,
  highlightedSlotId,
  registerCardRef,
  onChooseWinner,
  onStartEdit,
  onCancel,
  onSave,
}: {
  queue: LiveAdminConsoleData["queue"];
  showCompleted: boolean;
  onToggleCompleted: () => void;
  editingSlotId: string | null;
  selectedWinnerBySlot: Record<string, string>;
  savingSlotId: string | null;
  highlightedSlotId: string | null;
  registerCardRef: (slotId: string, element: HTMLDivElement | null) => void;
  onChooseWinner: (slotId: string, winnerTeamId: string) => void;
  onStartEdit: (slotId: string) => void;
  onCancel: (slotId: string) => void;
  onSave: (slotId: string) => void;
}) {
  const filteredQueue = queue
    .map((group) => ({
      ...group,
      games: group.games.filter((game) => showCompleted || game.status === "pending"),
    }))
    .filter((group) => group.games.length > 0);

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Pending Results Queue
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Enter live results</h2>
        </div>
        <button
          type="button"
          onClick={onToggleCompleted}
          className={`rounded-xl border px-3 py-2 text-sm transition ${
            showCompleted
              ? "border-[#4dd8ff]/30 bg-[#4dd8ff]/10 text-[#8ee8ff]"
              : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          {showCompleted ? "Hide Completed" : "Show Completed"}
        </button>
      </div>

      <div className="mt-5 space-y-6">
        {filteredQueue.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-8 text-center text-sm text-neutral-400">
            No pending games right now.
          </div>
        ) : (
          filteredQueue.map((group) => (
            <div key={group.round} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {group.roundLabel}
                </h3>
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-0.5 text-[11px] text-neutral-400">
                  {group.games.length} games
                </span>
              </div>
              <div className="space-y-3">
                {group.games.map((game) => (
                  <GameResultCard
                    key={game.slotId}
                    game={game}
                    isEditing={editingSlotId === game.slotId}
                    selectedWinnerId={selectedWinnerBySlot[game.slotId] ?? null}
                    isSaving={savingSlotId === game.slotId}
                    highlighted={highlightedSlotId === game.slotId}
                    registerRef={(element) => registerCardRef(game.slotId, element)}
                    onChooseWinner={(winnerTeamId) => onChooseWinner(game.slotId, winnerTeamId)}
                    onStartEdit={() => onStartEdit(game.slotId)}
                    onCancel={() => onCancel(game.slotId)}
                    onSave={() => onSave(game.slotId)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
