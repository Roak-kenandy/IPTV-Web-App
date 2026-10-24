# Boutique Hotels – mVision TV (web demo)

A web replica of the mVision hotel TV app, branded for a sample hotel ("Boutique Hotels"). It runs in any modern browser on a
laptop, tablet or phone, using the keyboard, mouse or touch. It's a static site: no backend,
database or API keys. All content and media are bundled in `public/`.

For the full architecture, code flows, media pipeline and project history, see
[`TECHNICAL-GUIDE.md`](TECHNICAL-GUIDE.md).

## Requirements

- Node.js **20.19+** or **22.12+** (only needed to build; the built site is plain HTML/JS/CSS)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app is designed at 1920×1080 and scales to fit any window.

## Build for production

```bash
npm run build      # outputs the static site to dist/
npm run preview    # serves dist/ at http://localhost:4173 to check the build
```

## Deploy / add to a website

Upload the **contents of `dist/`** to any static host: Apache, Nginx, IIS, S3, Netlify, Vercel,
GitHub Pages, etc. All paths are relative, so it works at the domain root or in any sub-folder, e.g.
`https://example.com/tv-demo/`. No server rewrites are needed (navigation uses `#` links).

To show it inside an existing page, embed it with an iframe. The `allow` attribute is required, or
the browser will block video sound and full screen inside the frame:

```html
<iframe
  src="https://example.com/tv-demo/"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0"
  allow="autoplay; fullscreen"
  allowfullscreen
></iframe>
```

The site needs to be served over `http(s)://`. Opening `dist/index.html` directly from disk
(`file://`) won't work because browsers block loading `content.json` that way.

## Controls

| Input | Action |
|---|---|
| Arrow keys | Move focus (TV remote D-pad) |
| Enter / Space | OK |
| Esc / Backspace | Back |
| Mouse | Hover to focus, click to select, wheel or drag to scroll |
| Touch | Tap to select, swipe to scroll, swipe up/down in full-screen TV to change channel |

A **Back** button appears at the top of the screen when you use a mouse or touch.

### Phone as remote

The start and welcome screens show a QR code. Scanning it opens `remote.html` on the phone, a
remote control laid out like the mVision remote (power, menu, D-pad/OK, back, home, mute, volume,
CH+/CH−). Button presses travel to the screen through free public MQTT brokers over secure
WebSockets (`broker.emqx.io:8084` and `broker.hivemq.com:8884`, both used at once; see
`src/phoneKeys.ts`), so the phone and the screen don't need to be on the same network. The network
must allow outgoing connections on those ports. The screen keeps the same pairing id in
`localStorage`, so a phone that has already scanned it reconnects automatically.

