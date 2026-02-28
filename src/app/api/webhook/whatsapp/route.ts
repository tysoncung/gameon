import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Player, Group, Rsvp } from "@/lib/models";
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
    await connectDB();
    const formData = await req.formData();
    const body = formData.get("Body") as string;
    const from = (formData.get("From") as string || "").replace("whatsapp:", "");
    const profileName = (formData.get("ProfileName") as string) || "Player";

    if (!body || !from) {
      return emptyTwiml();
    }

    const command = parseCommand(body);

    if (command.type === "unknown") {
      return emptyTwiml();
    }

    // Find the group this phone is associated with
    const playerRecord = await Player.findOne({ phone: from })
      .populate("groupId")
      .lean();

    let groupId: string;
    let playerName: string;

    if (playerRecord) {
      groupId = playerRecord.groupId.toString();
      playerName = playerRecord.name;
    } else {
      // New player - check if there's a default/single group
      const group = await Group.findOne().lean();

      if (!group) {
        await sendWhatsApp(from, "No groups set up yet. Ask your organizer to create one at the GameOn website.");
        return emptyTwiml();
      }

      groupId = group._id.toString();
      playerName = profileName;

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
        const targetName = command.onBehalf || playerName;
        const targetPhone = command.onBehalf ? "" : from;
        const result = await handleRsvp(
          game!._id.toString(),
          targetName,
          targetPhone,
          "in",
          command.guests,
          command.onBehalf ? playerName : undefined
        );
        if (command.onBehalf) {
          const guestText = command.guests > 0 ? ` (+${command.guests} guest${command.guests > 1 ? "s" : ""})` : "";
          replyMessage = result.message.replace(
            `Got it ${targetName}!`,
            `Got it! ${playerName} added ${targetName}${guestText}.`
          );
        } else {
          replyMessage = result.message;
        }
        if (result.promoted) {
          const promotedRsvp = await Rsvp.findOne({
            gameId: game!._id,
            playerName: result.promoted,
          }).lean();

          if (promotedRsvp?.playerPhone) {
            await sendWhatsApp(
              promotedRsvp.playerPhone,
              `Good news ${result.promoted}! A spot opened up and you've been moved off the waitlist. You're IN!`
            );
          }
        }
        break;
      }

      case "out": {
        const targetName = command.onBehalf || playerName;
        const targetPhone = command.onBehalf ? "" : from;
        const result = await handleRsvp(game!._id.toString(), targetName, targetPhone, "out");
        if (command.onBehalf) {
          replyMessage = `Got it! ${playerName} marked ${targetName} as out. ${result.message.split(". ").pop()}`;
        } else {
          replyMessage = result.message;
        }
        if (result.promoted) {
          const promotedRsvp = await Rsvp.findOne({
            gameId: game!._id,
            playerName: result.promoted,
          }).lean();

          if (promotedRsvp?.playerPhone) {
            await sendWhatsApp(
              promotedRsvp.playerPhone,
              `Good news ${result.promoted}! A spot opened up and you've been moved off the waitlist. You're IN!`
            );
          }
        }
        break;
      }

      case "maybe": {
        const targetName = command.onBehalf || playerName;
        const targetPhone = command.onBehalf ? "" : from;
        const result = await handleRsvp(game!._id.toString(), targetName, targetPhone, "maybe");
        if (command.onBehalf) {
          replyMessage = `Got it! ${playerName} marked ${targetName} as maybe.`;
        } else {
          replyMessage = result.message;
        }
        break;
      }

      case "status": {
        replyMessage = await buildStatusMessage(game!._id.toString());
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
