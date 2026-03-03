# GameOn - Pickup Game Coordinator

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://gameon-coral.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Organize pickup games with your crew. Players RSVP via WhatsApp or web. No app to download.

**[Live Demo](https://gameon-coral.vercel.app)** | **[Report Bug](https://github.com/tysoncung/gameon/issues)** | **[Request Feature](https://github.com/tysoncung/gameon/issues)**

---

## The Problem

Organizing pickup sports games is chaos. Group chats get buried. Nobody knows who's coming. The organizer spends more time counting heads than playing.

## The Solution

GameOn lets players RSVP with a simple WhatsApp message or web link. The organizer sees a real-time headcount. Everyone knows if the game is on.

## Features

- **WhatsApp Bot** - RSVP by texting `in`, `out`, `in +2` (bring friends), `status`
- **RSVP on Behalf** - Add others: `in @Dave`, `out @Sarah`
- **Web Dashboard** - Create games, share invite links, track RSVPs
- **Group System** - Invite codes for your regular crew
- **Admin Panel** - Manage all groups and games
- **Auto Reminders** - Daily cron job pings players who haven't responded
- **Player Stats** - Track attendance across games

## How It Works

```
WhatsApp Group           Twilio              GameOn API            MongoDB
+-------------+    +---------------+    +----------------+    +-----------+
| "in +2"     |--->| Webhook relay |--->| Parse + store  |--->| RSVPs     |
| "status"    |<---| Send reply    |<---| Query + format |<---| Games     |
+-------------+    +---------------+    +----------------+    +-----------+
```

**Web flow:** Share invite link -> Players open in browser -> One-tap RSVP

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, dark theme |
| Backend | Next.js API Routes, Mongoose ODM |
| Database | MongoDB Atlas (M0 free tier) |
| Messaging | Twilio WhatsApp Business API |
| Hosting | Vercel (Hobby) |

## Quick Start

```bash
# Clone
git clone https://github.com/tysoncung/gameon.git
cd gameon

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and Twilio credentials

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
MONGODB_URI=mongodb+srv://...
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
CRON_SECRET=your_secret
```

## WhatsApp Commands

| Command | Action |
|---------|--------|
| `in` | RSVP as going |
| `in +2` | RSVP with 2 guests |
| `in @Dave` | RSVP Dave as going |
| `out` | Cancel RSVP |
| `out @Dave` | Cancel Dave's RSVP |
| `status` | See current headcount |
| `help` | List all commands |

## Project Structure

```
src/
  app/
    api/
      games/          # CRUD for games
      groups/         # Group management
      webhook/
        whatsapp/     # Twilio webhook handler
      announce/       # Send game announcements
      cron/
        reminders/    # Daily reminder cron
      stats/          # Player statistics
    g/[invite_code]/  # Public group pages
    admin/            # Admin dashboard
    create/           # Create group flow
  lib/
    models.ts         # Mongoose schemas
    mongodb.ts        # DB connection
    whatsapp-bot.ts   # Bot command parser
    twilio.ts         # Twilio client
    utils.ts          # Helpers
```

## Roadmap

- [x] WhatsApp bot with RSVP commands
- [x] Web dashboard with invite links
- [x] RSVP on behalf of others
- [x] Admin panel
- [x] Auto reminders (daily cron)
- [ ] Google auth + user profiles
- [ ] Recurring games (auto-create weekly)
- [ ] Web push notifications
- [ ] Weather check (auto-warn if rain)
- [ ] Venue search (Google Places)
- [ ] Leaderboard + attendance streaks
- [ ] PWA (installable on phone)
- [ ] Mobile app (Expo)

## Contributing

PRs welcome! See [issues](https://github.com/tysoncung/gameon/issues) for ideas.

## License

MIT

---

Built by [Tyson Cung](https://github.com/tysoncung)
