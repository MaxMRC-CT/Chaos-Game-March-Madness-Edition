"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EspnLayoutData,
  MatchupNode,
  BracketTeam,
  Connector,
} from "@/lib/bracket/espnLayout";
import { REGIONS } from "@/lib/bracket/espnLayout";

const CARD_WIDTH = 160;
const CARD_ROW_HEIGHT = 28;
const CARD_GAP = 8;
const ROUND_GAP = 24;

const ROUND_LABELS: Record<string, string> = {
  R64: "R64",
  R32: "R32",
  S16: "S16",
  E8: "Elite 8",
  F4: "Final Four",
  FINAL: "Championship",
};

type Props = {
  data: EspnLayoutData;
};

export function EspnStyleBracket({ data }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<(typeof REGIONS)[number] | "all">("all");
  const [zoom, setZoom] = useState(0.85);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setZoom(mq.matches ? 0.7 : 0.85);
  }, []);

  return (
    <div className="space-y-3">
      {/* Legend + zoom + region selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-500/50" />
          <span>Winner</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[#1f2937] bg-[#0f1623] p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              disabled={zoom <= 0.5}
              className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-[#1f2937] hover:text-neutral-200 disabled:opacity-40"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center text-xs text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.2, z + 0.1))}
              disabled={zoom >= 1.2}
              className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-[#1f2937] hover:text-neutral-200 disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          {/* Mobile region selector */}
          <div className="flex gap-1 rounded-lg border border-[#1f2937] bg-[#0f1623] p-1 md:hidden">
            <button
              type="button"
              onClick={() => setSelectedRegion("all")}
              className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
                selectedRegion === "all"
                  ? "bg-[#1f2937] text-white"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All
            </button>
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRegion(r)}
                className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  selectedRegion === r
                    ? "bg-[#1f2937] text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll container */}
      <div
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl border border-[#1f2937] bg-[#111827]"
        style={{ maxHeight: "min(75vh, 800px)" }}
      >
        <div
          className="inline-flex origin-top-left p-4"
          style={{ transform: `scale(${zoom})`, minWidth: "fit-content" }}
        >
          <div className="flex gap-4">
            {/* Left 2 regions: East, West */}
            <div className="flex gap-4">
              {data.regions
                .filter((r) => r.region === "East" || r.region === "West")
                .filter((r) => selectedRegion === "all" || selectedRegion === r.region)
                .map((rb) => (
                  <RegionBracket key={rb.region} bracket={rb} />
                ))}
            </div>

            {/* Final Four center */}
            {(selectedRegion === "all" || REGIONS.includes(selectedRegion)) && (
              <FinalFourBracket bracket={data.finalFour} />
            )}

            {/* Right 2 regions: South, Midwest */}
            <div className="flex gap-4">
              {data.regions
                .filter((r) => r.region === "South" || r.region === "Midwest")
                .filter((r) => selectedRegion === "all" || selectedRegion === r.region)
                .map((rb) => (
                  <RegionBracket key={rb.region} bracket={rb} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARD_H = CARD_ROW_HEIGHT * 2 + 4;

function computeRegionNodePositions(
  bracket: EspnLayoutData["regions"][0]
): Map<string, { x: number; y: number; w: number; h: number }> {
  const map = new Map<string, { x: number; y: number; w: number; h: number }>();
  const cols = [
    bracket.nodes.filter((n) => n.round === "R64" && n.side === "left"),
    bracket.nodes.filter((n) => n.round === "R32" && n.side === "left"),
    bracket.nodes.filter((n) => n.round === "S16" && n.side === "left"),
    bracket.nodes.filter((n) => n.round === "E8"),
    bracket.nodes.filter((n) => n.round === "S16" && n.side === "right"),
    bracket.nodes.filter((n) => n.round === "R32" && n.side === "right"),
    bracket.nodes.filter((n) => n.round === "R64" && n.side === "right"),
  ];
  const colX = [0, CARD_WIDTH + ROUND_GAP, (CARD_WIDTH + ROUND_GAP) * 2, (CARD_WIDTH + ROUND_GAP) * 3, (CARD_WIDTH + ROUND_GAP) * 4, (CARD_WIDTH + ROUND_GAP) * 5, (CARD_WIDTH + ROUND_GAP) * 6];
  for (let c = 0; c < cols.length; c++) {
    const nodes = cols[c];
    const totalH = nodes.length * CARD_H + Math.max(0, nodes.length - 1) * CARD_GAP;
    let y = 0;
    for (const n of nodes) {
      map.set(n.id, { x: colX[c], y, w: CARD_WIDTH, h: CARD_H });
      y += CARD_H + CARD_GAP;
    }
  }
  return map;
}

function RegionConnectors({
  connectors,
  nodePositions,
}: {
  connectors: Connector[];
  nodePositions: Map<string, { x: number; y: number; w: number; h: number }>;
}) {
  const paths: string[] = [];
  for (const { fromId, toId } of connectors) {
    const from = nodePositions.get(fromId);
    const to = nodePositions.get(toId);
    if (!from || !to) continue;
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;
    const midX = (x1 + x2) / 2;
    paths.push(`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
  }
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0"
      width={(CARD_WIDTH + ROUND_GAP) * 7}
      height={500}
      style={{ overflow: "visible" }}
    >
      <g stroke="rgba(55,65,81,0.35)" strokeWidth={1} fill="none">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

function RegionBracket({ bracket }: { bracket: EspnLayoutData["regions"][0] }) {
  const { region, nodes, connectors } = bracket;

  const leftR64 = nodes.filter((n) => n.round === "R64" && n.side === "left");
  const leftR32 = nodes.filter((n) => n.round === "R32" && n.side === "left");
  const leftS16 = nodes.filter((n) => n.round === "S16" && n.side === "left");
  const centerE8 = nodes.filter((n) => n.round === "E8");
  const rightS16 = nodes.filter((n) => n.round === "S16" && n.side === "right");
  const rightR32 = nodes.filter((n) => n.round === "R32" && n.side === "right");
  const rightR64 = nodes.filter((n) => n.round === "R64" && n.side === "right");

  const nodePositions = useMemo(
    () => computeRegionNodePositions(bracket),
    [bracket]
  );

  return (
    <div className="relative flex shrink-0" style={{ minHeight: 480 }}>
      <div className="relative z-10 flex items-stretch">
        {/* Left half: R64 -> R32 -> S16 */}
        <div className="flex items-center gap-2">
          <RoundColumn
            label={ROUND_LABELS.R64}
            nodes={leftR64}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
          />
          <RoundColumn
            label={ROUND_LABELS.R32}
            nodes={leftR32}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
          />
          <RoundColumn
            label={ROUND_LABELS.S16}
            nodes={leftS16}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
          />
        </div>

        {/* Center: E8 (regional champion) */}
        <div className="flex items-center">
          <RoundColumn
            label={ROUND_LABELS.E8}
            nodes={centerE8}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
            regionLabel={region}
          />
        </div>

        {/* Right half: S16 -> R32 -> R64 */}
        <div className="flex items-center gap-2">
          <RoundColumn
            label={ROUND_LABELS.S16}
            nodes={rightS16}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
          />
          <RoundColumn
            label={ROUND_LABELS.R32}
            nodes={rightR32}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
          />
          <RoundColumn
            label={ROUND_LABELS.R64}
            nodes={rightR64}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_ROW_HEIGHT}
            gap={CARD_GAP}
          />
        </div>
      </div>
      <RegionConnectors connectors={connectors} nodePositions={nodePositions} />
    </div>
  );
}

function FinalFourBracket({ bracket }: { bracket: EspnLayoutData["finalFour"] }) {
  const { nodes } = bracket;
  const f4Left = nodes.filter((n) => n.round === "F4" && n.side === "left");
  const f4Right = nodes.filter((n) => n.round === "F4" && n.side === "right");
  const finalNode = nodes.filter((n) => n.round === "FINAL");

  return (
    <div className="relative flex shrink-0 flex-col items-center justify-center gap-4 self-stretch py-4">
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Final Four
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-6">
          {f4Left.map((n) => (
            <MatchupCard key={n.id} node={n} width={CARD_WIDTH} rowHeight={CARD_ROW_HEIGHT} />
          ))}
        </div>
        <div className="flex flex-col">
          {finalNode.map((n) => (
            <MatchupCard
              key={n.id}
              node={n}
              width={CARD_WIDTH}
              rowHeight={CARD_ROW_HEIGHT}
              highlight
            />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {f4Right.map((n) => (
            <MatchupCard key={n.id} node={n} width={CARD_WIDTH} rowHeight={CARD_ROW_HEIGHT} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoundColumn({
  label,
  nodes,
  cardWidth,
  cardHeight,
  gap,
  regionLabel,
}: {
  label: string;
  nodes: MatchupNode[];
  cardWidth: number;
  cardHeight: number;
  gap: number;
  regionLabel?: string;
}) {
  if (nodes.length === 0) return null;

  const cardH = cardHeight * 2 + gap;
  const totalH = nodes.length * cardH + (nodes.length - 1) * gap;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 flex flex-col items-center gap-0.5">
        {regionLabel ? (
          <span className="text-xs font-semibold text-neutral-300">{regionLabel}</span>
        ) : null}
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </span>
      </div>
      <div
        className="flex flex-col justify-between"
        style={{ minHeight: totalH, gap }}
      >
        {nodes.map((node) => (
          <MatchupCard
            key={node.id}
            node={node}
            width={cardWidth}
            rowHeight={cardHeight}
          />
        ))}
      </div>
    </div>
  );
}

function MatchupCard({
  node,
  width,
  rowHeight,
  highlight = false,
}: {
  node: MatchupNode;
  width: number;
  rowHeight: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-lg border bg-[#0d1118] transition-colors hover:border-[#374151] ${
        highlight ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-[#1f2937]"
      }`}
      style={{ width, minHeight: rowHeight * 2 + 4 }}
      data-node-id={node.id}
    >
      <TeamRow team={node.teamA} isWinner={node.winnerTeamId === node.teamA.id} rowHeight={rowHeight} />
      <div className="h-px bg-[#1f2937]" />
      <TeamRow team={node.teamB} isWinner={node.winnerTeamId === node.teamB.id} rowHeight={rowHeight} />
    </div>
  );
}

function TeamRow({
  team,
  isWinner,
  rowHeight,
}: {
  team: BracketTeam;
  isWinner: boolean;
  rowHeight: number;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 text-sm ${
        isWinner
          ? "bg-emerald-500/10 font-semibold text-emerald-100"
          : "bg-transparent text-neutral-300"
      }`}
      style={{ minHeight: rowHeight }}
    >
      <span
        className={`flex h-5 w-6 shrink-0 items-center justify-center rounded text-xs ${
          isWinner ? "bg-emerald-500/30 text-emerald-200" : "bg-[#1f2937] text-neutral-400"
        }`}
      >
        {team.seed || "–"}
      </span>
      <span className="truncate">{team.name || "TBD"}</span>
    </div>
  );
}
