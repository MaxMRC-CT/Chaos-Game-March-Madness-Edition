"use client";

type Member = {
  id: string;
  displayName: string;
  draftPosition: number | null;
  isAdmin: boolean;
};

type DraftOrderProps = {
  members: Member[];
  currentPick: number;
  pickedMemberIds: Set<string>;
};

export function DraftOrder({ members, currentPick, pickedMemberIds }: DraftOrderProps) {
  return (
    <ul className="space-y-2">
      {members.map((member) => {
        const isCurrent = member.draftPosition === currentPick;
        return (
          <li
            key={member.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              isCurrent ? "border-emerald-500 bg-emerald-50 shadow-sm" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-600">
                #{member.draftPosition}
              </span>
              <span className="text-sm font-medium">{member.displayName}</span>
            </div>
            <div className="flex items-center gap-2">
              {pickedMemberIds.has(member.id) ? (
                <span className="text-xs text-emerald-600" aria-label="Picked">
                  ✓
                </span>
              ) : null}
              {isCurrent ? (
                <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs text-white">
                  On the clock
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
