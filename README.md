# Sathish Palanivelu Rajmohan, Portfolio

A modern, minimalist single-page portfolio site. Pure **HTML + CSS + vanilla JS**, no frameworks, no build step, no server. It drops straight onto AWS S3 static hosting.

It also ships with **Afterimage**, an original colour-memory game (memorise a colour, then recreate it from memory with HSL sliders, scored on perceptual ΔE distance), complete with a **"View source"** button that loads and syntax-highlights `game.js` in-browser.

## Files

```
website/
├── index.html       # Single-page site (7 sections)
├── styles.css       # Full design system + responsive rules
├── script.js        # Nav, scroll reveals, mobile menu, language map, code viewer
├── game.js          # "Afterimage" colour-memory game engine
├── game-src.js      # Auto-generated mirror of game.js (offline "View source" fallback)
├── build-source.js  # Regenerates game-src.js  ->  node build-source.js
├── assets/
│   ├── photo.jpg    # Hero portrait
│   └── resume.pdf   # <- add your résumé here (button links to it)
└── README.md
```

## Run locally

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

```bash
# or Node
npx serve .
```

The "View source" feature reads `game.js` over HTTP. It also has an offline fallback (`game-src.js`), so it works even if you open `index.html` straight from disk. If you edit `game.js`, regenerate the mirror with `node build-source.js`.

## Things to add before going live

- **`assets/resume.pdf`**: the "View full résumé" button links here. Drop the PDF in `assets/`.
- Confirm the **LinkedIn / GitHub URLs** in `index.html` (search for `github.com/sathishrajmohan` and the LinkedIn link).

## Deploy to AWS S3 (static website hosting)

1. **Create a bucket**, e.g. `sathish-portfolio`.
2. In **Properties → Static website hosting**, enable it and set the **index document** to `index.html`.
3. Under **Permissions**, turn off "Block all public access", then add this **bucket policy** (swap in your bucket name):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::sathish-portfolio/*"
       }
     ]
   }
   ```

4. **Upload** all files, preserving the folder structure (`index.html`, `styles.css`, `script.js`, `game.js`, and the `assets/` folder).

   ```bash
   aws s3 sync . s3://sathish-portfolio --exclude "README.md" --exclude ".git/*"
   ```

5. Visit the static site endpoint:
   `http://sathish-portfolio.s3-website.<region>.amazonaws.com`

> All asset paths are **relative**, so the site works from any bucket/sub-path. For a custom domain + HTTPS, front the bucket with CloudFront.

## Design notes

- **Type:** Playfair Display (headings) + Inter (body), via Google Fonts.
- **Palette:** off-white `#fafafa`, charcoal `#1a1a1a`, violet accent `#7c3aed`.
- **Motion:** Intersection Observer scroll reveals; respects `prefers-reduced-motion`.
- **Accessibility:** semantic landmarks, alt text, ARIA on the menu/modal, full keyboard support (Esc closes the code modal), labelled sliders.
