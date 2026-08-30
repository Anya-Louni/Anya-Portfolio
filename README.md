# OSnya

A desktop you can open, built for the web. Windows 7 geometry redrawn in a
Frutiger Aero palette, with the projects, the games and the aquarium living
inside it as real applications.

Every window is draggable, resizable, snappable and minimisable. Every app is
written from scratch. Nothing is a screenshot.

**[anya-louni.netlify.app](https://anya-louni.netlify.app)**

## What is in it

**Projects** opens a file browser over the real repositories, each with its own
document of methods and results.

**Aquarium** is a WebGL tank whose fish are drawn by visitors. Draw one and it
joins the water for everyone.

**Games** holds seven: Solitaire, Spider, FreeCell, Minesweeper, Chess with a
real engine, a rhythm game, and a deduction puzzle with a generated solution.

**Internet Explorer** browses the live web and, with the time slider, the same
addresses as they were in 1996 through 2020 by way of the Internet Archive.

**iPod** is a first-generation shell with a click wheel that rotates properly.
**Paint**, **ASCII Studio**, **Photo Booth**, **Draw Music**, **Synth** and a
**Terminal** over a virtual filesystem fill out the rest.

## Built with

React 19, TypeScript and Vite. three.js for the aquarium, loaded only when the
tank is opened. Supabase for the two things that outlive a session. 7.css and
XP.css underneath the window chrome.

No component library, no CSS framework, no analytics, no cookies. Every icon,
wallpaper, fish, pet and avatar in here was drawn for it.

## Running it

```bash
npm install
npm run dev      # http://127.0.0.1:5178
npm run build
```

It runs without any configuration. The aquarium falls back to its own fish and
notes stay in the browser.

## Layout

```
src/apps/       one folder per application
src/os/         windows, taskbar, start menu, the app registry
src/aquarium/   the WebGL tank and its economy
src/games/      shared card and board machinery
src/art/        wallpaper, flourishes
src/styles/     tokens first, then one file per surface
tools/          the wallpaper renderer
```

## Credit

The application icons are Windows 7 icon artwork and belong to Microsoft. This
is a personal, non-commercial tribute and is not affiliated with them. Windows,
Windows 7 and Windows XP are their trademarks.

Everything else was made for this project.
