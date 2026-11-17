<div align="center">

<img src="https://files.catbox.moe/zlu6dx.jpg" width="180" height="180">

# Tracle-Lite

### A fast WhatsApp multi-device bot you can run anywhere

<p>
<img src="https://img.shields.io/github/stars/Brenaldmedia/Tracle-lite?style=for-the-badge&color=orange">
<img src="https://img.shields.io/github/forks/Brenaldmedia/Tracle-lite?style=for-the-badge&color=orange">
<img src="https://img.shields.io/badge/Commands-300+-orange?style=for-the-badge">
<img src="https://img.shields.io/badge/Node-20+-black?style=for-the-badge&logo=node.js">
</p>

<a href="https://github.com/Brenaldmedia/Tracle-lite/fork"><img src="https://img.shields.io/badge/Fork%20repo-black?style=for-the-badge&logo=github"></a>
<a href="https://tracle-sessions.brenaldmedia.com/"><img src="https://img.shields.io/badge/Get%20session%20ID-orange?style=for-the-badge&logo=whatsapp&logoColor=white"></a>
<a href="https://tracle-host.brenaldmedia.com"><img src="https://img.shields.io/badge/Deploy%20on%20Tracle%20Host-black?style=for-the-badge"></a>

</div>

---

## How it works

This repo is only the launcher (a few small files). Run `npm start` (or `node index.js`) on any host and it:

1. Downloads the latest Tracle-Lite bot from our server, checks it (SHA-256) and keeps it in `.tracle/`.
2. Installs the bot's packages the first time (this can take a few minutes).
3. Updates itself on every restart when a new version is out. If our server can't be reached, it runs the saved copy.

Your logins (`sessions/`) and settings (`.tracle/data`) stay when the bot updates.

Then it looks for a WhatsApp login in this order:

1. **A saved login** in the `sessions` folder (after the first link, restarts need nothing).
2. **`SESSION_ID`** from `.env` or your host's environment variables. The bot starts straight away.
3. **`PHONE_NUMBER`** from `.env` or environment variables. A pairing code is printed in the logs.
4. **The console asks you**: type your WhatsApp number or paste your session ID and press Enter
   (Pterodactyl, VPS, your PC).

If none of these is available and nobody can type in the console, it prints the steps and waits.
It never crash-loops.

### Linking with a number

1. Enter your number with country code, digits only, for example `2345678901234`.
2. A code like `ABCD-1234` appears in the console or logs. It stays valid for about 3 minutes, and a new
   one is made only after it expires.
3. On your phone: WhatsApp > Settings > Linked devices > Link a device > **Link with phone number instead**,
   then enter the code.
4. The bot starts by itself. It also sends your **session ID** once to your own chat ("Message yourself").
   Keep it private. Paste it as `SESSION_ID` on any host to start without a new code.

### Session ID

Both kinds work:

| Kind | Looks like | Where it comes from |
|------|-----------|---------------------|
| Full session ID | `TRACLE~eyJub2lzZUtleSI6...` | Sent to your own chat after linking with this bot |
| Short session ID | `Tracle_xxxxxxxx` | The [session site](https://tracle-sessions.brenaldmedia.com/) |

If WhatsApp logs the bot out, the old login is cleared and the bot asks again (or prints a new pairing
code when `PHONE_NUMBER` is set). A `SESSION_ID` that was logged out is skipped until you replace it.

---

## Settings

Copy `.env.example` to `.env`, or add the same names as environment variables on your host.

| Variable | What it does | Needed |
|----------|-------------|--------|
| `SESSION_ID` | Your session ID. Starts the bot straight away | One of these two, or type it in the console |
| `PHONE_NUMBER` | Your number with country code, digits only. Prints a pairing code | |
| `PREFIX` | Command prefix (default `.`) | No |
| `OWNER_NUMBER` / `OWNER_NUMBERS` | Owner number(s). Used for pairing too if `PHONE_NUMBER` is empty | No |
| `OWNER_NAME` | Owner name shown in menus | No |
| `DEFAULT_BOT_MODE` | `public` or `private` | No |
| `MENU_IMAGE_URL`, `STICKER_NAME`, `STICKER_AUTHOR` | Looks | No |
| `PORT` | Web port for health checks (`/api/health`). Most hosts set it for you | No |
| `DEFAULT_BANK_NAME`, `DEFAULT_ACCOUNT_NUMBER`, `DEFAULT_ACCOUNT_NAME` | Your details for `.bank` / `.support` | No |
| `WEATHER_API_KEY`, `NEWS_API_KEY`, `GNEWS_TOKEN`, `NEXORACLE_API_KEY` | Keys for the weather, news and some image commands | No |
| `REPORT_SMTP_USER`, `REPORT_SMTP_PASS`, `REPORT_EMAIL_TO` | Lets `.report` email you (Gmail needs an app password) | No |
| `BRIDGE_TOKEN` | Turns on the `/api/bridge/*` endpoints for your own tools. Off when empty | No |
| `TRACLE_MANIFEST_URL` | Where the launcher checks for bot versions. Leave as is | No |

---

## Deploy

### Pterodactyl panel

**With the egg (easiest)**
1. Admin area > Nests > Import Egg, and upload [`egg-tracle-lite.json`](egg-tracle-lite.json).
2. Create a server with the **Tracle-Lite** egg (Node 20 image, 1 GB disk and 512 MB RAM or more).
3. Start it and open the **Console**. Type your WhatsApp number (or paste your session ID) and press Enter.
4. If you typed a number, enter the pairing code on your phone. Done.

**Without the egg (any Node.js egg)**
1. Use a Node.js 20 egg. Upload this repo's files (or set the Git repo to
   `https://github.com/Brenaldmedia/Tracle-lite.git`).
