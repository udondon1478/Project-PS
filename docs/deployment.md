# Deployment Plan

## Overview

This document outlines the steps to deploy the BOOTH automated scraper service (`booth-cron`) to a VPS environment using PM2.

## Prerequisites

- Node.js (v20+)
- npm or yarn
- PostgreSQL database accessible from the VPS
- PM2 installed globally (`npm install -g pm2`)

## Deployment Steps

### 1. Codebase Setup

Clone the repository and install dependencies.

```bash
git clone <repo_url>
cd booth-auto-scraping
npm install
```

### 2. Environment Variables

Ensure `.env` file is populated with necessary variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb" # Start with postgresql://
NEXT_PUBLIC_SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
# ... other vars
```

### 3. Database Migration

Ensure the database schema is up to date.

```bash
npx prisma migrate deploy
```

### 4. Build Application (Optional for Cron)

While `booth-cron` runs with `ts-node`, building the Next.js app might be required for other services.

```bash
npm run build
```

### 5. Start Cron Service with PM2

Use the `ecosystem.config.js` to start the cron process.

```bash
# Start in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 list to respawn on reboot
pm2 save

# Setup PM2 startup script
pm2 startup
# (Run the command output by the above command)
```

### 6. Monitoring

- Check logs: `pm2 logs booth-cron`
- Monitor status: `pm2 status`
- Dashboard: `pm2 monit`

## Verification

1. Check `pm2 logs booth-cron` to see "BOOTH Cron Scheduler is now running".
2. Wait for 10 minutes (or trigger manually) and verify `[Cron] New Product Scan started` logs.
3. Check Database `ScraperRun` table for new entries.

## Update Procedure

```bash
git pull origin main
npm install
npx prisma migrate deploy
pm2 restart booth-cron
```
