# Esplora incremental modular-refactor plan

Status: proposed  
Repository snapshot: `baeea94` on `master`, inspected 2026-08-31  
Scope: client-side Cycle.js architecture, CSS organization, build/SSR compatibility,
and migration safety. This document proposes a sequence of small PRs; it does not
authorize behavior, copy, tooltip, or visual changes as part of mechanical moves.

## Executive decision

There is no single mandatory Cycle.js folder structure. The framework's relevant
standard patterns are:

1. Keep `main(sources) -> sinks` as a small composition root.
2. Split large programs using Model-View-Intent (MVI) where that division is useful.
3. Build larger programs from smaller dataflow components, which are themselves
   functions from sources to sinks.
4. Use `isolate()` when a child component owns driver interactions or state and
   needs a scope separate from siblings.
5. Put imperative I/O behind drivers so that the application graph stays testable
   and disposable.

Cycle's own MVI documentation emphasizes that Intent, Model, and View are convenient
function boundaries rather than rigid containers. Esplora should therefore migrate
by **vertical feature slices**, using MVI inside a feature when helpful, rather than
replace one large `app.js` with three large global `intent.js`, `model.js`, and
`view.js` files.

The target is not “everything is a Cycle component.” A pure calculation remains a
plain function. A related group of observable transformations can be a stream
factory. A feature should become a Cycle-shaped dataflow component only when it has
a meaningful source/sink boundary. This distinction keeps the refactor direct and
avoids abstractions created only to make the directory tree look modular.

References:

- Cycle.js MVI: <https://cycle.js.org/model-view-intent.html>
- Cycle.js components and isolation: <https://cycle.js.org/components.html>
- Cycle.js driver boundary: <https://cycle.js.org/drivers.html>
- Cycle.js state/onion architecture, for possible later use:
  <https://cycle.js.org/api/state.html>

## What the GitHub comment is asking for

The review comment was retrieved through GitHub's REST API endpoint
`GET /repos/Blockstream/esplora/pulls/comments/3545678321`:

- Discussion: <https://github.com/Blockstream/esplora/pull/633#discussion_r3545678321>
- API resource:
  <https://api.github.com/repos/Blockstream/esplora/pulls/comments/3545678321>
- File: `client/src/app.js`
- Comment: `app.js` is continuing to grow; plan a refactor that breaks it into
  modules and separates the logic.
- Concrete suggestion: move the dashboard difficulty height streams into a
  `createDashboardDifficultyStreams(latestBlock$, view$)` helper.

That suggestion is directionally correct. On the current branch, the relevant
streams are still inline in `app.js`, which is now 971 lines. The best first PR is
a small, pure feature-owned stream factory. It does not need `isolate()` yet because
it neither reads a driver directly nor has sibling DOM/HTTP scopes that could
collide.

I would make the dependency contract explicit rather than close over global
configuration:

```js
createDashboardDifficultyStreams({
  latestBlock$,
  view$,
  enabled: isBitcoinNetwork,
  period: difficultyPeriod,
})
```

It should return the three named streams proposed in the review. A later PR can
move the associated response-state and HTTP request streams behind the same feature
boundary after tests describe their full request/response contract.

## Current-state findings

### JavaScript and Cycle graph

- `client/src/app.js` is 971 lines and owns route intent, DOM intent, model state,
  HTTP request construction, navigation, rendering, storage, browser-only effects,
  debug subscriptions, and top-level composition.
- The file already has informal `User actions`, `Model`, and `Sinks` sections. The
  problem is therefore not an absence of MVI labels; it is that all features share
  one scope and one declaration chain.
- Declaration order is a hidden coupling because most of `main` is one
  comma-separated `const` chain. Moving a stream can accidentally reference a later
  declaration or change a subscription boundary.
- `state$` combines roughly fifty streams, each forced to start with `null`, into
  one global object. Any input emission creates a new state object and feeds the
  top-level renderer, including inputs unrelated to the current route.
- `req$` is one large merge of every feature's request policy. Request category
  strings couple request construction to response selection across distant parts
  of the file.
- Dashboard-only and Elements-only gates exist, which is good, but the conditions,
  polling triggers, replies, state, and requests are separated across the file.