2. Startup command: `node index.js` (or `npm start`).
3. Start the server and type your number or session ID in the Console.
4. Optional: add `SESSION_ID` or `PHONE_NUMBER` under Startup variables, or upload a `.env` file.

### VPS (Ubuntu, Debian and others)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git ffmpeg
git clone https://github.com/Brenaldmedia/Tracle-lite.git
cd Tracle-lite
npm start          # type your number or session ID when asked
```

Keep it running with pm2 after the first link:

```bash
sudo npm install -g pm2
pm2 start index.js --name tracle-lite
pm2 save && pm2 startup
```

### Render

1. Fork this repo. On Render: New > Web Service > pick your fork.
2. Build command `npm install`, start command `npm start`, health check path `/api/health`.
3. Environment: add `PHONE_NUMBER` (first time) or `SESSION_ID`.
4. Deploy and open **Logs**. If you used `PHONE_NUMBER`, enter the pairing code shown there.
5. Your session ID arrives in your own WhatsApp chat. Set it as `SESSION_ID` and remove `PHONE_NUMBER`,
   so redeploys start without a new code (free Render disks are wiped on every deploy).

### Railway

1. New Project > Deploy from GitHub repo > pick your fork.
2. Variables: add `PHONE_NUMBER` or `SESSION_ID`.
3. Open **Deploy Logs** for the pairing code. Then save the session ID you receive as `SESSION_ID`.

### Heroku

```bash
heroku create my-tracle-lite
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest
echo "web: npm start" > Procfile && git add Procfile && git commit -m Procfile
heroku config:set PHONE_NUMBER=2345678901234   # or SESSION_ID=TRACLE~...
git push heroku main
heroku logs --tail                             # pairing code shows here
```

Then set the session ID you receive: `heroku config:set SESSION_ID=... ` and `heroku config:unset PHONE_NUMBER`.

### Koyeb

1. Create Web Service > GitHub > pick your fork. Builder: Dockerfile (or Buildpack).
2. Environment variables: `PHONE_NUMBER` or `SESSION_ID`. Port `5000` (or the one Koyeb sets), health check `/api/health`.
3. Read the pairing code in the logs, then save the session ID you receive as `SESSION_ID`.

### Replit

1. Import from GitHub: `https://github.com/Brenaldmedia/Tracle-lite`.
2. Set the run command to `npm start`, then press **Run**. Type your number or session ID in the Console,
   or add `SESSION_ID` in Secrets.

### Docker

```bash
docker build -t tracle-lite .
# first time: interactive, type your number or session ID
docker run -it --name tracle-lite -v tracle-sessions:/app/sessions -v tracle-cache:/app/.tracle tracle-lite
# or with variables
docker run -d --name tracle-lite -e SESSION_ID="TRACLE~..." -v tracle-sessions:/app/sessions -v tracle-cache:/app/.tracle tracle-lite
```

### Your own PC (Windows, macOS, Linux)

1. Install [Node.js 20+](https://nodejs.org) and Git.
2. Run:
   ```bash
   git clone https://github.com/Brenaldmedia/Tracle-lite.git
   cd Tracle-lite
   npm start
   ```
3. Type your number or session ID when asked.

### Tracle Host

The quickest way, with nothing to install: [tracle-host.brenaldmedia.com](https://tracle-host.brenaldmedia.com).

---

## Features

- **Status:** auto view status, auto like status, status saver
- **Privacy:** anti-delete, view-once capture, anti-call, owner-only mode
- **Groups:** welcome and goodbye, anti-link, anti-badword, promote and demote, tag all, warnings
- **Downloads:** YouTube, TikTok, Instagram, Facebook, Pinterest, X, MediaFire, songs
- **Fun and tools:** stickers, text effects, games, quotes and more (`.menu` lists everything)

## Basic commands

| Command | Description |
|---------|-------------|
| `.menu` | All commands |
| `.ping` / `.alive` | Check the bot |
| `.mode` | Public or private mode |
| `.autoview` / `.autolike` | Status tools |
| `.vv` | Open a view-once message |
| `.sticker` | Image or video to sticker |
| `.tagall` | Mention everyone in a group |

---

## Notes

- Never share your session ID, your `.env` or the `sessions` folder. Anyone with them can use your WhatsApp.
- In private mode only you (the bot's own number, or the numbers in `OWNER_NUMBER`) can use commands.
- The host needs `tar` and internet access to our server on the first start (almost all hosts have both).
- Run one copy of the bot per WhatsApp number. Two copies on the same login make WhatsApp log it out.
- This project is for personal automation. You are responsible for how you use it.

<div align="center">

Made by [Brenaldmedia](https://github.com/Brenaldmedia)

</div>
