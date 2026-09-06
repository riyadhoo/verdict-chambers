import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

export function Notes({ gameId, playerId }: { gameId: string; playerId: string }) {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    supabase
      .from("notes")
      .select("content")
      .eq("game_id", gameId)
      .eq("player_id", playerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContent(data.content);
      });
  }, [gameId, playerId]);

  function onChange(value: string) {
    setContent(value);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("game_id", gameId)
        .eq("player_id", playerId)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("notes")
          .update({ content: value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("notes").insert({ game_id: gameId, player_id: playerId, content: value });
      }
      setSaved(true);
    }, 700);
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="label-caps">Private notebook</p>
        <span className="label-caps">{saved ? "Saved" : "Writing…"}</span>
      </div>
      <Textarea
        className="mt-3 min-h-40 font-mono text-sm"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Only you can read this."
      />
    </div>
  );
}