- `dbg()` subscribes to many streams unconditionally. Those subscriptions exist
  even when the `debug` logger is disabled and are outside the sinks returned to
  Cycle's runner, so they can alter cold-stream execution and are not covered by
  normal sink disposal. This is especially worth auditing for repeated SSR runs.
- The browser-only block in `app.js` directly subscribes to streams and manipulates
  `document`, `window`, and `navigator`. It also installs global event listeners.
  This is the clearest violation of Cycle's driver boundary and makes cleanup,
  remounting, and isolated testing harder.
- The project has useful focused domain and rendering tests, but `test/app.test.js`
  has grown to 575 lines because polling and request behavior can only be exercised
  through the whole composition root.
- Other large units will need their own incremental decomposition plans:
  `components/transaction-block-grid.js` is 1,298 lines and
  `views/pending-block-details-card.js` is 750 lines. The canvas renderer already
  has an appropriate component boundary and explicit teardown; it should not be
  casually rewritten into streams merely to reduce line count.
- The RxJS compatibility setup imports an internal Cycle path
  (`@cycle/run/lib/adapt`) and relies on `rxjs-compat`. That is upgrade risk, but a
  framework/RxJS migration should be a separate program after module boundaries
  and characterization tests exist.

### CSS and build pipeline

- `www/style.css` is 6,025 lines. `flavors/liquid/extras.css` adds 394 lines; other
  flavor overrides range from 6 to 48 lines.
- Production copies `www/`, then appends each configured `CUSTOM_CSS` file to
  `dist/style.css`. Development independently reads `www/style.css` and the flavor
  files. RTL CSS is generated from the fully assembled stylesheet with CSSJanus.
- This load order is a public contract: base CSS, common chain CSS (for example
  `flavors/liquid/extras.css`), then network/deployment overrides. A split must
  preserve it exactly.
- CSS asset URLs currently resolve relative to the emitted root `style.css`.
  Serving fragments directly or changing them to runtime `@import` files could
  break URLs, add requests, and cause CSSJanus to miss imported content.
- The main stylesheet mixes fonts, reset rules, tokens, typography and spacing
  utilities, shell layout, reusable components, page-specific layouts, old rules,
  and recent feature sections.
- The cascade is carrying significant accidental complexity: 41 `!important`
  declarations in the base file, deep structural selectors, `nth-child` selectors,
  and overrides located far from their base rule.
- Responsive rules use many legacy breakpoints. Recent work consistently uses
  `max-width: 1328px`, but older areas use 450, 475, 485, 500, 550, 575.98, 767.98,
  790, 820, 825, 850, 990, 1080, and 1140px. They should be consolidated only while
  the owning component is being changed and visually verified.
- The large spacing utility block defines many classes that a static scan does not
  find in client JSX. Static analysis is not enough to delete them because classes
  may be dynamic or deployment-specific, but it is enough to require an inventory
  before carrying the entire block forward.
- There are currently invalid or suspicious declarations that a syntax-focused
  lint rule would catch, including `font-size: 12x` and a malformed `box-shadow`.
  These should be fixed in behavior-specific PRs, not silently during file moves.
- Some controls remove outlines without a nearby replacement. Accessibility review
  should accompany ownership changes for those components.
- Testnet flavor files duplicate substantial navigation/banner styling and encode
  visible environment labels in CSS `content`. Eventually this should be one
  configurable banner component, but changing it is behavior and must not be mixed
  into the mechanical CSS split.
- Liquid's file mixes theme tokens with asset-list component CSS. Theme overrides
  and Elements-only feature styles should become different inputs even though both
  are enabled by the Liquid flavor.

## Target architecture

### JavaScript ownership

The eventual directory shape should be close to this, introduced only as owners are
migrated:

```text
client/src/
  app.js                       # composition root only
  run-browser.js               # browser drivers and browser-only wiring
  run-server.js                # SSR drivers and completion policy
  features/
    dashboard/
      index.js                 # feature composition and public contract
      difficulty.js            # difficulty streams/requests/state
      pending-block.js         # pending-block orchestration
      peg.js                   # Elements dashboard orchestration
      market.js                # dashboard market orchestration
    blocks/
      index.js
    transaction/
      index.js
    address/
      index.js
    assets/
      index.js
    search/
      index.js
    shell/
      index.js                 # route/view/title/language shell
  components/                  # genuinely reusable presentation/visual boundaries
  views/                       # route/page layout; shrinks as slices gain ownership
  lib/                         # pure domain logic with explicit semantics
  driver/                      # all external effects
```

