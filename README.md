# VGen Dashboard — Responsive Prototype

A coded, responsive version of the **VGen Dashboard & Service Redesign** (GXID501, Figma "Hi-fi" page) by Mingjia Chen.

Plain HTML, CSS and JavaScript — no build step — so it runs as-is on GitHub Pages.

## What works

- **Dashboard**: earnings overview (expand *This Month* for the monthly line chart, *Pending Payments* for the paid/unpaid donut), commission pipeline (NEW / Ready / WIP / Completed), upcoming deadlines and calendar.
- **Filters**: Tags (searchable), Payments (Not Paid / Partially Paid / Paid / TBD), 30 days / 60 days / All, deadline chips (Delivery / Progress / Payment), and the search bar.
- **Calendar**: month navigation; selecting a day lists what's due.
- **New Commission** form with validation; new commissions appear in the pipeline and on the calendar.
- **Project details** (click any card): progress steps you can check off, add steps, record payment, send invoice, tabs, links and reference files, and moving a card between columns.
- **Laptop / Mobile switch**: *Mobile* shows the separate React mobile prototype ([vgen-disagreements.vercel.app](https://vgen-disagreements.vercel.app)) in a phone frame.

Changes stay in the browser tab only; reloading resets the demo data. "Today" is fixed to Oct 9, 2025 so the countdowns match the design.

## Breakpoints

| Width | Layout |
|---|---|
| > 1360px | Full desktop: sidebar, 4-column pipeline, deadlines beside the calendar |
| ≤ 1360px | Deadlines and calendar stack |
| ≤ 1200px | 2-column pipeline |
| ≤ 1100px | Project details become one column |
| ≤ 900px | Sidebar becomes a slide-in drawer (☰) |
| ≤ 640px | Phone: swipeable pipeline columns, stacked cards, full-screen form |

## Run locally

Open `index.html` through any static server, for example:

```bash
npx serve .
```

## Deploy (GitHub Pages)

Repo → **Settings → Pages** → Source: *GitHub Actions*. Every push to `main` runs `.github/workflows/pages.yml` and publishes the site.

The type and spacing are scaled down from the 1440px Figma frames (about 75–85%), and the content sits in a centered column on a light grey canvas, so it reads well on a laptop screen.
