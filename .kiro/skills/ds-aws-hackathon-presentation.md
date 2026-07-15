---
name: ds-aws-hackathon-presentation
description: Guide a hackathon team through creating their DS AWS Hackathon presentation. Use when the user asks to run the Kiro presentation skill, create a hackathon presentation, or generate their DS AWS Hackathon output. The skill reads their project folder, interviews them with multiple-choice questions (never open-ended), then produces a 3-slide TecAlliance-branded HTML presentation and a Confluence subpage under the "DS AWS Hackathon — Team Presentations" parent page. Every question offers 1-3 concrete options + option 4 to enter their own answer, minimizing typing.
---

# DS AWS Hackathon Presentation Skill

You are helping a hackathon team produce their presentation. The user is likely non-technical, tired, and running the skill for the first time. **Your job is to minimize their effort.**

## Cardinal Rules

1. **Never ask open-ended questions.** Every question gives 1-3 concrete options + option 4 = "enter yourself". Generate options from the project (README, folder name, git log, results files) so option 1 is almost always right.
2. **Combined answers are allowed.** The user can type `1+2` or `1+3` to combine multiple options. When they do, merge the option texts sensibly (join with `. ` or ` — ` depending on what makes sense). Always mention `(you can combine, e.g. "1+2")` on the first question, and repeat the hint if the user seems to struggle.
3. **One question at a time.** Wait for the answer before asking the next.
4. **Announce what you're doing before each tool call with visible side effects.** Before calling Confluence MCP tools, before writing files, before writing the cache — say what you're about to do and where. Example: *"Now creating your Confluence page under the DS AWS Hackathon parent (https://tecalliance.atlassian.net/wiki/spaces/AIFOMO/pages/2298970519). Calling the Confluence MCP now."* This is important because tool approvals interrupt the flow — the user should know what they're approving.
5. **Cache early, cache often.** Save team name + team members to the cache **as soon as they're answered** (right after Q2), not at the end. If the user aborts, the next run still has their team info.
6. **Two outputs only:** an HTML presentation file, and a Confluence subpage. No email, no other artifacts.
7. **Stay in TecAlliance corporate design.** Colors, fonts, logo all specified below — do not improvise.

---

## Full Flow

### Step 0 — Confluence check (silent unless broken)

Verify the Confluence MCP is available and can access the AIFOMO space. Try a light call like getting the parent page metadata:

- Parent page ID: `2298970519`
- Space: AIFOMO (ID `1952317534`)
- Cloud ID: `tecalliance.atlassian.net`

If it works → continue to Step 1 without saying anything.

If it fails (MCP missing, auth error, page not found) → ask:

> I can't reach Confluence right now. What would you like to do?
> 1. Fix the Confluence MCP setup and re-run this skill (recommended — your presentation will land in the right shared place)
> 2. Continue without Confluence — I'll save the results page as a local `results.html` file next to your presentation
>
> Enter 1 or 2:

If option 2 chosen, remember `confluence_disabled = true` for later.

### Step 1 — Greeting + project path

Say exactly this:

> Hi! I'll help you create your DS AWS Hackathon presentation.
>
> Please copy-paste the path to your project folder.

Wait for the path. Read the folder thoroughly:
- `README.md` (if any) — extract title, description, team names
- Folder structure (2 levels deep is enough)
- Any `results/`, `output/`, `metrics/` folders
- Git log author names (last 20 commits) via `git -C <path> log --format='%an' | sort -u`
- Any `TODO.md`, `NOTES.md`, `NEXT.md`

Build a mental summary. Don't show it to the user.

### Step 2 — Load cache

Read `~/.kiro/skills/ds-aws-hackathon-presentation/.cache.json` if it exists.

Expected format:

```json
{
  "team_name": "Team Aussie",
  "team_members": ["Alice", "Bob", "Charlie"],
  "history": [
    {
      "timestamp": "2026-07-14T09:00:00Z",
      "project_path": "/home/buch/repos/test-project",
      "summary": "...",
      "presenter": "Alice",
      "followups": { "...": "..." }
    }
  ]
}
```

If the file doesn't exist, treat cache as empty.

### Step 3 — Interview

Ask each question below, one at a time. Every question has options + option 4 = enter yourself. Generate the specific options from cache + project data.

#### Q1 — Team name

Options (in order of preference):
1. Cached team name (if present)
2. Team name inferred from README title (if it looks like a team name, not just the project title)
3. The project folder's base name, title-cased

Example:
> **What is your team name?**
> 1. Team Aussie (from cache)
> 2. Invoice Ninjas (from your README)
> 3. Test Project (from folder name)
> 4. Enter yourself
>
> *(You can combine options like "1+2" if two of them together are right.)*

