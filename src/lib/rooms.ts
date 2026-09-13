import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import {
  calculateHandScore,
  parseSession,
  type Hand,
  type Session,
} from "./game";

export type Proposal = {
  id: string;
  author: string;
  kind: "add" | "edit" | "delete";
  hand: Hand;
  baseHand?: Hand;
  createdAt: string;
};
export type Room = {
  id: string;
  revision: number;
  session: Session;
  updatedAt: string;
  proposals: Proposal[];
};
type StoredRoom = Room & { editorHash: string };
const directory =
  process.env.BRISCORE_DATA_DIR || path.join(process.cwd(), ".briscore-data");
// Route bundles share this lock registry within a single Node process.
const processState = globalThis as typeof globalThis & {
  briscoreLocks?: Map<string, Promise<unknown>>;
};
const locks = (processState.briscoreLocks ??= new Map<
  string,
  Promise<unknown>
>());
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
function filename(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("NOT_FOUND");
  return path.join(directory, `${id}.json`);
}
async function read(id: string): Promise<StoredRoom> {
  try {
    return JSON.parse(await readFile(filename(id), "utf8"));
  } catch {
    throw new Error("NOT_FOUND");
  }
}
function publicRoom({
  id,
  revision,
  session,
  updatedAt,
  proposals,
}: StoredRoom): Room {
  return { id, revision, session, updatedAt, proposals };
}
async function save(room: StoredRoom) {
  await mkdir(directory, { recursive: true });
  const target = filename(room.id);
  const temporary = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(room), { mode: 0o600 });
  await rename(temporary, target);
}
export async function createRoom(session: Session) {
  const token = randomBytes(32).toString("hex");
  const room: StoredRoom = {
    id: randomBytes(12).toString("hex"),
    revision: 0,
    session: parseSession(JSON.stringify(session)),
    updatedAt: new Date().toISOString(),
    proposals: [],
    editorHash: hash(token),
  };
  await save(room);
  return { room: publicRoom(room), token };
}
export async function propose(
  id: string,
  input: Omit<Proposal, "id" | "createdAt">,
) {
  return mutate(id, async (room) => {
    if (!room.session.players.some((p) => p.name === input.author))
      throw new Error("Giocatore non valido.");
    if (
      !["add", "edit", "delete"].includes(input.kind) ||
      room.proposals.length >= 30
    )
      throw new Error("Richiesta non valida o troppe richieste in attesa.");
    const hand = {
      ...input.hand,
      results: calculateHandScore(room.session.players, input.hand),
    };
    parseSession(JSON.stringify({ ...room.session, hands: [hand] }));
    const existing = room.session.hands.find((h) => h.id === hand.id);
    if (
      (input.kind === "add" && existing) ||
      (input.kind !== "add" && !existing)
    )
      throw new Error("Mano non disponibile.");
    room.proposals.push({
      id: randomBytes(12).toString("hex"),
      author: input.author,
      kind: input.kind,
      hand,
      baseHand: existing,
      createdAt: new Date().toISOString(),
    });
  });
}
async function mutate(id: string, action: (room: StoredRoom) => Promise<void>) {
  const previous = locks.get(id) || Promise.resolve();
  const operation = previous
    .catch(() => {})
    .then(async () => {
      const room = await read(id);
      await action(room);
      room.revision++;
      room.updatedAt = new Date().toISOString();
      await save(room);
      return publicRoom(room);
    });
  locks.set(id, operation);
  try {
    return await operation;
  } finally {
    if (locks.get(id) === operation) locks.delete(id);
  }
}
export async function resolveProposal(
  id: string,
  token: string,
  proposalId: string,
  approve: boolean,
) {
  return mutate(id, async (room) => {
    if (
      !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(room.editorHash))
    )
      throw new Error("FORBIDDEN");
    const proposal = room.proposals.find((p) => p.id === proposalId);
    if (!proposal) throw new Error("Richiesta già gestita.");
    if (approve) {
      const current = room.session.hands.find((h) => h.id === proposal.hand.id);
      if (
        proposal.kind !== "add" &&
        JSON.stringify(current) !== JSON.stringify(proposal.baseHand)
      )
        throw new Error(
          "La mano è cambiata: rifiuta questa richiesta e chiedi una nuova proposta.",
        );
      if (proposal.kind === "add") room.session.hands.push(proposal.hand);
      else if (proposal.kind === "edit")
        room.session.hands = room.session.hands.map((h) =>
          h.id === proposal.hand.id ? proposal.hand : h,
        );
      else
        room.session.hands = room.session.hands.filter(
          (h) => h.id !== proposal.hand.id,
        );
      room.session = parseSession(JSON.stringify(room.session));
    }
    room.proposals = room.proposals.filter((p) => p.id !== proposalId);
  });
}
export async function getRoom(id: string) {
  return publicRoom(await read(id));
}
export async function updateRoom(
  id: string,
  token: string,
  revision: number,
  session: Session,
) {
  const previous = locks.get(id) || Promise.resolve();
  const operation = previous
    .catch(() => {})
    .then(async () => {
      const room = await read(id);
      if (
        !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(room.editorHash))
      )
        throw new Error("FORBIDDEN");
      if (revision !== room.revision) throw new Error("CONFLICT");
      const validated = parseSession(JSON.stringify(session));
      if (
        JSON.stringify(validated.players) !==
          JSON.stringify(room.session.players) ||
        validated.createdAt !== room.session.createdAt
      )
        throw new Error("Giocatori della stanza non modificabili.");
      const updated = {
        ...room,
        session: validated,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      };
      await save(updated);
      return publicRoom(updated);
    });
  locks.set(id, operation);
  try {
    return await operation;
  } finally {
    if (locks.get(id) === operation) locks.delete(id);
  }
}
