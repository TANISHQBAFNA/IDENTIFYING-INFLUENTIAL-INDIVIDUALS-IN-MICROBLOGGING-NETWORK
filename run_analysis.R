#!/usr/bin/env Rscript
# Headless runner for the original analysis/original_script.R workflow.
# Computes centrality, prestige, PageRank, HITS, clustering, and communities,
# writes JSON for the web dashboard, and optional PNG fallbacks.
#
# Usage: Rscript run_analysis.R [data.csv] [out_dir]
# Defaults: data/sample_network.csv  output

suppressMessages(library(igraph))

args <- commandArgs(trailingOnly = TRUE)
data_path <- if (length(args) >= 1) args[1] else "data/sample_network.csv"
out_dir <- if (length(args) >= 2) args[2] else "output"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)
png_path <- function(name) file.path(out_dir, name)

json_escape <- function(x) {
  x <- gsub("\\", "\\\\", x, fixed = TRUE)
  x <- gsub("\"", "\\\"", x, fixed = TRUE)
  x <- gsub("\n", "\\n", x, fixed = TRUE)
  x
}

json_num <- function(x) {
  if (length(x) == 0 || is.na(x) || !is.finite(x)) return("null")
  format(unname(x), scientific = FALSE, trim = TRUE, digits = 12)
}

# --- Read data ---------------------------------------------------------------
raw <- read.csv(data_path, header = TRUE, stringsAsFactors = FALSE)
if (!all(c("first", "second") %in% names(raw))) {
  stop("CSV must have columns named first and second")
}
y <- data.frame(from = raw$first, to = raw$second, stringsAsFactors = FALSE)
y <- y[nzchar(y$from) & nzchar(y$to), ]

# --- Build network -----------------------------------------------------------
net <- graph_from_data_frame(y, directed = TRUE)
n <- vcount(net)
m <- ecount(net)
names_v <- V(net)$name

V(net)$degree <- degree(net, mode = "all")
V(net)$in_degree <- degree(net, mode = "in")
V(net)$out_degree <- degree(net, mode = "out")
V(net)$closeness <- closeness(net, mode = "all", normalized = FALSE)
V(net)$betweenness <- betweenness(net, directed = TRUE, weights = NA, normalized = FALSE)
# Prestige (indegree, rescaled): in-links / (n-1), matching sna::prestige(cmode="indegree", rescale=TRUE)
V(net)$prestige <- if (n > 1) V(net)$in_degree / (n - 1) else V(net)$in_degree
V(net)$page_rank <- page_rank(net, directed = TRUE, damping = 0.85)$vector
V(net)$hub <- hub_score(net, scale = TRUE)$vector
V(net)$authority <- authority_score(net, scale = TRUE)$vector

netu <- as.undirected(net, mode = "collapse")
local_cc <- transitivity(netu, type = "local", isolates = "zero")
V(net)$clustering <- ifelse(is.na(local_cc), 0, local_cc)

cnet <- cluster_edge_betweenness(netu)
V(net)$community <- membership(cnet)
n_comm <- length(unique(V(net)$community))

eb <- edge_betweenness(net, directed = TRUE, weights = NA)
E(net)$betweenness <- eb

diam <- diameter(net, directed = FALSE, weights = NA)
dens <- edge_density(net, loops = FALSE)
recp <- reciprocity(net)

cat("Vertices:", n, " Edges:", m, "\n")
cat("diameter:", diam, "\n")
cat("edge_density:", dens, "\n")
cat("reciprocity:", recp, "\n")
cat("communities:", n_comm, "\n")

# Qualitative palette (not rainbow): color encodes community
comm_palette <- c("#1d4ed8", "#b45309", "#0f766e", "#9f1239", "#6d28d9",
                  "#365314", "#075985", "#9a3412", "#334155", "#a16207")
node_fill <- comm_palette[((V(net)$community - 1) %% length(comm_palette)) + 1]
eb_width <- 0.4 + 2.6 * (eb / max(eb, na.rm = TRUE))
eb_width[!is.finite(eb_width)] <- 0.4

size_from <- function(values, min_s = 6, max_s = 28) {
  rng <- range(values, na.rm = TRUE)
  if (!is.finite(rng[1]) || rng[1] == rng[2]) return(rep((min_s + max_s) / 2, length(values)))
  min_s + (values - rng[1]) / (rng[2] - rng[1]) * (max_s - min_s)
}

plot_metric <- function(filename, title, sizes, edge_w = 0.5) {
  png(png_path(filename), width = 1000, height = 800)
  set.seed(123)
  plot(net,
       vertex.color = node_fill,
       vertex.size = sizes,
       vertex.label.cex = 0.7,
       vertex.frame.color = "#0f172a",
       edge.arrow.size = 0.15,
       edge.width = edge_w,
       edge.color = "#94a3b8",
       main = title,
       layout = layout_with_kk(net))
  dev.off()
}