Never fewer than 2 options. If nothing to suggest, still give 1-2 plausible guesses.

#### Q2 — Team members

Options:
1. Cached members (if present)
2. Git author names (deduped)
3. Names extracted from README credits/authors section (if any)

Example:
> **Who is on your team? (comma-separated names)**
> 1. Alice, Bob, Charlie (from cache)
> 2. Alice, Bob (from git commit history)
> 3. Enter yourself

**Immediately after this answer**, write the cache to disk with the current team name and members. Announce it briefly: *"Saving team info to cache so you don't have to re-enter it next time."* Then continue.

#### Q3 — Presenter

Options: each team member from Q2 answer, listed individually + custom.

> **Who is presenting to the other teams?**
> 1. Alice
> 2. Bob
> 3. Charlie
> 4. Enter yourself

#### Q4 — One-sentence summary

Read the README description carefully. Generate 2-3 concise summaries (~15 words each). If no README, invent from folder structure + scripts.

Example:
> **Describe what you built in one sentence:**
> 1. An S3-based invoice classifier that separates invoices from contracts using Bedrock.
> 2. A prototype using AWS Bedrock to auto-tag documents with 87% accuracy.
> 3. Enter yourself

#### Q5-Q8 — Project-driven follow-ups (max 4)

These are the substance for the slides. Look at what the project actually contains and ask targeted questions. Each has 1-3 options + enter yourself.

Categories to probe (pick the ones that fit the project):

**Challenge / problem** — always ask this one, in some form:
> **How would you describe the challenge you tackled?**
> 1. (specific option based on README/context)
> 2. (alternative framing)
> 3. Enter yourself

**Approach / method** — always ask:
> **What was your approach?**
> 1. (specific tools/method observed in the code)
> 2. (alternative framing)
> 3. Enter yourself

**Results** — ask if results/metrics found:
> I see a `results/accuracy.json` — how do you want to describe your result?
> 1. Best model reached 87% accuracy on the validation set.
> 2. Improved baseline by 12 percentage points.
> 3. Skip results.
> 4. Enter yourself

**Next steps** — always ask, options tuned to project:
> **What would you do with 2 more days?**
> 1. (from TODO.md if present)
> 2. (plausible extension based on project)
> 3. Enter yourself

**Cached hints (deprecated but useful)** — if the same team ran the skill before on a different project, offer their old answers as one of the options, labeled "(from your previous run — may not apply)". Always include but never as option 1.

Aim for ~4 total follow-ups. Stop once you have enough substance for both content slides (challenge + approach + results + next steps).

### Step 4 — Save location

Generate 3 options + custom:

> **Where should the presentation be saved?**
> 1. Inside your project: `{project_path}/presentation.html`
> 2. One level up: `{parent_dir}/{team-name-slug}-presentation.html`
> 3. On your desktop: `~/Desktop/{team-name-slug}-presentation.html` (or `~/{team-name-slug}-presentation.html` if no Desktop)
> 4. Enter yourself

Slugify team name: lowercase, spaces → hyphens, strip non-alphanumeric.

### Step 5 — Generate

**Announce each action before doing it.** The user has to approve tool calls; they should know what they're approving.

**5a. Generate the HTML presentation** using the template below.

Before writing: *"Writing your presentation HTML to `{path}`."*

Write it to the chosen path.

**5b. Handle Confluence:**

Before any Confluence call, say: *"Now creating your Confluence page under the DS AWS Hackathon parent page: https://tecalliance.atlassian.net/wiki/spaces/AIFOMO/pages/2298970519. First checking existing subpages to avoid duplicate titles, then creating."*

- If `confluence_disabled`, write the same content as a local `results.html` next to the presentation instead. Announce: *"Confluence is disabled — writing a local `results.html` instead."*
- Otherwise, first check for existing subpages under parent `2298970519`. Use `getConfluencePageDescendants` with `pageId: "2298970519"` and inspect titles. If a page with the exact team name exists, use `{team_name} v2`, then `v3`, etc.

Then call `createConfluencePage` with:
- `cloudId`: `tecalliance.atlassian.net`
- `spaceId`: `1952317534`
- `parentId`: `2298970519`
- `title`: the (possibly versioned) team name
- `contentFormat`: `html`
- `body`: use the Confluence template below

**5c. Append this run to the cache history.** Before writing, say: *"Adding this run to the cache history so future runs can suggest your previous answers."*

