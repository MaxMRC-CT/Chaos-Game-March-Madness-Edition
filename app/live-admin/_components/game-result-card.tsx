"use client";

import { CheckCircle2, PencilLine } from "lucide-react";
import { LiveAdminGameCard } from "./types";

export function GameResultCard({
  game,
  isEditing,
  selectedWinnerId,
  isSaving,
  highlighted,
  registerRef,
  onChooseWinner,
  onStartEdit,
  onCancel,
  onSave,
}: {
  game: LiveAdminGameCard;
  isEditing: boolean;
  selectedWinnerId: string | null;
  isSaving: boolean;
  highlighted: boolean;
  registerRef: (element: HTMLDivElement | null) => void;
  onChooseWinner: (winnerTeamId: string) => void;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const winnerName =
    game.winnerTeamId === game.teamA.id
      ? game.teamA.shortName || game.teamA.name
      : game.teamB.shortName || game.teamB.name;

  return (
    <article
      ref={registerRef}
      className={`rounded-2xl border p-4 transition ${
        highlighted
          ? "border-[#4dd8ff]/40 bg-[#4dd8ff]/10 shadow-[0_0_0_1px_rgba(77,216,255,0.15)]"
          : game.status === "completed"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-white/10 bg-neutral-950/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {game.roundLabel} • Game {game.gameNo}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            <span>{game.bracketLabel}</span>
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-300">
              {game.region}
            </span>
            {game.isPlayInRelated ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-200">
                Play-In Slot
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          {game.status === "completed" && !isEditing ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
              <CheckCircle2 className="size-3.5" />
              Completed
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {[game.teamA, game.teamB].map((team) => {
          const isWinner = game.winnerTeamId === team.id;
          const isSelected = selectedWinnerId === team.id;
          const interactive = game.status !== "completed" || isEditing;

          return (
            <button
              key={team.id}
              type="button"
              disabled={!interactive || isSaving}
              onClick={() => onChooseWinner(team.id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                isWinner && !isEditing
                  ? "border-emerald-500/30 bg-emerald-500/10 text-white"
                  : isSelected
                    ? "border-[#4dd8ff]/40 bg-[#4dd8ff]/10 text-white"
                    : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700"
              } disabled:cursor-default disabled:opacity-100`}
            >
              <div>
                <p className="text-sm font-semibold">
                  [{team.seed}] {team.shortName || team.name}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{team.region}</p>
              </div>
              {isWinner && !isEditing ? (
                <span className="text-xs font-medium text-emerald-200">Winner</span>
              ) : isSelected ? (
                <span className="text-xs font-medium text-[#8ee8ff]">Selected</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-neutral-500">
          {game.status === "completed" && !isEditing ? (
            <>
              Winner: <span className="text-neutral-300">{winnerName}</span> • Updated{" "}
              <span className="text-neutral-300">{formatTimestamp(game.updatedAt)}</span>
            </>
          ) : selectedWinnerId ? (
            <>
              Selected winner:{" "}
              <span className="text-neutral-300">
                {selectedWinnerId === game.teamA.id
                  ? game.teamA.shortName || game.teamA.name
                  : game.teamB.shortName || game.teamB.name}
              </span>
              {game.status === "completed" ? " • overwrite pending" : null}
            </>
          ) : (
            "Choose the winning team, then confirm the save."
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {game.status === "completed" && !isEditing ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
            >
              <PencilLine className="size-4" />
              Edit Result
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!selectedWinnerId || isSaving}
                className="rounded-xl bg-[#fb6223] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#e35a20] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : game.status === "completed" ? "Confirm Overwrite" : "Confirm Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return "just now";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
