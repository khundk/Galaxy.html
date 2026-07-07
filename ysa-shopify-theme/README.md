# YSA Shopify Theme — ZIP Import Guide

Upload this theme to Shopify in one step.

## Step 1 — Get the ZIP file

### From GitHub (on your Mac)
1. Go to: https://github.com/khundk/Galaxy.html/tree/cursor/ysa-shopify-store-52d4
2. Download **`ysa-shopify-theme.zip`** from the `ysa-shopify-theme` folder  
   - Or download the whole repo ZIP and unzip — the theme folder is `ysa-shopify-theme/`

### Build the ZIP yourself (if needed)
```bash
cd ysa-shopify-theme
zip -r ../ysa-shopify-theme.zip .
```

The ZIP must contain `assets/`, `config/`, `layout/`, etc. at the **top level** — not inside another folder.

---

## Step 2 — Upload to Shopify

1. Log into **Shopify Admin**
2. Go to **Online Store → Themes**
3. Scroll down to **Theme library**
4. Click **Add theme** (or **Upload theme**)
5. Choose **Upload zip file**
6. Select **`ysa-shopify-theme.zip`**
7. Wait for the upload to finish

---

## Step 3 — Preview and publish

1. After upload, click **Customize** on the new **YSA** theme
2. You should see the full YSA homepage
3. In the left sidebar, configure:
   - Hero image and text
   - Navigation menu (create **main-menu** under Online Store → Navigation)
   - Featured collection
   - Collection blocks (3 category tiles)
4. Click **Save**
5. When ready, click **Publish** (or **Actions → Publish**)

---

## What's included in the theme

| File | Purpose |
|------|---------|
| `sections/ysa-homepage.liquid` | Full YSA homepage (editable in Customize) |
| `assets/ysa-homepage.css` | All styles |
| `templates/index.json` | Homepage uses YSA section by default |
| `templates/product.json` | Simple product page |
| `templates/collection.json` | Product grid for collections |
| `templates/cart.json` | Cart page |
| `templates/page.json` | About, Contact, etc. |

---

## After importing

1. **Create navigation:** Online Store → Navigation → Main menu  
   Add Men, Women, New Arrivals, etc.
2. **Add products:** Products → Add product
3. **Create collections** and link them in the theme customizer
4. **Set homepage:** The YSA theme already uses the YSA homepage on index

---

## ZIP import vs Custom Liquid (what you did before)

| Method | Best for |
|--------|----------|
| **Custom Liquid** (already working) | Quick setup on your current theme |
| **ZIP theme upload** | Clean install, product/collection pages included, no double header |

If you already have YSA working via Custom Liquid, you don't need to upload the ZIP unless you want a dedicated theme with matching product pages.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Zip is invalid" | ZIP must have `layout/theme.liquid` at top level — re-zip the `ysa-shopify-theme` folder contents, not the parent folder |
| Theme uploads but homepage is blank | Customize → check YSA Homepage section is on the homepage |
| Menu links empty | Create **Main menu** under Navigation and assign it in section settings |