- **Power** returns to the welcome screen, **Home**/**Menu** open the home menu.
- **Volume/Mute** change the app's own volume and show a volume bar on screen.
- Browsers only allow sound after a real tap/click on the screen itself, so phone presses can't
  unlock sound; if the screen is muted, tap it once.

## Direct links

`#home`, `#tv`, `#movies`, `#about`, `#section/<id>`. The section ids are `accommodation`,
`belle-amie-bistro` and `excursions`.
For example: `https://example.com/tv-demo/#section/excursions`.

**Mirroring an iPad to a TV without black bars.** Open the demo once with `?fill=1`
(e.g. `https://example.com/tv-demo/?fill=1`). The stage then stretches to fill the whole screen,
remembered on that device until it is opened with `?fill=0`. On the 4:3 iPad the demo looks squeezed,
but a receiver that stretches the mirror to 16:9 (such as AirScreen with "Full screen" on) shows it
on the TV full screen and undistorted.

## Good to know

- **"Tap anywhere to start" screen.** Browsers block video sound until the visitor interacts with
  the page. The app shows this screen once on load, and the tap restarts the welcome video with sound.
- **Live TV** shows the hotel's real channel list, but plays a short demo clip per channel
  (`public/assets/video/channels/<ID>.mp4`, set as `video` on each channel in `content.json`)
  instead of the live streams. Re-download them with `python3 scripts/fetch-channel-videos.py`
  (needs `yt-dlp` and `ffmpeg`).
- **Movies on Demand** (`movies` in `content.json`) lists English films by genre (Action, Kids,
  Comedy). Each film has a 16:9 `thumbnail` for the list, a 2:3 `poster` for the details page, its
  year, running time, age rating, cast and description, and two videos:
  - `trailer` (PLAY TRAILER): the official trailer.
  - `video` (WATCH MOVIE): an official scene from the film (the first 3 minutes), standing in for
    the full movie. For real films, point it at the movie file instead (any `.mp4`, plus a `.jpg`
    of the same name shown while it loads).

  Re-download the videos with `python3 scripts/fetch-movie-videos.py` (needs `yt-dlp` and `ffmpeg`).
  Artwork is from [TMDB](https://www.themoviedb.org). The player shows a progress bar.
  OK pauses and resumes, Left/Right skip 10 s, and Back stops. When the video ends, it returns to
  the film's details. The hint bar at the bottom shows which remote buttons do what.
- **Music**, both by Kevin MacLeod ([incompetech.com](https://incompetech.com)), licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): "Lobby Time" on the home screen
  (`home.music` in `content.json`) and "Island Meet and Greet" on the welcome video
  (`assets/video/welcome-resort.mp4`, footage from free stock video on YouTube).
- **Photos** of the home slider, About Us, Accommodation and Belle Amie Bistro are
  from Wikimedia Commons, cropped to 1920×1080 (files in `assets/img/`):
  - Basile Morin, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), Amantaka hotel,
    Luang Prabang: `home-lobby.jpg`, `home-entrance-dusk.jpg`, `about-lobby.jpg`,
    `deluxe-room.jpg`, `bistro-dining.jpg`
  - Alexandre Hadrien Denis Faux, CC0, "Sunset at Lagoon, Emboodhoo, Male, Maldives":
    `home-sunset-lagoon.jpg`
  - B166-er, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), "Maldives RBR
    beach": `home-pavilion-dusk.jpg`, `home-villas-night.jpg`
  - Dale Cruse, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), "Tropical Noir Chic
    Boutique Hotel Room in Lisbon": `superior-room.jpg`
  - Mrkunmee, CC BY-SA 4.0, "Princess Luxury Hotels - Bedroom": `executive-superior-room.jpg`
  - Cherryc032188, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), "Bridal Tea
    House Hotel - Modern Family Room": `family-suite.jpg`
  - Derek Jensen (Tysto), public domain, "Hotel suite living room": `premier-business-suite.jpg`
  - Bernd Schwabe, CC BY-SA 4.0, afternoon tea in Bristol: `bistro-afternoon-tea.jpg`
- **Belle Amie Bistro menu** (the bistro's QR code) is a sample PDF in `assets/docs/`, generated
  from `scripts/bistro-menu.html` (instructions at the top of that file).
- **Links** (website, social media) open a QR code popup to scan with a phone, as on the TV.
- Only one video plays at a time. All videos share a single player (`src/sound.ts`), which is what
  keeps sound working on iPhone/iPad after the first tap.

## Project structure

```
public/
  content.json        all text, menus, channels, movies, sections (generated from the hotel's CMS)
  assets/img/         images and icons referenced by content.json
  assets/video/       videos (720p) + .jpg poster frames shown while a video loads
scripts/
  fetch-channel-videos.py  downloads the per-channel demo clips from YouTube
  fetch-movie-videos.py    downloads the Movies on Demand trailers and scenes from YouTube
src/
  App.tsx             screen stack, 1920×1080 stage scaling, deep links, Back button
  remote.ts           keyboard "remote control" handling, shared app context
  drag.ts             swipe / drag / mouse-wheel scrolling
  sound.ts            shared video player, home music, volume and sound unlocking
  phone.ts            screen side of the phone remote (pairing id, incoming keys)
  phoneKeys.ts        phone remote protocol: buttons, brokers, topics
  phone-remote/       the phone remote page (entry: remote.html)
  screens/            Welcome, Home, Tv, Movies, About, Section (Accommodation, Bistro, …)
  components/         app bar, footer, QR code, details drawer, QR link dialog, video, start screen
  index.css           all styling
```

To change text or images, edit `public/content.json` (and add files under `public/assets/`).