png(png_path("01_degree_histogram.png"), width = 900, height = 700)
hist(V(net)$degree, col = "#1d4ed8", border = "white",
     main = "Histogram of Node Degree",
     ylab = "Frequency", xlab = "Degree of Vertices")
dev.off()

png(png_path("02_network_diagram.png"), width = 1000, height = 800)
set.seed(123)
plot(net,
     vertex.color = node_fill,
     vertex.size = 8,
     vertex.label.cex = 0.7,
     edge.arrow.size = 0.15,
     edge.color = "#94a3b8",
     main = "Network (color = community)",
     layout = layout_with_kk(net))
dev.off()

plot_metric("03_degree.png", "Degree", size_from(V(net)$degree))
plot_metric("04_closeness.png", "Closeness", size_from(V(net)$closeness))
plot_metric("05_betweenness.png", "Betweenness", size_from(V(net)$betweenness))
plot_metric("06_edge_betweenness.png", "Edge betweenness (edge width)",
            size_from(V(net)$degree, 6, 14), edge_w = eb_width)
plot_metric("07_prestige.png", "Prestige (in-degree, scaled)", size_from(V(net)$prestige))
plot_metric("08_pagerank.png", "PageRank", size_from(V(net)$page_rank))

png(png_path("09_hubs_authorities.png"), width = 1400, height = 700)
par(mfrow = c(1, 2))
set.seed(123)
plot(net, vertex.size = size_from(V(net)$hub), main = "Hubs",
     vertex.color = node_fill, edge.arrow.size = 0.15,
     edge.color = "#94a3b8", layout = layout_with_kk(net), vertex.label.cex = 0.6)
plot(net, vertex.size = size_from(V(net)$authority), main = "Authorities",
     vertex.color = node_fill, edge.arrow.size = 0.15,
     edge.color = "#94a3b8", layout = layout_with_kk(net), vertex.label.cex = 0.6)
par(mfrow = c(1, 1))
dev.off()

png(png_path("10_community_detection.png"), width = 1000, height = 800)
set.seed(123)
plot(cnet, netu, main = "Community detection", vertex.size = 10, vertex.label.cex = 0.8)
dev.off()

# --- JSON for the web dashboard ----------------------------------------------
node_json <- vapply(seq_len(n), function(i) {
  paste0(
    "{\"id\":\"", json_escape(names_v[i]), "\"",
    ",\"degree\":", json_num(V(net)$degree[i]),
    ",\"inDegree\":", json_num(V(net)$in_degree[i]),
    ",\"outDegree\":", json_num(V(net)$out_degree[i]),
    ",\"closeness\":", json_num(V(net)$closeness[i]),
    ",\"betweenness\":", json_num(V(net)$betweenness[i]),
    ",\"prestige\":", json_num(V(net)$prestige[i]),
    ",\"pageRank\":", json_num(V(net)$page_rank[i]),
    ",\"hub\":", json_num(V(net)$hub[i]),
    ",\"authority\":", json_num(V(net)$authority[i]),
    ",\"clustering\":", json_num(V(net)$clustering[i]),
    ",\"community\":", json_num(as.integer(V(net)$community[i])),
    "}"
  )
}, character(1))

ends <- ends(net, E(net), names = TRUE)
edge_json <- vapply(seq_len(m), function(i) {
  paste0(
    "{\"source\":\"", json_escape(ends[i, 1]),
    "\",\"target\":\"", json_escape(ends[i, 2]),
    "\",\"betweenness\":", json_num(E(net)$betweenness[i]), "}"
  )
}, character(1))

payload <- paste0(
  "{\n",
  "  \"summary\": {\n",
  "    \"vertices\": ", n, ",\n",
  "    \"edges\": ", m, ",\n",
  "    \"diameter\": ", json_num(diam), ",\n",
  "    \"density\": ", json_num(dens), ",\n",
  "    \"reciprocity\": ", json_num(recp), ",\n",
  "    \"communities\": ", n_comm, "\n",
  "  },\n",
  "  \"nodes\": [\n    ", paste(node_json, collapse = ",\n    "), "\n  ],\n",
  "  \"edges\": [\n    ", paste(edge_json, collapse = ",\n    "), "\n  ]\n",
  "}\n"
)

json_out <- file.path(out_dir, "metrics.json")
writeLines(payload, json_out, useBytes = TRUE)

web_public <- "web/public"
if (dir.exists(web_public)) {
  writeLines(payload, file.path(web_public, "metrics-from-r.json"), useBytes = TRUE)
}

cat("JSON written to ", json_out, "\n", sep = "")
cat("Done. Figures written to '", out_dir, "/'\n", sep = "")
