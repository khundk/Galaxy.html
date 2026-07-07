# YSA — Shopify Clothing Store

A Polo Ralph Lauren–inspired clothing storefront for **YSA**, ready to paste into Shopify.

## What's Included

| File | Purpose |
|------|---------|
| `ysa-homepage.html` | **Copy-paste ready** — full homepage in one file |
| `sections/ysa-homepage.liquid` | Native Shopify 2.0 theme section (dynamic products) |
| `assets/ysa-homepage.css` | Stylesheet for the Liquid section |

## Design

- **Palette:** Navy, burgundy, cream, gold accents
- **Typography:** Cormorant Garamond (serif) + Jost (sans)
- **Feel:** Classic American preppy / luxury sportswear
- **Sections:** Hero, collections, featured products, brand story, lifestyle banner, values, newsletter, footer
- **Responsive:** Mobile menu and layouts included

---

## Option 1: Quick Paste (Easiest)

Best if you want the full page live in minutes without editing theme code.

1. Open `ysa-homepage.html` and copy **everything** (Ctrl+A → Ctrl+C)
2. In Shopify admin: **Online Store → Pages → Add page**
3. Title the page **Home** (or your preference)
4. Click the **Show HTML** button (`<>`) in the page editor
5. Paste the entire contents
6. Save the page
7. Go to **Online Store → Themes → Customize**
8. Set this page as your homepage, or link to it from your navigation

> **Tip:** Hide your theme's default header/footer on this template if they clash — use a blank page template if your theme offers one.

---

## Option 2: Custom Liquid Block

Use this to add the store as a section on any page.

1. **Online Store → Themes → Customize**
2. Navigate to the page you want
3. **Add section → Custom Liquid**
4. Paste the full contents of `ysa-homepage.html`
5. Save

---

## Option 3: Full Theme Integration (Recommended for Production)

This connects real Shopify products, collections, and menus.

1. In Shopify admin: **Online Store → Themes → Edit code**
2. Upload files:
   - `assets/ysa-homepage.css` → **Assets** folder
   - `sections/ysa-homepage.liquid` → **Sections** folder
3. **Customize** your theme → **Add section → YSA Homepage**
4. Configure in the sidebar:
   - Upload your logo
   - Set hero image and text
   - Pick your navigation menu
   - Select a featured collection for products
   - Add 3 collection blocks for category tiles

---

## Customization Checklist

### Links to Update
Replace placeholder URLs with your real Shopify handles:

- `/collections/men` → your Men's collection
- `/collections/women` → your Women's collection
- `/collections/polos` → Polo Shirts collection
- `/products/classic-pique-polo` → your product URLs

### Images
Replace Unsplash placeholder URLs with your own product/lifestyle photos uploaded to **Settings → Files** in Shopify, then paste the CDN URLs.

### Products
In the HTML version, edit product names, prices, and image URLs manually. In the Liquid version, products pull automatically from your chosen collection.

### Newsletter
The HTML form posts to Shopify's customer contact endpoint. For advanced email marketing, swap the form with a Klaviyo or Mailchimp embed.

### Social Links
Update Instagram, Facebook, and Pinterest URLs in the footer.

---

## Collections to Create in Shopify

For the site to work end-to-end, create these collections (names can vary — just update the links):

- Men
- Women
- New Arrivals
- Polo Shirts
- Outerwear
- Accessories
- Sale

---

## Pages to Create

- About (`/pages/about`)
- Contact (`/pages/contact`)
- Shipping & Returns (`/pages/shipping`)
- Size Guide (`/pages/size-guide`)
- FAQ (`/pages/faq`)

---

## Preview Locally

Open `ysa-homepage.html` in any browser to preview the design before pasting into Shopify.

```bash
# If you have Python installed:
python3 -m http.server 8080 --directory shopify
# Then visit http://localhost:8080/ysa-homepage.html
```

---

## Brand Colors (CSS Variables)

```css
--ysa-navy: #0c1a2e;
--ysa-burgundy: #6b1c2e;
--ysa-cream: #f7f3eb;
--ysa-gold: #b8956c;
```

Use these when creating matching product photos, logos, or marketing materials.