This is a destination map, not a request to create empty directories or placeholder
modules.

Each feature gets the smallest useful public API:

- Pure helper: values in, values out.
- Stream factory: named streams in, named streams out.
- Dataflow feature: feature-relevant sources in, Cycle sinks and a view-model stream
  out.
- Interactive reusable child: a Cycle dataflow component, isolated at the parent
  when its DOM, HTTP, or state scope can collide with siblings.

Rules for those APIs:

1. Pass configuration explicitly so tests can cover Bitcoin, Elements, browser,
   SSR, and timing behavior without mutating `process.env`.
2. Keep API field semantics and domain calculations in `lib/`; do not hide them in
   view or stream plumbing.
3. Keep request creation and matching response state in the same feature. Preserve
   request metadata such as heights, hashes, and route keys through the response.
4. Export only the feature boundary and independently testable pure helpers. Avoid
   broad barrel files that expose every internal stream.
5. Preserve existing request categories during mechanical moves. Rename or scope
   categories only in a later behavior PR with request-trace tests.
6. Do not adopt `@cycle/state` merely to claim onion architecture. Re-evaluate it
   after two or three features have explicit state boundaries; adopt only if lenses
   and reducer sinks simplify the real composition.
7. Do not use `isolate()` around HTTP until both the request sink and matching
   response source live inside the child. Partial HTTP isolation can make existing
   `HTTP.select(category)` calls stop seeing responses.

At the end, `app.js` should mainly instantiate shell and feature modules, merge
their sinks, select the active view model, and return the driver sinks. A practical
target is well under 200 lines, but clarity and ownership matter more than a line
count.

### CSS ownership

Keep a single emitted `style.css` and `style-rtl.css`, but assemble them from ordered
source fragments at build/dev-server time:

```text
www/css/
  manifest.json
  foundation/
    fonts.css
    tokens.css
    reset.css
    typography.css
    utilities.css
  layout/
    shell.css
    navigation.css
    footer.css
  components/
    buttons.css
    tables.css
    tooltip.css
    info-card.css
    block-grid.css
    ...
  pages/
    dashboard.css
    block.css
    transaction.css
    address.css
    mempool.css
    api-landing.css
    ...
  legacy/                      # temporary order-preserving migration slices
```

The manifest is the sole source of base-file order. Both `build.sh` and
`dev-server.js` must call one shared assembler rather than maintain two arrays.
The assembler must:

1. Concatenate base fragments in manifest order.
2. Append `CUSTOM_CSS` files in the existing environment-provided order.
3. Emit or serve the same `/style.css` URL.
4. Run CSSJanus over the entire assembled result for `/style-rtl.css`.
5. Keep URL resolution relative to the emitted root stylesheet.

Do not start with runtime `@import`, CSS Modules, hashed class names, cascade layers,
or a framework replacement. Semantic class names are also the deliberate interface
between Cycle's View and Intent, and flavor overrides depend on stable selectors.
Those tools may be revisited only after ownership and browser-support requirements
are explicit.

Final CSS ownership rules:

- Foundation contains global tokens and element defaults only.
- A reusable component owns its base, states, and compact `1328px` rules in one
  file.
- A page file owns composition/layout between components, not component internals.
- Flavor theme files override custom properties where possible.
- Feature availability styles (such as Elements asset tables) remain feature CSS,
  conditionally included by the flavor build.
- Deployment/network files contain the smallest possible true overrides.
- New selectors use stable component/section names and shallow specificity.
- Existing tooltip copy is never changed as a side effect of moving or renaming a
  component; any required copy change needs explicit approval.

## Incremental PR roadmap

Each numbered item is intended to be independently reviewable and releasable. Split
an item again if its diff stops being easy to reason about.

### PR 0 — Record CSS baselines and migration contracts

- Add a short tracked architecture decision document based on this plan.
- Record representative build commands and current output order for default,
  Bitcoin testnet/testnet4, Liquid mainnet, and Liquid testnet.
- Record checksums for the assembled default and representative flavored LTR and RTL
  stylesheets so later moves can prove that declaration text and order are unchanged.
- Add a small CSS validation command configured initially for parse errors and
  invalid values, with known existing findings explicitly baselined. Do not enable a
  large opinionated ruleset that forces a cleanup PR.

