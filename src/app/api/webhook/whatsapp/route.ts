import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import {
  parseCommand,
  getOrCreatePlayer,
  findActiveGame,
  handleRsvp,
  buildStatusMessage,
  buildStatsMessage,
} from "@/lib/whatsapp-bot";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body = formData.get("Body") as string;
    const from = (formData.get("From") as string || "").replace("whatsapp:", "");
    const profileName = (formData.get("ProfileName") as string) || "Player";

    if (!body || !from) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const command = parseCommand(body);

    if (command.type === "unknown") {
      // Don't reply to messages we don't understand
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find the group this phone is associated with
    // First check if player exists in any group
    const { data: playerRecord } = await supabase
      .from("players")
      .select("*, groups!inner(*)")
      .eq("phone", from)
      .limit(1)
      .single();

    let groupId: string;
    let playerName: string;

    if (playerRecord) {
      groupId = playerRecord.group_id;
      playerName = playerRecord.name;
    } else {
      // New player - check if there's a default/single group
      const { data: groups } = await supabase
        .from("groups")
        .select("*")
        .limit(1);

      if (!groups || groups.length === 0) {
        await sendWhatsApp(from, "No groups set up yet. Ask your organizer to create one at the GameOn website.");
        return emptyTwiml();
      }

      groupId = groups[0].id;
      playerName = profileName;

      // Register this player
      await getOrCreatePlayer(from, playerName, groupId);
    }

    // Find active game
    const game = await findActiveGame(groupId);

    if (!game && command.type !== "stats") {
      await sendWhatsApp(from, "No upcoming games scheduled. Ask your organizer to create one!");
      return emptyTwiml();
    }

    let replyMessage = "";

    switch (command.type) {
      case "in": {
        const result = await handleRsvp(
          game!.id,
          playerName,
          from,
          "in",
          command.guests
        );
        replyMessage = result.message;
        if (result.promoted) {
          // Notify promoted player
          const { data: promotedPlayer } = await supabase
            .from("rsvps")
            .select("player_phone")
            .eq("game_id", game!.id)
            .eq("player_name", result.promoted)
            .single();

          if (promotedPlayer?.player_phone) {
            await sendWhatsApp(
              promotedPlayer.player_phone,
              `Good news ${result.promoted}! A spot opened up and you've been moved off the waitlist. You're IN!`
            );
          }
        }
        break;
      }

      case "out": {
        const result = await handleRsvp(game!.id, playerName, from, "out");
        replyMessage = result.message;
        if (result.promoted) {
          const { data: promotedPlayer } = await supabase
            .from("rsvps")
            .select("player_phone")
            .eq("game_id", game!.id)
            .eq("player_name", result.promoted)
            .single();

          if (promotedPlayer?.player_phone) {
            await sendWhatsApp(
              promotedPlayer.player_phone,
              `Good news ${result.promoted}! A spot opened up and you've been moved off the waitlist. You're IN!`
            );
          }
        }
        break;
      }

      case "maybe": {
        const result = await handleRsvp(game!.id, playerName, from, "maybe");
        replyMessage = result.message;
        break;
      }

      case "status": {
        replyMessage = await buildStatusMessage(game!.id);
        break;
      }

      case "stats": {
        replyMessage = await buildStatsMessage(groupId);
        break;
      }
    }

    if (replyMessage) {
      await sendWhatsApp(from, replyMessage);
    }

    return emptyTwiml();
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return emptyTwiml();
  }
}

function emptyTwiml() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { "Content-Type": "text/xml" } }
  );
}
