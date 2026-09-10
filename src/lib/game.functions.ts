import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GameStatus =
  | "LOBBY"
  | "BRIEFING"
  | "EVIDENCE"
  | "DELIBERATION"
  | "VOTING"
  | "REVEAL"
  | "RESULTS"
  | "ENDED";

const ORDER: GameStatus[] = [
  "LOBBY",
  "BRIEFING",
  "EVIDENCE",
  "DELIBERATION",
  "VOTING",
  "REVEAL",
  "RESULTS",
  "ENDED",
];

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Assessment = "GUILTY" | "NOT_GUILTY" | "NEUTRAL";

export type EvidenceItem = {
  id: string;
  sort_order: number;
  locked: boolean;
  adminOnlyLocked?: boolean;
  title?: string;
  type?: string;
  description?: string;
  content?: Json;
  myAssessment?: Assessment | null;
};

// No O/0, I/1, S/5 — these are easily confused when read aloud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ234679";

function makeCode() {
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listCases = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db
    .from("cases")
    .select("id, title, difficulty, summary, case_number")
    .order("case_number");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string; maxPlayers?: number }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await db
        .from("games")
        .select("id")
        .eq("room_code", code)
        .maybeSingle();
      if (!existing) break;
      code = makeCode();
    }
    const { data: game, error } = await db
      .from("games")
      .insert({
        room_code: code,
        case_id: data.caseId,
        admin_id: context.userId,
        status: "LOBBY",
        max_players: Math.min(Math.max(data.maxPlayers ?? 12, 2), 12),
      })
      .select("id, room_code")
      .single();
    if (error) throw new Error(error.message);

    const { data: ev } = await db
      .from("evidence")
      .select("id, default_locked")
      .eq("case_id", data.caseId);
    if (ev?.length) {
      await db.from("game_evidence").insert(
        ev.map((e) => ({
          game_id: game.id,
          evidence_id: e.id,
          released: !e.default_locked,
          released_at: e.default_locked ? null : new Date().toISOString(),
        })),
      );
    }
    return game;
  });

export const joinGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; displayName: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const code = data.code.trim().toUpperCase();
    const name = data.displayName.trim().slice(0, 24);
    if (name.length < 2) throw new Error("Please choose a name with at least 2 characters.");

    const { data: game } = await db
      .from("games")
      .select("id, status, max_players, admin_id")
      .eq("room_code", code)
      .maybeSingle();
    if (!game) throw new Error("No courtroom found with that code.");
    if (game.status === "ENDED") throw new Error("This case has already been closed.");

    const { data: mine } = await db
      .from("players")
      .select("id")
      .eq("game_id", game.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mine) {
      await db.from("players").update({ connected: true, removed: false }).eq("id", mine.id);
      return { gameId: game.id };
    }

    if (game.status !== "LOBBY") throw new Error("This trial has already started.");

    const { data: roster } = await db
      .from("players")
      .select("display_name, juror_number, removed")
      .eq("game_id", game.id);
    const active = (roster ?? []).filter((p) => !p.removed);
    if (active.length >= game.max_players) throw new Error("The jury box is full.");
    if (active.some((p) => p.display_name.toLowerCase() === name.toLowerCase()))
      throw new Error("Another juror is already using that name.");

    const used = new Set((roster ?? []).map((p) => p.juror_number));
    let num = 1;
    while (used.has(num)) num++;

    const { error } = await db
      .from("players")
      .insert({ game_id: game.id, user_id: context.userId, display_name: name, juror_number: num });
    if (error) throw new Error("Could not seat you on the jury. Try a different name.");
    return { gameId: game.id };
  });