Update `~/.kiro/skills/ds-aws-hackathon-presentation/.cache.json`:
- Keep `team_name` and `team_members` as they were (already saved after Q2).
- Append this run's summary + presenter + all followup answers to `history` (keep last 10 entries).

### Step 6 — Show results + feedback loop

Print:

> ✅ Done! Here are your outputs:
>
> **Presentation:** `/path/to/presentation.html`
> Open it in a browser. Use arrow keys or click to advance slides.
>
> **Confluence page:** https://tecalliance.atlassian.net/wiki/spaces/AIFOMO/pages/{new_page_id}
> (or: **Local results page:** `/path/to/results.html` if Confluence was disabled)
>
> **Are you happy with the presentation?**
> 1. Yes, all good.
> 2. No, I want changes.

If Yes → say `Good luck presenting! 🚀` and stop.

If No → ask:
> **What would you like to change?**
> 1. Change slide 2 (Challenge & Approach)
> 2. Change slide 3 (Results & Next Steps)
> 3. Change slide 1 (Team header)
> 4. Change the Confluence page content
> 5. Something else — describe it

Then ask a targeted follow-up (multiple choice as always) to gather the specific change, regenerate the affected artifact, and loop back to Step 6. No maximum iterations — the presenter decides when they're done.

---

## HTML Presentation Template

