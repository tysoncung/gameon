import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "GameOn";
  const subtitle =
    searchParams.get("subtitle") || "Organize pickup games with your crew";
  const sport = searchParams.get("sport") || "";
  const stats = searchParams.get("stats") || "";

  const sportEmoji: Record<string, string> = {
    Soccer: "⚽",
    Basketball: "🏀",
    Tennis: "🎾",
    Volleyball: "🏐",
    Badminton: "🏸",
    Baseball: "⚾",
    Football: "🏈",
    Cricket: "🏏",
    Hockey: "🏑",
    Pickleball: "🏓",
    "Ultimate Frisbee": "🥏",
  };
  const emoji = sportEmoji[sport] || "⚽";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #10b98120 0%, transparent 50%), radial-gradient(circle at 75% 75%, #10b98110 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px 80px",
          }}
        >
          <div style={{ fontSize: 80, marginBottom: 16 }}>{emoji}</div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#fafafa",
              letterSpacing: "-2px",
              display: "flex",
            }}
          >
            {title === "GameOn" ? (
              <>
                Game
                <span style={{ color: "#10b981" }}>On</span>
              </>
            ) : (
              <span>{title}</span>
            )}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#a3a3a3",
              marginTop: 16,
              maxWidth: 800,
            }}
          >
            {subtitle}
          </div>
          {stats && (
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 32,
                fontSize: 22,
                color: "#10b981",
              }}
            >
              {stats}
            </div>
          )}
          {title !== "GameOn" && (
            <div
              style={{
                position: "absolute",
                bottom: 40,
                fontSize: 20,
                color: "#525252",
                display: "flex",
              }}
            >
              gameon-coral.vercel.app
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