export const getGameView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: game } = await db
      .from("games")
      .select("*")
      .eq("id", data.gameId)
      .maybeSingle();
    if (!game) throw new Error("Courtroom not found.");

    const isAdmin = game.admin_id === context.userId;
    const { data: players } = await db
      .from("players")
      .select("id, display_name, juror_number, connected, ready, vote_submitted, removed")
      .eq("game_id", game.id)
      .eq("removed", false)
      .order("juror_number");
    const { data: mePlayer } = await db
      .from("players")
      .select("id, display_name, juror_number, ready, vote_submitted")
      .eq("game_id", game.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!isAdmin && (!mePlayer || !players?.some((p) => p.id === mePlayer.id)))
      throw new Error("You are not seated in this courtroom.");

    const status = game.status as GameStatus;
    const phaseIndex = ORDER.indexOf(status);

    const { data: kase } = await db
      .from("cases")
      .select("*")
      .eq("id", game.case_id)
      .single();

    const brief =
      phaseIndex >= ORDER.indexOf("BRIEFING") || isAdmin
        ? {
            id: kase!.id,
            title: kase!.title,
            difficulty: kase!.difficulty,
            summary: kase!.summary,
            case_number: kase!.case_number,
            case_date: kase!.case_date,
            case_time: kase!.case_time,
            location: kase!.location,
            victim: kase!.victim,
            defendant: kase!.defendant,
            charges: kase!.charges,
            case_story: kase!.case_story,
          }
        : {
            id: kase!.id,
            title: kase!.title,
            difficulty: kase!.difficulty,
            summary: kase!.summary,
            case_number: kase!.case_number,
          };

    const { data: ge } = await db
      .from("game_evidence")
      .select("evidence_id, released")
      .eq("game_id", game.id);
    const releasedIds = new Set((ge ?? []).filter((g) => g.released).map((g) => g.evidence_id));

    const { data: allEv } = await db
      .from("evidence")
      .select("id, title, type, description, content, sort_order")
      .eq("case_id", game.case_id)
      .order("sort_order");

    const showEvidence = phaseIndex >= ORDER.indexOf("EVIDENCE");

    // Only the requesting juror's own assessments are ever loaded.
    const myAssessments = new Map<string, Assessment>();
    if (mePlayer) {
      const { data: mine } = await db
        .from("evidence_assessments")
        .select("evidence_id, assessment")
        .eq("game_id", game.id)
        .eq("player_id", mePlayer.id);
      for (const a of mine ?? []) myAssessments.set(a.evidence_id, a.assessment as Assessment);
    }

    const evidence: EvidenceItem[] = (allEv ?? []).map((e) => {
      const open = (releasedIds.has(e.id) && showEvidence) || isAdmin;
      return open
        ? {
            id: e.id,
            sort_order: e.sort_order,
            locked: false,
            adminOnlyLocked: isAdmin && !releasedIds.has(e.id),
            title: e.title,
            type: e.type,
            description: e.description,
            content: e.content as Json,
            myAssessment: myAssessments.get(e.id) ?? null,
          }
        : { id: e.id, sort_order: e.sort_order, locked: true };
    });

    let witnesses: {
      id: string;
      name: string;
      role: string;
      statement: string;
      credibility_notes: string | null;
    }[] = [];
    let timeline: {
      id: string;
      ts_label: string;
      description: string;
      evidence_id: string | null;
    }[] = [];
    if (showEvidence || isAdmin) {
      const { data: w } = await db
        .from("witnesses")
        .select("id, name, role, statement, credibility_notes")
        .eq("case_id", game.case_id)
        .order("sort_order");
      witnesses = w ?? [];
      const { data: t } = await db
        .from("timeline_events")
        .select("id, ts_label, description, evidence_id")
        .eq("case_id", game.case_id)
        .order("sort_order");
      timeline = (t ?? []).filter(
        (e) => isAdmin || !e.evidence_id || releasedIds.has(e.evidence_id),
      );
    }

    const revealed = phaseIndex >= ORDER.indexOf("REVEAL");

    // Split totals from the mere count: nobody, not even the Game Master,
    // sees guilty/not-guilty numbers before the reveal.
    const { data: votes } = await db.from("votes").select("vote").eq("game_id", game.id);
    const tally = revealed
      ? {
          guilty: (votes ?? []).filter((v) => v.vote === "GUILTY").length,
          notGuilty: (votes ?? []).filter((v) => v.vote === "NOT_GUILTY").length,
          submitted: (votes ?? []).length,
        }
      : null;
    const votesSubmitted = (votes ?? []).length;
    const secrets =
      isAdmin || revealed
        ? {
            hidden_truth: kase!.hidden_truth,
            official_verdict: kase!.official_verdict,
            explanation: kase!.explanation,
          }
        : null;

    let results = null;
    if (revealed && tally) {
      const juryVerdict =
        tally.guilty === tally.notGuilty
          ? "HUNG"
          : tally.guilty > tally.notGuilty
            ? "GUILTY"
            : "NOT_GUILTY";
      const official = kase!.official_verdict === "GUILTY" ? "GUILTY" : "NOT_GUILTY";
      const correct = official === "GUILTY" ? tally.guilty : tally.notGuilty;
      results = {
        juryVerdict,
        official,
        correct,
        total: tally.submitted,
        percent: tally.submitted ? Math.round((correct / tally.submitted) * 100) : 0,
        breakdown: { guilty: tally.guilty, notGuilty: tally.notGuilty },
      };
    }

    return {
      game: {
        id: game.id,
        room_code: game.room_code,
        status,
        paused: game.paused,
        max_players: game.max_players,
      },
      isAdmin,
      me: mePlayer ?? null,
      brief,
      evidence,
      witnesses,
      timeline,
      lockedCount: evidence.filter((e) => e.locked).length,
      players: players ?? [],
      counts: {
        jurors: (players ?? []).length,
        ready: (players ?? []).filter((p) => p.ready).length,
        votesSubmitted,
        evidenceTotal: (allEv ?? []).length,
        evidenceReleased: releasedIds.size,
      },
      difficulty: kase!.difficulty as string,
      tally,
      secrets,
      results,
    };
  });