Use this as the exact template. Substitute the `{placeholder}` values. Do not add or remove sections. Do not change the CSS colors, fonts, or layout without a specific reason from the feedback loop.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{TEAM_NAME} — DS AWS Hackathon</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --orange: #FC8500;
    --slate: #4A5366;
    --deep-slate: #343B49;
    --gray: #848C99;
    --text: #2E2E2E;
    --bg: #FFFFFF;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: "Inter", sans-serif;
    overflow: hidden;
  }
  body { height: 100vh; width: 100vw; }
  .slide {
    position: absolute;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    padding: 6vh 8vw 6vh 10vw;
    display: none;
    flex-direction: column;
    justify-content: center;
  }
  .slide.active { display: flex; }

  /* Left stripe */
  .stripe {
    position: absolute;
    top: 0; left: 0;
    width: 1.5vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .stripe > div { flex: 1; }
  .s-orange     { background: var(--orange); }
  .s-slate      { background: var(--slate); }
  .s-deep-slate { background: var(--deep-slate); }

  /* Icon top-right */
  .icon {
    position: absolute;
    top: 5vh;
    right: 5vw;
    width: 5vw;
    height: 5vw;
    min-width: 60px;
    min-height: 60px;
  }

  /* Footer + nav */
  .footer {
    position: absolute;
    bottom: 3vh;
    right: 5vw;
    font-family: "Inter", sans-serif;
    font-size: 1.1vw;
    color: var(--gray);
    letter-spacing: 0.05em;
  }
  .nav {
    position: absolute;
    bottom: 3vh;
    left: 10vw;
    font-family: "Inter", sans-serif;
    font-size: 1.1vw;
    color: var(--gray);
  }

  /* Accent underline (orange) */
  .accent {
    height: 0.7vh;
    background: var(--orange);
    margin: 2vh 0 3vh 0;
  }

  /* Slide 1 — Header */
  .slide-1 h1.team {
    font-family: "Barlow", sans-serif;
    font-weight: 700;
    font-size: 7vw;
    line-height: 1.02;
    color: var(--text);
    max-width: 82vw;
  }
  .slide-1 .accent { width: 15vw; }
  .slide-1 h2.topic {
    font-family: "Barlow", sans-serif;
    font-weight: 500;
    font-size: 2.6vw;
    color: var(--text);
    max-width: 78vw;
    line-height: 1.3;
    margin-bottom: 5vh;
  }
  .slide-1 .meta {
    display: flex;
    gap: 8vw;
    margin-top: 3vh;
  }
  .meta-label {
    font-family: "Inter", sans-serif;
    font-size: 1.1vw;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.8vh;
  }
  .meta-value {
    font-family: "Barlow", sans-serif;
    font-weight: 700;
    font-size: 1.9vw;
    color: var(--text);
  }

  /* Slides 2 & 3 — Content */
  .content-slide h1.title {
    font-family: "Barlow", sans-serif;
    font-weight: 700;
    font-size: 4.5vw;
    color: var(--text);
    margin-bottom: 0.5vh;
  }
  .content-slide .accent { width: 12vw; margin-bottom: 4vh; }
  .content-slide .section {
    margin-bottom: 3vh;
  }
  .content-slide .section-label {
    font-family: "Inter", sans-serif;
    font-size: 1.3vw;
    color: var(--orange);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 1vh;
  }
  .content-slide .section-body {
    font-family: "Inter", sans-serif;
    font-size: 2.1vw;
    color: var(--text);
    line-height: 1.4;
    max-width: 82vw;
  }
  .content-slide ul {
    list-style: none;
    padding-left: 0;
  }
  .content-slide ul li {
    font-family: "Inter", sans-serif;
    font-size: 1.9vw;
    color: var(--text);
    margin-bottom: 1.2vh;
    padding-left: 2.5vw;
    position: relative;
    line-height: 1.4;
  }
  .content-slide ul li::before {
    content: "▸";
    color: var(--orange);
    position: absolute;
    left: 0;
    font-weight: 700;
  }
</style>
</head>
<body>

  <!-- SLIDE 1: HEADER -->
  <div class="slide slide-1 active" id="slide-1">
    <div class="stripe">
      <div class="s-orange"></div>
      <div class="s-slate"></div>
      <div class="s-deep-slate"></div>
    </div>
    {ICON_SVG}
    <h1 class="team">{TEAM_NAME}</h1>
    <div class="accent"></div>
    <h2 class="topic">{TOPIC}</h2>
    <div class="meta">
      <div class="meta-block">
        <div class="meta-label">Team</div>
        <div class="meta-value">{TEAM_MEMBERS}</div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Presenter</div>
        <div class="meta-value">{PRESENTER}</div>
      </div>
    </div>
    <div class="footer">DS AWS Hackathon · tecalliance.net</div>
    <div class="nav">1 / 3</div>
  </div>

  <!-- SLIDE 2: CHALLENGE & APPROACH -->
  <div class="slide content-slide" id="slide-2">
    <div class="stripe">
      <div class="s-orange"></div>
      <div class="s-slate"></div>
      <div class="s-deep-slate"></div>
    </div>
    {ICON_SVG}
    <h1 class="title">Challenge &amp; Approach</h1>
    <div class="accent"></div>
    <div class="section">
      <div class="section-label">The Challenge</div>
      <div class="section-body">{CHALLENGE}</div>
    </div>
    <div class="section">
      <div class="section-label">Our Approach</div>
      <div class="section-body">{APPROACH}</div>
    </div>
    <div class="footer">DS AWS Hackathon · tecalliance.net</div>
    <div class="nav">2 / 3</div>
  </div>

  <!-- SLIDE 3: RESULTS & NEXT STEPS -->
  <div class="slide content-slide" id="slide-3">
    <div class="stripe">
      <div class="s-orange"></div>
      <div class="s-slate"></div>
      <div class="s-deep-slate"></div>
    </div>
    {ICON_SVG}
    <h1 class="title">Results &amp; Next Steps</h1>
    <div class="accent"></div>
    <div class="section">
      <div class="section-label">What Worked</div>
      <div class="section-body">{RESULTS}</div>
    </div>
    <div class="section">
      <div class="section-label">Next Steps</div>
      <div class="section-body">{NEXT_STEPS}</div>
    </div>
    <div class="footer">DS AWS Hackathon · tecalliance.net</div>
    <div class="nav">3 / 3</div>
  </div>

  <script>
    let current = 1;
    const total = 3;
    function show(n) {
      document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
      document.getElementById('slide-' + n).classList.add('active');
      current = n;
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        if (current < total) show(current + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (current > 1) show(current - 1);
      }
      if (e.key === 'Home') show(1);
      if (e.key === 'End') show(total);
    });
    document.addEventListener('click', function(e) {
      // Ignore clicks on the nav/footer area
      if (e.clientY > window.innerHeight * 0.9) return;
      if (current < total) show(current + 1);
      else show(1);
    });
  </script>