Acceptance: no runtime or generated-output change; all current tests and all
representative flavor builds pass.

### PR 1 — Establish the CSS assembly seam

- Add the manifest/shared assembler while `www/style.css` remains its only base
  input.
- Route both production builds and the dev server through it.
- Preserve base/flavor order and CSSJanus processing.
- Assert byte-for-byte equality for assembled LTR CSS where practical; otherwise
  normalize only the final newline and explain it.
- Compare RTL output for representative flavors.

Acceptance: generated CSS is equivalent before any stylesheet is split.

### PR 2 — Extract the footer as the first CSS-owned component

- Use the existing `views/footer.js` boundary as the first ownership proof.
- Move the terminal footer block at the end of `www/style.css` into
  `www/css/layout/footer.css` and append it through the manifest at the same exact
  position.
- Keep the declarations, selectors, media queries, and order unchanged. The final
  `.table-title-row` compact rule currently travels with this contiguous tail for
  the mechanical move; reassign it to its real owner in a later focused PR.
- Do not rename footer classes or alter its 790px/1328px behavior in this move.
- Verify the footer on Bitcoin and Liquid, in LTR and RTL, at regular and compact
  widths.

The footer is the safest first extraction because it already has a clear view owner,
its CSS is a contiguous tail of the stylesheet, and extracting that tail preserves
the cascade without splitting thousands of preceding legacy lines.

Acceptance: the assembled stylesheet remains byte-equivalent and footer rendering is
unchanged across the verification matrix.

### PR 3 — Extract one small reusable component stylesheet

- Use `StatusBadge` as the first reusable-component candidate. It has an existing
  component boundary and a largely contiguous base style block.
- First split the surrounding legacy stylesheet at the original location so the
  manifest can place `components/status-badge.css` without moving the rules later in
  the cascade.
- Move only the badge/dot rules owned by `components/status-badge.js`. Leave
  page-specific layout rules, such as a transaction-table override, with the page.
- If producing order-preserving before/after fragments makes the review too large,
  choose another contiguous tail extraction rather than accepting an unproven
  cascade reorder.

Acceptance: assembled output order is unchanged and badge variants render identically
on transaction, asset, peg, block-detail, and pending-block consumers.

### PR 4A–4N — Mechanically split CSS in cascade order

Each lettered slice is its own PR. Combine adjacent ownership areas when they can be
moved mechanically in one reviewable diff without changing cascade order. Split a
batch again when its rules are scattered, its verification matrix becomes too broad,
or it would mix a behavior change into the move. Planned sequence:

1. PR 4A (complete): fonts.
2. PR 4B (complete): tokens, with an order-preserving `legacy/pre-tokens.css` seam.
3. PR 4C: reset/base elements, typography, and the existing spacing utilities.
   Keep these as separate source files even though they move in one PR. Preserve
   uncertain utilities mechanically; inventory or delete them only in a later
   behavior-focused cleanup.
4. PR 4D: shell layout and navigation together. Split them only if responsive
   overrides cannot be moved without a large legacy before/after fragment.
5. PR 4E–4G: batch reusable components by adjacent cascade-safe families rather
   than requiring one PR per component—for example controls/forms, data-display
   components, and overlays/feedback. Decide exact batches from the source-order
   inventory before editing.
6. PR 4H–4K: batch page CSS by related route families when their source regions and
   smoke-test matrices overlap. Keep a standalone PR for a large or interleaved page.
7. PR 4L: split Liquid theme tokens and Elements asset-list feature CSS in one
   mechanical flavor-file PR while keeping them as separate output fragments.
8. PR 4M: network/deployment overrides.
9. PR 4N: reassign temporary legacy fragments and document any deliberately retained
   compatibility CSS. Deletion or selector cleanup remains a separate behavior PR.

During the mechanical pass, keep declaration text and order unchanged. If a rule
must move across another rule, fix a selector, consolidate a breakpoint, or change a
value, make that a follow-up behavior PR with screenshots. Temporary `legacy/`
fragments are acceptable and make cascade preservation reviewable.

Acceptance per PR: assembled CSS order is unchanged, all flavor builds pass, LTR and
RTL smoke checks pass, and the touched routes match at regular and compact widths.