export const setReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { gameId: string; ready: boolean }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db
      .from("players")
      .update({ ready: data.ready })
      .eq("game_id", data.gameId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const submitVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { gameId: string; vote: "GUILTY" | "NOT_GUILTY" }) => d)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: game } = await db
      .from("games")
      .select("status")
      .eq("id", data.gameId)
      .maybeSingle();
    if (!game || game.status !== "VOTING") throw new Error("Voting is not open.");
    const { data: player } = await db
      .from("players")
      .select("id, vote_submitted")
      .eq("game_id", data.gameId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!player) throw new Error("You are not on this jury.");
    if (player.vote_submitted) throw new Error("Your vote is already sealed.");
    const { error } = await db
      .from("votes")
      .insert({ game_id: data.gameId, player_id: player.id, vote: data.vote });
    if (error) throw new Error("Your vote is already sealed.");
    await db.from("players").update({ vote_submitted: true }).eq("id", player.id);
    return { ok: true };
  });

type AdminAction =
  | "START_CASE"
  | "TO_EVIDENCE"
  | "BEGIN_DELIBERATION"
  | "OPEN_VOTING"
  | "REVEAL"
  | "TO_RESULTS"
  | "END_GAME"
  | "PAUSE"
  | "RESUME"
  | "RELEASE_EVIDENCE"
  | "RELEASE_ALL"
  | "REMOVE_PLAYER"
  | "DELETE_MESSAGE";

const TRANSITIONS: Record<string, { from: GameStatus; to: GameStatus }> = {
  START_CASE: { from: "LOBBY", to: "BRIEFING" },
  TO_EVIDENCE: { from: "BRIEFING", to: "EVIDENCE" },
  BEGIN_DELIBERATION: { from: "EVIDENCE", to: "DELIBERATION" },
  OPEN_VOTING: { from: "DELIBERATION", to: "VOTING" },
  REVEAL: { from: "VOTING", to: "REVEAL" },
  TO_RESULTS: { from: "REVEAL", to: "RESULTS" },
};

export const adminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { gameId: string; action: AdminAction; evidenceId?: string; playerId?: string; messageId?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: game } = await db
      .from("games")
      .select("id, status, admin_id")
      .eq("id", data.gameId)
      .maybeSingle();
    if (!game || game.admin_id !== context.userId) throw new Error("Only the Game Master can do that.");
    const status = game.status as GameStatus;

    if (data.action === "PAUSE" || data.action === "RESUME") {
      await db.from("games").update({ paused: data.action === "PAUSE" }).eq("id", game.id);
      return { ok: true };
    }
    if (data.action === "END_GAME") {
      await db
        .from("games")
        .update({ status: "ENDED", ended_at: new Date().toISOString() })
        .eq("id", game.id);
      return { ok: true };
    }
    if (data.action === "RELEASE_EVIDENCE" && data.evidenceId) {
      await db
        .from("game_evidence")
        .update({ released: true, released_at: new Date().toISOString() })
        .eq("game_id", game.id)
        .eq("evidence_id", data.evidenceId);
      return { ok: true };
    }
    if (data.action === "RELEASE_ALL") {
      await db
        .from("game_evidence")
        .update({ released: true, released_at: new Date().toISOString() })
        .eq("game_id", game.id);
      return { ok: true };
    }
    if (data.action === "REMOVE_PLAYER" && data.playerId) {
      await db.from("players").update({ removed: true }).eq("id", data.playerId).eq("game_id", game.id);
      return { ok: true };
    }
    if (data.action === "DELETE_MESSAGE" && data.messageId) {
      await db.from("chat_messages").update({ deleted: true }).eq("id", data.messageId).eq("game_id", game.id);
      return { ok: true };
    }

    const t = TRANSITIONS[data.action];
    if (!t) throw new Error("Unknown action.");
    if (t.from !== status) throw new Error(`Cannot go from ${status} to ${t.to}.`);
    await db
      .from("games")
      .update(
        t.to === "BRIEFING"
          ? { status: t.to, started_at: new Date().toISOString() }
          : { status: t.to },
      )
      .eq("id", game.id);
    return { ok: true };
  });