</body>
</html>
```

### Placeholder Substitution

- `{TEAM_NAME}` — team name (HTML-escaped)
- `{TOPIC}` — the one-sentence summary from Q4
- `{TEAM_MEMBERS}` — comma-separated names
- `{PRESENTER}` — presenter's name
- `{CHALLENGE}` — challenge answer (can include `<br>` for line breaks)
- `{APPROACH}` — approach answer
- `{RESULTS}` — results answer
- `{NEXT_STEPS}` — next steps answer (can use `<ul><li>...</li></ul>` for bullet points if 2+ items)
- `{ICON_SVG}` — the exact SVG below, inserted verbatim (three times, once per slide)

### TecAlliance Icon (inline SVG)

Insert this SVG verbatim wherever `{ICON_SVG}` appears in the template:

```html
<svg class="icon" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M124.891 0 169.991 0C175.518 0 179.999 4.4807 179.999 10.0079L179.999 55.108C179.999 60.6352 175.518 65.1159 169.991 65.1159L124.891 65.1159C119.364 65.1159 114.883 60.6352 114.883 55.108L114.883 10.0079C114.883 4.4807 119.364 0 124.891 0Z" fill="#FC8500" fill-rule="evenodd" clip-rule="evenodd"/><path d="M95.3574 9.51904 10.0079 9.51904C4.48069 9.51904 0 13.9994 0 19.5266L0 169.992C0 175.519 4.48069 180 10.0079 180L160.473 180C166.001 180 170.481 175.519 170.481 169.992L170.481 84.639C170.481 79.1118 166.001 74.6311 160.473 74.6311L115.373 74.6311C109.846 74.6311 105.365 70.1506 105.365 64.6232L105.365 19.5266C105.365 13.9994 100.885 9.51904 95.3574 9.51904Z" fill="#4A5366" fill-rule="evenodd" clip-rule="evenodd"/></svg>
```

---

## Confluence Page Template

Use this exact structure when calling `createConfluencePage` with `contentFormat: "html"`:

```html
<h1>{TEAM_NAME}</h1>
<p><em>{TOPIC}</em></p>

<h2>👥 Team</h2>
<p>{TEAM_MEMBERS}</p>

<h2>🎤 Presenter</h2>
<p>{PRESENTER}</p>

<h2>🎯 Challenge</h2>
<p>{CHALLENGE}</p>

<h2>💡 Approach</h2>
<p>{APPROACH}</p>

<h2>📊 Results</h2>
<p>{RESULTS}</p>

<h2>🚀 Next Steps</h2>
<p>{NEXT_STEPS}</p>

<hr/>
<p><em>Generated by the DS AWS Hackathon Kiro skill.</em></p>
```

If a section content has multiple items, use `<ul><li>...</li></ul>` inside the corresponding `<p>` container (or replace the `<p>` with `<ul>`).

---

## Cache File Format

`~/.kiro/skills/ds-aws-hackathon-presentation/.cache.json`:

```json
{
  "team_name": "Team Aussie",
  "team_members": ["Alice", "Bob", "Charlie"],
  "history": [
    {
      "timestamp": "2026-07-14T09:00:00Z",
      "project_path": "/home/buch/repos/test-project",
      "presenter": "Alice",
      "topic": "A document classifier prototype",
      "challenge": "...",
      "approach": "...",
      "results": "...",
      "next_steps": "..."
    }
  ]
}
```

Keep at most 10 history entries (drop oldest).

---

## Error Handling

- **Project path doesn't exist** → tell the user, ask them to paste again. Don't proceed with a wrong path.
- **No README, no git, empty project** → generate very generic options for questions but don't ask fewer questions. Fall back to placeholder-style options like "A working prototype for [task]".
- **Confluence API error mid-flow** → show the error, save the HTML anyway, offer to retry Confluence or continue without.
- **Cache file corrupt** → treat as empty, don't crash. Rewrite on save.

---

## Style Notes for the Assistant

- Speak briefly. No "Great question!" or "Absolutely!". Just ask the question.
- Never use hollow verbs (leverage, utilize, facilitate).
- When showing options, use exactly the format `1. option text` on its own line. Numbered list, no bullets.
- After receiving an option number, echo the choice back tersely: `Got it: {choice}` — then move to the next question.
- No emoji in prompts to the user (emoji in the generated Confluence page and slides is fine).

## Parsing Combined Answers

Users can type `1+2`, `2+3`, or even `1+2+3` to combine options. When they do:

- Read the text of each selected option.
- Merge them into a single coherent answer — join with `. ` (period + space) or ` — ` (em dash) depending on what reads better.
- Echo the merged result back: *"Got it: {merged text}"*
- Example: options are `1. Foo did X` and `2. Bar did Y` — combined answer `1+2` becomes `Foo did X. Bar did Y.`

Users can also type things like `1 and 3`, `1, 3`, or `1 & 3` — treat them the same as `1+3`. Be forgiving with the separator.

If the user types something ambiguous (e.g. `12` when there are only 4 options), ask them to clarify — don't guess.

## Pre-Action Announcements

Before every tool call that has side effects (Confluence page creation, file writes, cache writes), tell the user in one sentence what you're about to do and where. This gives them context when the approval prompt appears. Bad:

> Now creating the Confluence page.
> [immediately calls tool]

Good:

> I'll now create your Confluence page as a child of "DS AWS Hackathon — Team Presentations" (https://tecalliance.atlassian.net/wiki/spaces/AIFOMO/pages/2298970519). Checking for duplicate titles first.
> [calls tool]
