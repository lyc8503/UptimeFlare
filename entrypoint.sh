#!/bin/bash

echo "Initializing database schema..."
cd /app
npx wrangler d1 execute uptimeflare_d1 --file=/app/init.sql

# Start Worker
echo "Starting Worker..."
cd /app/worker
npx wrangler dev --inspector-port 9229 --test-scheduled --persist-to ../.wrangler/state --ip 0.0.0.0 --port 8787 2>&1 > /app/worker.log &

# Start Pages
echo "Starting Pages..."
cd /app
npx wrangler pages dev .vercel/output/static --inspector-port 9230 --ip 0.0.0.0 --port 8788 2>&1 > /app/pages.log &

# CRON Loop
echo "Starting CRON loop..."
touch /app/scheduled.log
echo "* * * * * /usr/bin/curl -m 60 -s 'http://127.0.0.1:8787/__scheduled' >> /app/scheduled.log 2>&1" | crontab -
cron

exec tail -f /app/worker.log /app/pages.log /app/scheduled.log