### PR 5 — Implement the reviewer's initial difficulty extraction

- Add `features/dashboard/difficulty.js` (or, if the feature directory is judged
  premature, a clearly owned `lib/dashboard-difficulty.js`).
- Extract `dashboardLatestBlock$`, `dashboardEpochStartHeight$`, and
  `dashboardPreviousDifficultyHeight$` as one stream factory.
- Inject `enabled` and `period`; keep Bitcoin gating and epoch semantics identical.
- Add focused virtual-time tests for dashboard entry/exit, duplicate heights, epoch
  boundary, genesis/negative previous height, and Elements disabled behavior.
- Keep replies and HTTP requests in `app.js` in this first PR.

Acceptance: `app.js` wiring gets smaller; request traces are unchanged.

### PR 6 — Complete the dashboard difficulty feature

- Move the two comparison-block reply streams and the four associated HTTP request
  stages beside the extracted height streams.
- Return a narrow dashboard difficulty view model plus an `HTTP` sink.
- Preserve `requestedHeight` metadata and filter stale/mismatched responses.
- Keep formulas and formatting in the existing view/domain owner unless there is a
  demonstrated reuse boundary.
- Gate the complete feature for Bitcoin, not only its view.

Acceptance: focused tests cover request heights, request metadata, partial response
availability, stale replies, and zero/early-chain boundaries; Liquid emits no
difficulty requests.

### PR 7 — Make debug observation disposable and opt-in

- Stop `dbg()` from eagerly subscribing when its namespace is disabled.
- Ensure any enabled debug subscriptions are disposed with the app run, preferably
  through an explicit diagnostic sink/driver or a returned teardown contract.
- Add a test proving disabled diagnostics do not add subscriptions to a cold stream.
- Check repeated server renders for retained subscriptions.

Acceptance: no user-visible behavior change; diagnostics still work when explicitly
enabled.

### PR 8 — Extract shared shell intent without changing routes

- Move route parsing, language intent, title derivation, and top-level view selection
  into a shell feature with an explicit output contract.
- Preserve every route pattern, redirect shape, query behavior, SSR title, and
  loading/not-found transition.
- Keep DOM-specific feature intents with their feature rather than creating a new
  global DOM-intent file.

Acceptance: table-driven route tests cover every existing route in browser and SSR
shapes.

### PR 9 — Move browser effects behind drivers/components

Handle one effect family per PR if needed:

- clipboard writes;
- document language/direction and RTL stylesheet selection;
- scroll restoration and scroll-to-element;
- tooltip/menu global coordination and keyboard shortcuts.

Prefer declarative VNode state/hooks for local UI behavior. Use a small browser
effects driver for genuinely global effects. Every listener, timer, and subscription
must have a teardown path. Do not alter tooltip text while moving tooltip behavior.

Acceptance: `app.js` contains no direct `.subscribe()`, `document`, `window`, or
`navigator` use; SSR imports remain safe.

### PR 10A–10H — Extract remaining vertical features

Move one route family at a time. A reasonable risk order is:

1. push transaction;
2. search and height lookup;
3. address;
4. blocks/recent blocks;
5. transaction and outspends;
6. mempool/recent transactions;
7. asset and asset list;
8. remaining dashboard slices (market, high-value assets, peg, pending block).

For each feature, move together:

- its route/DOM intent;
- its request creation;
- its response reduction and loading/error/stale-data policy;
- its view-model assembly;
- its navigation/title outputs if any;
- focused tests currently living in `test/app.test.js`.

Keep page presentation in `views/` during the first extraction. Moving JSX at the
same time creates unnecessary diffs. Once ownership is stable, colocate a page view
only if doing so makes the feature contract clearer and does not turn reusable
components into page internals.

Acceptance per feature: the top-level request trace, route behavior, SSR result, and
rendered fallback states are unchanged.

### PR 11 — Replace the global render-state fan-in

- Give each route a narrow view-model stream.
- Select/switch to the active route's view model so unrelated feature emissions do
  not rebuild the active page state.
- Keep a small shell/SSR state stream for `view`, `loading`, `title`, and status.
- Make partial, unavailable, invalid, and stale data explicit instead of relying on
  blanket `startWith(null)` calls.
- Measure subscriptions and render emissions before and after; do not assume fewer
  lines imply less work.

Acceptance: same UI/SSR output with fewer unrelated active-view render emissions.

