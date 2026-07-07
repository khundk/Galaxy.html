# YSA — Fix: Preview Not Showing on Shopify

If you pasted into **Pages** and see a blank page, only your theme, or unstyled text — this is normal. **Shopify strips `<style>` and `<script>` from Pages** for security.

**Use Custom Liquid instead.** It works reliably.

---

## Fix in 5 minutes (Custom Liquid)

### Step 1 — Copy the file
1. Open `shopify/ysa-homepage.html` on your Mac
2. **Cmd + A** → **Cmd + C** (copy everything)

### Step 2 — Open Theme Customizer
1. Shopify Admin → **Online Store**
2. Click **Themes**
3. On your current theme, click **Customize**

### Step 3 — Go to your homepage
1. At the top center, use the dropdown to pick **Home page**
   - If you don't have one yet, pick any page — you can change it later

### Step 4 — Remove empty sections (optional)
1. Click any default sections you don't want (e.g. empty image banner)
2. Click **Remove section** or the trash icon
   - Skip this if you're unsure — you can clean up later

### Step 5 — Add Custom Liquid
1. Click **Add section** (or **Add block** depending on your theme)
2. Scroll down and choose **Custom Liquid**
   - Sometimes called **Custom HTML** or **Liquid/HTML**

### Step 6 — Paste
1. In the **Liquid code** box on the left sidebar, click inside
2. **Cmd + V** to paste the full file
3. Wait a few seconds for the preview to load on the right

### Step 7 — Save
1. Click **Save** (top right)

You should now see the full YSA design in the preview.

---

## Set it as your real homepage

1. **Online Store → Preferences**
2. **Homepage** → choose the page you're customizing (usually **Home**)
3. **Save**

Or in **Customize**, make sure you're editing the template assigned to your homepage.

---

## Still not showing?

| What you see | What to do |
|--------------|------------|
| **Blank white page** | Make sure you used **Custom Liquid**, not Pages. Re-paste and Save. |
| **Only theme header/footer, no YSA** | The section may be below the fold — scroll down in preview. Or remove other sections above it. |
| **Raw code as text** | You're in the wrong editor. Use **Custom Liquid** in Customize, not the normal page text editor. |
| **"Timeless Style" shows but ugly/no colors** | Styles were stripped — you used Pages. Switch to **Custom Liquid**. |
| **Preview spinner forever** | File may be too large for your connection. Try again, or use Method 3 (theme files). |

---

## Why Pages doesn't work

Shopify's **Pages** editor uses a sanitizer that removes:
- `<style>` tags (all your design CSS)
- `<script>` tags (mobile menu)
- Some external resources

**Custom Liquid** in the theme editor does **not** strip these — that's why it works.

---

## Need help?

Tell me exactly what you see:
- "Blank page"
- "I see my theme but not YSA"
- "I see text but no styling"
- "I can't find Custom Liquid"

And which step you're on.
