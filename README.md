# GTA Spoiler Blocker

A Chrome extension that hides GTA-related content on YouTube. It is built for people who want to avoid GTA 6 spoilers until they can play, and it is intentionally strict: it would rather hide too much than let a spoiler through.

> **This is a vibecoded project.** It was built iteratively with AI assistance and manual testing. The code is dependency-free and small enough to audit, but treat it as a personal tool, not production software.

## Features

- Hides GTA-related videos, channels, playlists, Shorts, posts, comments, notifications, search suggestions, chips, knowledge panels, live chat messages, and ads.
- Blocks matching video and Shorts pages with a full-page overlay.
- Includes a **View anyway** escape hatch for the current page.
- Pre-hides candidate elements before they are scanned to reduce spoiler flashes.
- Handles YouTube's single-page navigation.
- Works in the main YouTube page and the live chat iframe.
- Uses only local matching: no network requests, no analytics, no remote code.

## Default scope

The recommended **All GTA** mode hides:

- GTA 6 / GTA VI
- GTA V / GTA 5 / GTA Online
- Grand Theft Auto, Vice City, Leonida
- Rockstar Games and Take-Two
- GTA 6 character and location names
- Standalone "Rockstar", "Lucia", and "Jason" mentions

The last group is enabled by default because it is high-risk. It also creates more false positives, such as unrelated videos about a topic named "Rockstar", "Lucia", or "Jason".

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome, Edge, Brave, or another Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Open YouTube and reload any open YouTube tabs.

There is no build step and no dependency installation required for the extension itself.

## Usage

- Click the extension icon to open the popup.
- Use the toggle to enable or disable filtering.
- **Rescan** forces a fresh scan of the current page.
- **Reveal current video** appears when a video page is blocked and the escape hatch is enabled.
- Open **Options** to change the scope, choose which surfaces to filter, add custom terms, or turn off the escape hatch.

## Options

| Setting | Description |
| --- | --- |
| Enable filter | Turns filtering on or off globally. |
| Blocking mode | **All GTA** (default), **GTA 6 only**, or **GTA 6 + GTA Online**. |
| Video page | Blocks matching video pages and Shorts with an overlay. |
| Shorts | Hides matching Shorts cards. |
| Comments | Hides matching comments. |
| Notifications | Hides matching notification entries. |
| Search suggestions | Hides matching autocomplete suggestions. |
| YouTube chips and filters | Hides matching filter chips. |
| High-risk terms | Includes standalone "Rockstar", "Lucia", and "Jason" by default. |
| Escape hatch | Shows the **View anyway** button on blocked video pages. |
| Custom terms | Adds user-defined terms to every mode, one per line. |

Settings are stored with `chrome.storage.sync` and apply to open YouTube tabs automatically.

## How detection works

The content script scans YouTube elements and their text, labels, titles, and alt attributes. Before matching, text is normalized to catch common evasions:

- Case and accent differences
- Dots, spaces, and separators (`G.T.A. 6`, `G T A VI`)
- Roman numerals (`GTA VI`)
- Fullwidth characters
- Invisible characters
- Basic leet substitutions (`G7A 6`)
- Cyrillic `ГТА`

A `MutationObserver` handles new content, and a periodic sweep catches elements that YouTube updates in place. Candidate elements are hidden by CSS until they have been scanned, so they do not flash on screen first.

## Limitations

- **No OCR.** Text baked into thumbnails is not detected.
- **Strict by design.** Generic names such as "Rockstar", "Lucia", and "Jason" can hide unrelated content.
- **YouTube changes often.** DOM selectors may need updates when YouTube ships a new interface.
- **Desktop only.** The extension targets desktop YouTube, not the mobile site or native apps.
- **Not a security boundary.** It is a convenience filter, not a guarantee that every spoiler will be blocked.

## Privacy

Everything runs locally in the browser. The extension does not collect data, make network requests, or send browsing activity anywhere. Settings are stored using Chrome's sync storage, subject to your browser's sync settings.

## Development

Requirements: Node.js 20 or newer for the test runner.

```bash
npm test
npm run check
```

- `npm test` runs the matcher unit tests.
- `npm run check` runs syntax checks on the JavaScript files.

The project has no runtime dependencies and no build step.

## Project structure

```text
.
├── LICENSE
├── README.md
├── manifest.json
├── package.json
├── src
│   ├── content.css
│   ├── content.js
│   ├── keywords.js
│   ├── matcher.js
│   ├── options.css
│   ├── options.html
│   ├── options.js
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
└── tests
    └── matcher.test.js
```

## Disclaimer

This is an unofficial fan-made tool. It is not affiliated with Rockstar Games, Take-Two Interactive, YouTube, or Google. GTA and related marks belong to their respective owners.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
