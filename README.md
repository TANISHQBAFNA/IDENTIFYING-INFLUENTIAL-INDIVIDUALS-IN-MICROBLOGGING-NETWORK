# Identifying influential individuals in a microblogging network

Course project (CSE3021) turned into an interactive webpage. Treat follows as a **directed graph**, score accounts with centrality / prestige / PageRank / HITS, and pick a **community-aware** seed set so influencers are not all from one cluster.

## Web dashboard

```bash
cd web
npm install
npm run dev
```

Open the printed localhost URL. The sample graph in `data/sample_network.csv` loads automatically.

- **Size by** a metric; **color** is community; **edge width** is edge betweenness (not node size).
- Click a node, table row, or scatter point for the inspector.
- Compare **global top 10** with **community-aware top 10**.
- **Upload CSV** with columns `first,second` (follower → followee).

```bash
cd web
npm test        # metric + CSV unit tests
npm run build   # static files in web/dist
```

GitHub Pages: deploy `web/dist`. The Vite `base` is `./` so the app works from a project page or a subpath.

## R analysis (optional)

The original lab script lives at `analysis/original_script.R` (interactive, `file.choose()`). The headless runner writes JSON + PNGs:

```bash
Rscript run_analysis.R data/sample_network.csv output
```

Requires `igraph`. Output:

- `output/metrics.json` — nodes, edges, summary (copied to `web/public/metrics-from-r.json` when that folder exists)
- `output/*.png` — fallback figures, colored by community; edge-betweenness uses **edge width**

The webpage does **not** need R at runtime. Metrics are computed in the browser with [graphology](https://graphology.github.io/).
