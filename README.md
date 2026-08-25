# Weekly Planner

A light, calm to-do app: your projects on top, your week underneath. Drag a task
into a day, tick it off anywhere, and it updates everywhere.

No accounts, no server, no build tools. Everything is saved in your browser.

## Two ways to use it

**1. The single file — easiest**

Download `planner.html`, double-click it. That's the whole app: one file you can
email to yourself, keep in Dropbox, or put on a USB stick.

**2. The source files**

`index.html` + `styles.css` + `app.js`. Open `index.html` in a browser, or host
the folder anywhere static.

To publish it at a real URL: in this repo go to **Settings → Pages**, set
*Source* to *Deploy from a branch*, pick the branch and `/ (root)`, save. Your
planner shows up at `https://gsankaridevi-ui.github.io/to-do/` a minute later.

## What it does

- **Projects** — group tasks under as many projects as you want; rename or delete
  them inline. Each gets its own colour and progress bar.
- **The week** — seven day columns plus an **Unscheduled** tray. Drag a task into
  a day, or drag it back to the tray.
- **One task, two places** — a task shows in its project *and* in its day.
  Checking it off in either spot updates both.
- **Done** — completed tasks collect at the bottom, and can be cleared out.
- **Today** is highlighted automatically.
- **Backup** — the ⋮ menu exports a JSON file and imports it back. Worth doing
  now and then, since browser storage can be cleared.

Dragging needs a mouse or trackpad. On a phone, use the pencil icon on a task and
pick a day from the dropdown instead.

## Your data

Stored in `localStorage` under the key `weekly-planner-v1`, in that browser, on
that device. It never leaves your machine — which also means it does not sync
between your laptop and your phone. Use Export/Import to move it.

## Making changes

Edit `styles.css` for looks, `app.js` for behaviour. The things you are most
likely to want are near the top of `app.js`:

- `DAYS` — the day columns
- `STARTER` — the projects and tasks a brand-new planner starts with
- `--project-1` … `--project-6` in `styles.css` — the project colours

After any edit, regenerate the single file:

```sh
node build.js
```

That inlines the CSS and JS into `planner.html`. Commit both.