### PR 12 — Finish CSS ownership cleanup

After all rules have named owners:

- remove empty `legacy/` fragments;
- verify and delete unused utilities/selectors with runtime and flavor evidence;
- fix invalid declarations in focused PRs;
- reduce `!important` and deep structural selectors component by component;
- consolidate each substantially changed component to the regular layout plus the
  `max-width: 1328px` compact regime, retaining extra breakpoints only with a
  documented concrete need;
- replace duplicated CSS testnet banners with a configured semantic UI component;
- add visible focus styles before removing any `outline: none` rule.

Acceptance: every selector has an owner, the manifest has no legacy entries, flavor
overrides are small, and responsive/RTL visual coverage is green.

### PR 13 — Reassess framework and dependency modernization

Only after the graph is modular and covered:

- decide whether to remain on RxJS 6 compatibility or migrate operators/imports;
- replace the internal `@cycle/run/lib/adapt` import with a supported integration;
- evaluate direct dependencies for actual use (for example `jquery` appears unused
  by the inspected client source);
- evaluate `@cycle/state`/lenses for nested state based on the feature contracts now
  visible;
- upgrade Cycle packages in a dedicated compatibility PR, not during feature moves.

Acceptance: each dependency change has its own build, SSR, route, request, and
browser verification and can be reverted independently.

## PR sizing and review rules

- One ownership boundary or one behavior change per PR.
- Mechanical moves and behavior changes are separate commits at minimum and
  preferably separate PRs.
- Prefer PRs that a reviewer can validate from request traces and file order rather
  than trust from a broad visual inspection.
- Do not create placeholder abstraction layers or empty feature directories.
- Do not rename request categories, CSS classes, and files in the same PR.
- Preserve existing style in touched JS; do not run a repository-wide formatter.
- Preserve all tooltip copy unless exact replacement text receives explicit
  approval.
- Preserve Bitcoin/Elements gates, dashboard-only polling, request metadata, and
  domain field semantics in every move.
- When a formula moves, re-verify API field meaning, units, and boundary cases; a
  refactor is not evidence that a domain claim remains correct.
- If a PR reveals an existing bug, first add a failing characterization test, then
  fix it in a clearly labeled behavior PR instead of hiding it in the move.

Suggested soft limits, not hard policy:

- about 200–400 moved/edited lines for ordinary extraction PRs;
- one CSS component/page ownership area per PR;
- one route family per Cycle feature PR;
- no new generic helper until there is a second caller or an obvious shared
  responsibility.

## Verification matrix

Every code PR:

- `npm test`
- `npm run dist` for the relevant flavor set
- `git diff --check`
- browser and SSR route behavior for the touched feature
- request-category and timing assertions for polling/request changes
- Bitcoin and Elements coverage when the feature differs by network

Every CSS PR:

- default Bitcoin, Bitcoin testnet/testnet4, Liquid mainnet, and Liquid testnet build
- LTR and generated RTL stylesheets
- regular layout and compact layout at/below 1328px
- touched route at a narrow mobile width, even when no new breakpoint is added
- keyboard focus, reduced motion, long hashes/addresses, loading, empty, and error
  states when relevant
- flavor override order and asset URL checks

The long-term visual matrix should use deterministic fixture data, not live API
responses. Representative routes are dashboard, recent blocks, block, transaction,
address, mempool, asset list, and asset. Until that harness exists, each PR should
record the exact manual pages, networks, directions, and widths checked.

## Definition of done for the overall program

- `app.js` is a composition root rather than the owner of feature logic.
- Feature request, response, state, and intent policies are colocated behind narrow
  contracts.
- Direct application I/O is in drivers or lifecycle-aware visual components.
- Disabled diagnostics do not subscribe, and all active subscriptions/listeners can
  be disposed.
- The active view does not recompute from unrelated feature emissions.
- `www/style.css` source has been replaced by an ordered module manifest while the
  emitted `/style.css` and `/style-rtl.css` contracts remain intact.
- CSS source fragments have clear foundation/layout/component/page/flavor ownership and no
  temporary legacy bucket.
- Bitcoin, Elements, browser, SSR, LTR, and RTL behavior remain covered.
- No single completion PR is a “grand rewrite”; the final state is the accumulated
  result of independently safe, reviewable migrations.
