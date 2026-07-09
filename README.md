# project-dashboard

A single, local dashboard for tracking Nate's active projects — status, staleness, next
step, due dates — plus a weekly digest and a quick-capture inbox. Reads project state from
YAML frontmatter in `~/os/projects/*/README.md`; stores its own writable data (due dates,
field overrides, inbox) in `data/manual.json`.

## Setup

```sh
git clone <this-repo> project-dashboard
cd project-dashboard
npm install
cp .env.example .env
```

Edit `.env` and set `OS_PROJECTS_DIR` to the absolute path of your projects directory:

```
OS_PROJECTS_DIR=/Users/yourname/os/projects
```

## Run

```sh
npm run dev
```

Open `http://localhost:4321` in your browser.

`data/manual.json` is created automatically on the first write (due date, override, or inbox
item) and is gitignored — it stays local to your machine.

## Stack

Astro 5 SSR + Tailwind CSS + TypeScript, served via `@astrojs/node` in standalone mode.
