# cl0ax.github.io

My portfolio. Live at [cl0ax.github.io](https://cl0ax.github.io).

Static site, no build step: hand written HTML, one stylesheet plus a token
layer, and a single script with no dependencies. Mobile first, relative paths,
served straight off GitHub Pages from `main`.

The demo clips on each card are recordings of the actual software running, not
mockups. Each one starts when it scrolls into view and pauses when it leaves,
so a visitor never downloads or decodes four videos at once, and reduced motion
stops them entirely and exposes controls.

```
index.html          the page
css/tokens.css      every color, space and size value
css/styles.css      layout and components
js/main.js          clip playback, copy to clipboard, hero canvas
img/                demo recordings and their poster frames
```
