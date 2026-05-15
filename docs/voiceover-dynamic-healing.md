# Voiceover script — Dynamic healing (auto-discovery) showcase

**Test:** `tests/auto-heal-late-flow-demo.spec.ts`  
**Tag:** `@auto-heal-discovery-showcase`  
**Length:** ~90–120 seconds  
**On-screen badge:** Purple — `DYNAMIC HEALING (AUTO-DISCOVERY)`

---

## [0:00 – Login — silent]

*(Optional)*  
“Login is setup only. The dynamic healing demo starts on **Products**.”

---

## [Products page — purple badge + first toast]

“We’re on the **Products** catalog. This run is **dynamic healing** — also called **auto-heal discovery**.”

“Unlike static healing, we are **not** relying on a long fallback list for this click. We use **one intentional bad locator**, then let the engine **discover** a working one from the live DOM.”

---

## [Warn toast — broken locator]

“Again, the miss is **deliberate**: `button[data-demo-miss-add="1"]`.”

“That models real life: the developer’s selector no longer matches after a release — renamed attribute, new component, different structure.”

---

## [Action — click with discovery]

“When the static path is exhausted, **auto-heal turns on**.”

“The engine inspects the page — button roles, text like ‘Add to cart’, submit patterns — scores candidates, and **picks the best match on the current DOM**.”

“You should see the real **Add to cart** control get clicked even though the original selector was wrong.”

---

## [Warn toast — auto-discovery]

“The toast shows **dynamic healing**: broken locator, failed attempts, then recovery via **auto-generated strategy** — names like `autogen-role-1` with a score and reason.”

---

## [Green toast — healing details]

“Healing details include the **discovered locator** — often a **role + name** or **CSS query** — not something we hard-coded before the run.”

“The Playwright report attachment **`auto-heal-live-proof`** captures the full attempt trail for review.”

---

## [Navigate to Cart]

“We go to **Cart** to verify the flow continued after discovery — same user journey, no manual script change mid-run.”

---

## [Close]

“**Dynamic healing** helps when the UI changes in ways you didn’t predict. Static fallbacks handle known patterns; **discovery** handles the unknown — at the cost of more runtime logic and evidence you should review in CI.”

---

## Static vs dynamic (closing contrast)

| | **Static** | **Dynamic** |
|---|------------|-------------|
| **Intentional miss** | `data-demo-static-miss-add` | `data-demo-miss-add` |
| **Recovery** | Next locator **in code** | Locator **found on page** |
| **Badge** | Blue — STATIC | Purple — DYNAMIC |
| **Auto-discovery** | Off | On |

---

## Technical reference

| Item | Value |
|------|--------|
| Broken locator | `button[data-demo-miss-add="1"]` |
| Static strategies for this step | One decoy only (`add-to-cart-miss-demo`) |
| Auto-discovery | **On** (`autoHeal.enabled: true`, `discoverOnly: true`) |
| Report attachment | `auto-heal-live-proof` |
