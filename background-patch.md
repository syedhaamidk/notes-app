# Warm background patch

In your `app/globals.css` or wherever `--bg` is defined for dark mode,
change the background from `#0e0d0b` to `#0F0E0C`:

```css
[data-theme="dark"] {
  --bg: #0F0E0C;   /* was #0e0d0b — warmer dark, matches serif writing feel */
}
```

Or if you're using a Tailwind dark class:
```css
.dark {
  --bg: #0F0E0C;
}
```

That's the only change needed for the warmer background tone.
