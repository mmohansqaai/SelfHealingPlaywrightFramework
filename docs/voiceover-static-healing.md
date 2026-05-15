# Voiceover script — Static healing showcase

**Test:** `tests/static-healing-showcase.spec.ts`  
**Tag:** `@static-healing-showcase`  
**Length:** ~90–120 seconds  
**On-screen badge:** Blue — `STATIC HEALING`

---

## [0:00 – Login — silent]

*(Optional one line)*  
“We log in first so the test runs as a real customer session. No healing demo happens on this screen.”

---

## [Products page — blue badge + first toast]

“Now we’re on the **Products** page. This run is **static healing**.”

“In static healing, we define an **ordered list of locators** in code — primary first, then fallbacks. **Auto-discovery is turned off.** The engine only uses what we already wrote.”

---

## [Warn toast — broken locator]

“For this demo we **intentionally break** the first locator.”

“The test tries `button[data-demo-static-miss-add="1"]`. That selector **does not exist** on the page — on purpose. It simulates a stale or wrong selector after a UI change.”

---

## [Action — click Add to cart]

“Watch the product card. Playwright attempts the broken locator, it fails, then the framework moves to the **next predefined strategy** in the chain.”

“Typical fallbacks here are: **role button ‘Add to cart’**, then **‘Add item’**, then a **CSS class on the card button**.”

“The **first strategy that works** completes the click. No new locator is invented — we only use the list we maintain in the test.”

---

## [Warn toast — static fallback]

“The overlay confirms: recovery came from a **static fallback**, not auto-discovery. You’ll see which strategy name won — for example `role-button-Add-to-cart`.”

---

## [Green toast — healing details]

“Healing details show the **broken locator** and the **strategy that succeeded**. The HTML report also records every attempt — pass or fail — for audit.”

---

## [Navigate to Cart]

“Finally we open the **Cart** page. That proves the healed click actually worked — we didn’t just pass a locator check; the business action completed.”

---

## [Close]

“**Static healing** is best when you already know good alternate selectors — labels, roles, CSS — and you want predictable, fast recovery without generating new locators at runtime.”

---

## Technical reference

| Item | Value |
|------|--------|
| Broken locator | `button[data-demo-static-miss-add="1"]` |
| Fallback chain | `role-button-Add-to-cart` → `role-button-Add-item` → `card-primary-button` |
| Auto-discovery | **Off** (`autoHeal: { enabled: false }`) |
| Report attachment | `{label}-healing` (e.g. `add-to-cart-static-healing`) |
