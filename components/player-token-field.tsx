"use client";

import { useState } from "react";
import { ensurePlayerToken } from "@/lib/client/player-token";

export function PlayerTokenField() {
  const [playerToken] = useState(() =>
    typeof window !== "undefined" ? ensurePlayerToken() : "",
  );

  return (
    <input
      type="hidden"
      name="playerToken"
      value={playerToken}
      suppressHydrationWarning
    />
  );
}
