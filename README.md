# GameOn - WhatsApp RSVP Bot for Pickup Games

> Every Sunday I organize pickup soccer in a WhatsApp group. 15+ people, half reply late, nobody knows the final count. GameOn is a WhatsApp bot that handles RSVPs right in the group chat - just reply 'in' or 'in +2'. No app to download, no link to click.

## How It Works

Players RSVP by texting the bot on WhatsApp. The organizer manages everything from a web dashboard.

```
ARCHITECTURE
============

  WhatsApp Group              Twilio             GameOn (Next.js)         Supabase
  +--------------+     +----------------+     +-------------------+     +-----------+
  |              |     |                |     |                   |     |           |
  | Player texts |---->| Webhook relay  |---->| /api/webhook/     |---->| Store     |
  | "in +2"     |     |                |     | whatsapp          |     | RSVP      |
  |              |<----| Send reply     |<----| Parse + respond   |<----| Query     |
  |              |     |                |     |                   |     |           |
  +--------------+     +----------------+     +-------------------+     +-----------+
                                                     |
                                              +------+------+
                                              |             |
                                         Admin Dashboard   Cron
                                         (web app)        /api/cron/reminders
                                         /admin           (24h + 2h alerts)
```

## WhatsApp Bot Commands

| Command | What it does |
|---------|-------------|
| `in` or `yes` or `y` | RSVP as in |
| `in +2` or `yes +3` | RSVP as in, bringing N guests |
| `out` or `no` or `n` | RSVP as out |
| `maybe` or `m` | RSVP as maybe |
| `status` or `list` | Show who is in/out/maybe with counts |
| `stats` | Attendance leaderboard |

## Features

- **WhatsApp-first** - RSVP right in your group chat, no links needed
- **+N guest support** - "in +2" tracks you plus 2 friends toward capacity
- **Auto waitlist** - game full? You are queued. When someone drops, next in line gets notified
- **Smart replies** - bot confirms: "Got it Tyson! You're in (+2 guests). 8/15 spots filled."
- **Auto reminders** - 24h and 2h before game time
- **Admin dashboard** - web UI to manage groups, games, send announcements, see live RSVPs
- **Web RSVP fallback** - share a link for people who prefer the web
- **Attendance stats** - leaderboard showing who shows up and who flakes
- **Real-time updates** - live RSVP feed via Supabase Realtime

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** (Postgres + Realtime)
- **Twilio WhatsApp API**
- **Tailwind CSS 4**
- **TypeScript**
- **Vercel** (deployment + cron)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/tysoncung/gameon.git
cd gameon
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/migration.sql`
3. Then run `supabase/migration_002_whatsapp.sql`
4. Copy your project URL and anon key

### 3. Set up Twilio WhatsApp

1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Go to Messaging > Try it out > Send a WhatsApp message
3. For production: apply for a WhatsApp Business Profile
4. Set up a Twilio WhatsApp Sandbox (for testing):
   - Go to Messaging > Settings > WhatsApp Sandbox Settings
   - Set the webhook URL to: `https://your-app.vercel.app/api/webhook/whatsapp`
   - Method: POST
5. Copy your Account SID, Auth Token, and WhatsApp number

### 4. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886
CRON_SECRET=some-random-secret
```

### 5. Deploy to Vercel

```bash
npm run build
vercel deploy --prod
```

The `vercel.json` configures a cron job to check for reminders every hour.

### 6. Test the bot

1. Send "join <sandbox-code>" to Twilio's WhatsApp sandbox number
2. Text "in" -- you should get a confirmation
3. Text "status" -- see the current RSVP list

## Development

```bash
npm run dev
```

For local WhatsApp webhook testing, use ngrok:

```bash
ngrok http 3000
# Set Twilio webhook to: https://your-ngrok-url.ngrok.io/api/webhook/whatsapp
```

## Admin Dashboard

Visit `/admin` to:
- View all groups and games
- Send game announcements via WhatsApp
- See live RSVP feed as players respond
- Link to web RSVP pages

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhook/whatsapp` | POST | Twilio incoming message webhook |
| `/api/cron/reminders` | GET | Send 24h and 2h game reminders |
| `/api/announce` | POST | Send game announcement to all players |

## Database Schema

See `supabase/migration.sql` and `supabase/migration_002_whatsapp.sql` for the full schema.

Key tables: `groups`, `games`, `rsvps` (with `guests` and `player_phone`), `players` (phone-to-name mapping), `reminders`, `whatsapp_groups`.
