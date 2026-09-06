import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Msg = {
  id: string;
  player_id: string | null;
  message: string;
  deleted: boolean;
  created_at: string;
};

export function Chat({
  gameId,
  playerId,
  isAdmin,
  names,
  canPost,
  onDelete,
}: {
  gameId: string;
  playerId: string | null;
  isAdmin: boolean;
  names: Record<string, { name: string; number: number }>;
  canPost: boolean;
  onDelete: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, player_id, message, deleted, created_at")
        .eq("game_id", gameId)
        .order("created_at")
        .limit(200);
      if (active && data) setMessages(data as Msg[]);
    }
    load();
    const channel = supabase
      .channel(`chat:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `game_id=eq.${gameId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !playerId) return;
    setText("");
    const { error } = await supabase
      .from("chat_messages")
      .insert({ game_id: gameId, player_id: playerId, message: body.slice(0, 500) });
    if (error) toast.error("Your remark was not entered into the record.");
  }

  return (
    <div className="panel flex h-[26rem] flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="label-caps">Deliberation floor</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">The floor is silent.</p>
        )}
        {messages.map((m) => {
          const who = m.player_id ? names[m.player_id] : undefined;
          return (
            <div key={m.id} className="group text-sm">
              <span className="font-mono text-xs text-gold-dim">
                Juror {who?.number ?? "?"} · {who?.name ?? "Unknown"}
              </span>
              <p className={m.deleted ? "italic text-muted-foreground" : "text-foreground"}>
                {m.deleted ? "— remark struck from the record —" : m.message}
              </p>
              {isAdmin && !m.deleted && (
                <button
                  className="mt-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => onDelete(m.id)}
                >
                  Strike from record
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canPost ? "Address the jury…" : "The floor is closed."}
          disabled={!canPost || !playerId}
          maxLength={500}
        />
        <Button type="submit" disabled={!canPost || !playerId || !text.trim()}>
          Speak
        </Button>
      </form>
    </div>
  );
}
