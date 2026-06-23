# Uptime Kuma Pi Dashboard

A touch-friendly status dashboard for a Raspberry Pi with a 7-inch screen. It reads from a **public Uptime Kuma status page** (no login required on the Pi).

## 1. Create a status page in Uptime Kuma

1. Open your Uptime Kuma admin UI: `http://100.82.211.69:3010/dashboard`
2. Go to **Status Pages** → **New Status Page**
3. Add the monitors you want to display
4. Set a slug (for example `home-lab`)
5. Enable **Published**
6. Save — your public page will be at:
   `http://100.82.211.69:3010/status/home-lab`

## 2. Configure the dashboard

```bash
cd ~/uptime-kuma-pi-dashboard
cp .env.example .env
```

Edit `.env`:

```env
UPTIME_KUMA_URL=http://100.82.211.69:3010
STATUS_PAGE_SLUG=home-lab
PORT=3080
POLL_INTERVAL_MS=20000
```

## 3. Run locally (Mac or Pi)

```bash
npm install
npm start
```

Open `http://localhost:3080` on the Pi or your Mac.

## 4. Run on boot (Raspberry Pi)

Copy the project to your Pi, then:

```bash
sudo cp deploy/uptime-kuma-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now uptime-kuma-dashboard
```

The service expects the app at `/home/pi/uptime-kuma-pi-dashboard`. Adjust paths in the unit file if yours differ.

## 5. Kiosk mode on the touchscreen

**Important:** start the dashboard server first, then open the browser.

```bash
# Terminal 1 - start the server
cd ~/uptime-kuma-pi-dashboard
npm start

# Terminal 2 - open kiosk (waits for server to be ready)
chmod +x deploy/kiosk.sh deploy/diagnose.sh
./deploy/kiosk.sh
```

If you see a blank screen, run diagnostics:

```bash
./deploy/diagnose.sh
```

Common causes of a blank page:

| Symptom | Fix |
|---------|-----|
| `health` check fails | Server not running — run `npm start` |
| `api/status` fails | Check `.env` and that the Pi can reach Uptime Kuma |
| HTML loads but no data | Add monitors to your Uptime Kuma status page |
| Kiosk opens too early | Use `deploy/kiosk.sh` — it waits for the server |

For auto-start on login, add to `~/.config/labwc/autostart` (Bookworm) or `~/.config/lxsession/LXDE-pi/autostart` (older Pi OS):

```ini
@/home/pi/uptime-kuma-pi-dashboard/deploy/kiosk.sh
```

Make sure the dashboard systemd service is also enabled if you use it.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Merged status page + heartbeat data |
| `GET /api/config` | Local dashboard configuration |

## Notes

- The Pi only needs network access to your Uptime Kuma instance (Tailscale IP `100.82.211.69` works).
- Data refreshes every 20 seconds by default.
- Optimized for 800×480 and 1024×600 touchscreens.
