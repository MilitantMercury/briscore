import type { Hand, Session } from "./game";
export type Proposal = {
  id: string;
  author: string;
  authorId: string;
  kind: "add" | "edit" | "delete";
  hand: Hand;
  createdAt: string;
};
export type Room = {
  id: string;
  hostId: string;
  revision: number;
  session: Session;
  updatedAt: string;
  inviteToken?: string;
  members: { userId: string; playerId: string | null; avatar?: string; avatarImage?: string; globalRank?: number }[];
  proposals: Proposal[];
  status: "active" | "completed";
  currentRound: number;
  roundCompleted: boolean;
  endedAt?: string;
  finalStandings?: { playerId: string; name: string; score: number }[];
};
export type RoomInvite = {
  id: string;
  players: { id: string; name: string; occupied: boolean }[];
};
