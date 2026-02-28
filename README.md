# GameOn - WhatsApp RSVP Bot for Pickup Games

> Organize pickup games with your crew. Players RSVP via WhatsApp or a web link. No app to download.

## How It Works

Players RSVP by texting the bot on WhatsApp. The organizer manages everything from a web dashboard.

```
ARCHITECTURE
============

  WhatsApp Group              Twilio             GameOn (Next.js)         MongoDB Atlas
  +--------------+     +----------------+     +-------------------+     +-----------+
  |              |     |                |     |                   |     |           |
  | Player texts |---->| Webhook relay  |---->| /api/webhook/     |---->| Store     |
  | "in +2"     |     |                |     | whatsapp          |     | RSVP      |
  |              |<----| Send reply     |<----| Parse + respond   |<----| Query     |
  |              |     |                |     |                   |     |           |
  +--------------+     +----------------+     +-------------------+     +-----------+
```

## Tech Stack

- **Next.js 16** (App Router)
- **MongoDB Atlas** + **Mongoose** (database + ODM)
- **Twilio** (WhatsApp messaging)
- **Tailwind CSS v4** (dark theme, mobile-first)

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd gameon
npm install
```

### 2. MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and whitelist your IP (or allow all with `0.0.0.0/0`)
3. Get your connection string (looks like `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/gameon_db`)

Mongoose will auto-create collections and indexes on first use. No migrations needed.

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - Your Twilio WhatsApp number
- `CRON_SECRET` - Random secret for the reminder cron endpoint

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## WhatsApp Bot Commands

| Command | Action |
|---------|--------|
| `in` or `yes` | RSVP as in |
| `in +2` | RSVP as in, bringing 2 guests |
| `in @Dave` | Add Dave (on behalf) |
| `in @Dave +1` | Add Dave + 1 guest |
| `out` or `no` | RSVP as out |
| `out @Dave` | Mark Dave as out |
| `maybe` | RSVP as maybe |
| `status` | See current RSVP list |
| `stats` | Attendance leaderboard |

## Features

- Auto-waitlist with promotion when spots open
- On-behalf RSVPs (add friends who are not on WhatsApp)
- Guest tracking (+N)
- Admin dashboard with PIN authentication
- Game announcements via WhatsApp
- Automated 24h and 2h reminders
- Attendance stats and leaderboard
- Dark theme, mobile-first design
- Polling-based live updates on web
