# Pizza Promo Pro sales site

This is a dependency-free static landing page. It is deliberately isolated from the Electron application.

## Preview locally

From this directory, run `python -m http.server 4173`, then open `http://localhost:4173`.

## Connect Square

Edit `site-config.js` to change the founding price, planned regular price, license-limit label, or full Square Payment Link URL. No other files need to change. The first-50 limit must also be enforced in the Square inventory or fulfillment workflow before sales open.

## Deploy

- Netlify: choose this `website` directory as the site base; `netlify.toml` supplies the publish and security-header configuration.
- Any static host: upload the contents of this directory as-is.

Before production launch, replace the placeholder checkout settings, add the canonical production URL to the metadata, and use final product screenshots or video if desired.
