# GameOn - Pickup Game Coordinator

> Organizing 15+ people via group chat is chaos. GameOn makes pickup game coordination dead simple for any sport.

## What it does

GameOn lets you create a group for your sport crew, schedule games, and share a link for people to RSVP -- no sign up required. When a game fills up, extras automatically join a waitlist and get promoted when spots open.

## Features

- **Create groups** for any sport (soccer, basketball, tennis, etc.)
- **Schedule games** with date, time, location, and capacity
- **Frictionless RSVP** - just enter your name and tap In/Out/Maybe
- **Auto waitlist** - game full? Auto-promoted when someone drops
- **Share link** - copy and paste to WhatsApp, Telegram, anywhere
- **Recurring games** - weekly or biweekly repeat
- **Attendance stats** - leaderboard showing who shows up and who flakes
- **Real-time updates** - see RSVPs appear live via Supabase Realtime
- **Mobile-first** - designed for phones (that's where people open links)
- **Dark theme** - easy on the eyes

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** (Postgres + Realtime)
- **Tailwind CSS 4**
- **TypeScript**
- **Vercel** (deployment)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/tysoncung/gameon.git
cd gameon
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration in `supabase/migration.sql`
3. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/create` | Create a new group |
| `/g/[code]` | Group page with upcoming/past games |
| `/g/[code]/game/[id]` | Game detail with RSVP buttons |
| `/g/[code]/new-game` | Schedule a new game |
| `/g/[code]/stats` | Attendance leaderboard |

## How it works

1. **Organizer** creates a group with a name, sport, and admin PIN
2. Gets a shareable link like `gameon.vercel.app/g/abc123`
3. Shares link in group chat
4. **Players** open link, see upcoming games, tap to RSVP
5. No account needed -- just enter your name and tap In/Out/Maybe
6. Game full? You're on the waitlist. Someone drops? You're in!

## License

MIT
