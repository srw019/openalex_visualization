# OpenAlex Research Explorer

This project is an interactive React app that explores research areas and authors using OpenAlex data.

It starts from a circle-packing view of Physical Sciences, then lets you drill down into subfields, and finally explore authors in two views:
- Institution author network
- Author scatter plot (works vs citations)

## What this app does

1. Loads Physical Sciences data from OpenAlex.
2. Builds a hierarchy: Domain -> Field -> Subfield.
3. Renders a Circle Pack so users can click deeper into topics.
4. On subfield click, loads author/work data for that subfield.
5. Shows author insights in Network and Scatter tabs.

## Tech stack

- React (UI)
- Vite (build/dev server)
- D3.js (visualization and force layout)
- OpenAlex API (data source)

## How data is connected

### 1) App startup

- Entry point mounts React app.
- Main app component calls a custom hook to fetch OpenAlex hierarchy data.

### 2) Fetching hierarchy (first screen)

The hierarchy hook:
- Fetches domains from OpenAlex.
- Finds "Physical Sciences".
- Fetches all fields in that domain.
- Fetches subfields for each field.
- Converts this into one tree structure used by the circle pack.

### 3) Circle Pack navigation

The circle pack:
- Draws one level at a time using D3 pack layout.
- Supports drill-down using click.
- Shows breadcrumbs for navigation.
- On leaf subfield click, sends selected subfield info to the parent screen.

### 4) Fetching author network data

When a subfield is selected, another hook:
- Fetches works for that subfield (paged with cursor).
- Builds author nodes from authorships.
- Calculates:
	- paperCount
	- citations
	- work type counts
- Builds co-author edges by counting shared works.
- Keeps top institutions and top authors for readability/performance.

### 5) Author Explorer views

Inside Author Explorer, there are two tabs sharing the same author-count slider state:

- Network view:
	- Force-directed graph
	- Search by author name tokens
	- Institution filter
	- Hover tooltip and selected-node focus behavior

- Scatter view:
	- X-axis = total works
	- Y-axis = total citations
	- Search by author name tokens
	- Institution color legend
	- Shared author-count slider with Network tab

## Main files and roles

- src/main.jsx
	- Mounts the app.

- src/App.jsx
	- Main page/state switcher.
	- Controls layer transitions between Circle Pack and Author Explorer.

- src/hooks/useOpenAlex.js
	- Fetches and builds the Physical Sciences hierarchy.

- src/components/CirclePack.jsx
	- Circle packing chart with drill-down and tooltip.

- src/components/Tooltip.jsx
	- Tooltip UI used by circle pack.

- src/components/AuthorExplorer.jsx
	- Tab container for Network and Scatter.
	- Holds shared slider state.

- src/hooks/useAuthorNetwork.js
	- Fetches works and transforms to author nodes + co-author edges.

- src/components/AuthorNetwork.jsx
	- Force network visualization.

- src/components/AuthorScatter.jsx
	- Scatter visualization for works vs citations.

## Local run

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Build production bundle:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Deployment (easy option: Vercel)

Recommended settings:
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

No environment variables are required for current functionality.

## User persona (for project report/presentation)

### Primary persona: Graduate student exploring a research area

- Name: Aisha (MSc student, first year)
- Goal: Quickly understand which subfields in Physical Sciences are active and who the key authors are.
- Pain points:
	- Too many papers and unclear starting point.
	- Hard to see collaboration patterns from raw search results.
	- Needs both overview and detail in one place.
- How this app helps:
	- Circle Pack gives a high-level map (domain -> field -> subfield).
	- Network view reveals who collaborates with whom.
	- Scatter view compares author output (works) and impact (citations).
	- Search/filter/tooltip support quick decision-making.

### Secondary persona: Supervisor or research mentor

- Goal: Recommend promising subfields and potential collaborators to students.
- How this app helps:
	- Fast visual scan of active topics.
	- Identify productive and high-impact authors.
	- Understand institution-level concentration and collaboration clusters.

## CS 736 (UofR) topics used in this project

This project applies core CS 736 ideas directly in the UI and data pipeline.

1. Data transformation and modeling
- OpenAlex API responses are transformed into visualization-ready structures.
- Hierarchical model for Circle Pack.
- Node-link model for co-author network.
- Tabular quantitative model for scatter plot.

2. Visual encodings
- Position:
	- Scatter: works on x-axis, citations on y-axis.
	- Network: force-based spatial arrangement.
- Size:
	- Circle Pack node radius reflects publication scale.
	- Network node size reflects paper count.
- Color:
	- Institution-based color encoding in Network/Scatter.

3. Interaction design
- Drill-down navigation in Circle Pack.
- Breadcrumb navigation and back transitions.
- Search, slider filtering, and institution filtering.
- Hover tooltips for details-on-demand.

4. Multi-view coordinated analysis
- One workflow across multiple linked views:
	- Overview (Circle Pack) -> Detail (Author Explorer).
- Shared author-count slider state across Network and Scatter tabs.

5. Graph and network analysis concepts
- Co-authorship edges built from shared works.
- Edge weight based on collaboration frequency.
- Neighborhood highlighting on node selection.

6. Scalability and readability choices
- Limit visible entities (top authors/institutions) for clarity.
- Cursor-based API paging for works.
- Progressive filtering to reduce clutter and cognitive load.

7. Human-centered explainability
- Clear labels, legends, and tooltips.
- Consistent interaction patterns across views.
- Designed for quick understanding by non-expert users.

## Notes

- The app currently focuses on the Physical Sciences domain.
- If OpenAlex rate limits occur, requests may need retry handling or caching in future updates.

## CS 837/736 Project Alignment (Winter 2026)

This section maps our current progress to the course project steps.

### Step 1: Data wrangling and preliminary analysis

Completed in this project:
- Connected to OpenAlex APIs for domain, fields, subfields, and works.
- Built two data structures for visualization:
	- Hierarchical structure for Circle Pack (Domain -> Field -> Subfield)
	- Graph and quantitative structures for author network and scatter plot
- Added filtering and limits (top institutions/authors) for readability and performance.

### Step 2: Hypothesized users, tasks, and goals

Completed in this project:
- Defined user personas in this README.
- Main user tasks supported:
	- Find active subfields quickly
	- Identify influential authors (works/citations)
	- Explore collaboration structure and institutions

### Step 3: Literature review

Status:
- Not included yet (intentionally deferred for now).
- We will add this in the report phase based on course-allowed venues.

### Step 4: Visualization design

Implemented design ideas currently used:
- Circle Pack for hierarchical overview and drill-down.
- Force-directed network for relationship visualization.
- Scatter plot for comparing author productivity vs impact.
- Tooltips, legends, search, and shared slider for interactive analysis.

Design principles applied (course topics):
- Visual encoding choices (position, size, color)
- Relationship-focused view design
- Multi-view workflow from overview to detail

### Step 5: Project development

Completed in this project:
- Built a working web-based visualization system with React + D3 + Vite.
- Implemented data fetching, transformation, interactions, and responsive rendering.
- Added deployment-ready setup (Vercel-friendly static build).

### Step 6: Project report (in progress)

Current status:
- README includes domain, users, system flow, and design/implementation summary.
- Formal paper-style write-up (7-10 pages) will be prepared separately.

## Scope note for current version

For this stage, the project focuses on implementation and design demonstration.
Literature review and full paper formatting are planned for the report submission phase.
