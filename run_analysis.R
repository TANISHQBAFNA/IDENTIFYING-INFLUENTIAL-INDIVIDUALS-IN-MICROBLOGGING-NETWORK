#!/usr/bin/env Rscript
# Headless runner for the social-network analysis in the file "R code".
# The original script reads data via read.csv(file.choose()) and renders plots
# to an interactive device. This runner takes a data path (default:
# data/sample_network.csv), writes every figure to output/ as PNG, and fixes a
# few typos in the original (set. Seed -> set.seed, Layout -> layout,
# vertext.size -> vertex.size) so it runs non-interactively.

suppressMessages({
  library(igraph)
  library(sna)
  library(networkR)
  library(DirectedClustering)
})

args <- commandArgs(trailingOnly = TRUE)
data_path <- if (length(args) >= 1) args[1] else "data/sample_network.csv"
out_dir <- if (length(args) >= 2) args[2] else "output"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

png_path <- function(name) file.path(out_dir, name)

# --- Read data ---------------------------------------------------------------
data <- read.csv(data_path, header = TRUE)
y <- data.frame(data$first, data$second)

# --- Build network -----------------------------------------------------------
net <- graph.data.frame(y, directed = TRUE)
n <- vcount(net)
c <- get.adjacency(net, type = "both", attr = NULL, names = TRUE, sparse = FALSE)
cat("Vertices:", n, " Edges:", ecount(net), "\n")
V(net)$label <- V(net)$name
V(net)$degree <- sna::degree(c, gmode = "digraph", diag = FALSE, cmode = "freeman", rescale = FALSE)

# --- Histogram of node degree ------------------------------------------------
png(png_path("01_degree_histogram.png"), width = 900, height = 700)
set.seed(123)
hist(V(net)$degree, col = "green",
     main = "Histogram of Node Degree",
     ylab = "Frequency", xlab = "Degree of Vertices")
dev.off()

# --- Network diagram ---------------------------------------------------------
png(png_path("02_network_diagram.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.color = "green", vertex.size = 6,
     edge.arrow.size = 0.1, vertex.label.cex = 0.8)
dev.off()

cat("diameter:", diameter(net, directed = FALSE, weights = NA), "\n")
cat("edge_density:", edge_density(net, loops = FALSE), "\n")
cat("density(manual):", ecount(net) / (vcount(net) * (vcount(net) - 1)), "\n")
cat("reciprocity:", reciprocity(net), "\n")

pal <- rainbow(n)

# --- Degree ------------------------------------------------------------------
png(png_path("03_degree.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.color = pal, vertex.size = V(net)$degree * 0.4, main = "DEGREE",
     edge.arrow.size = 0.1, layout = layout.kamada.kawai)
dev.off()

# --- Closeness ---------------------------------------------------------------
V(net)$closeness <- sna::closeness(c, gmode = "digraph", diag = FALSE,
                                   cmode = "undirected", rescale = FALSE, ignore.eval = TRUE)
png(png_path("04_closeness.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.color = pal, vertex.size = V(net)$closeness * 40, main = "CLOSENESS",
     edge.arrow.size = 0.1, layout = layout.kamada.kawai)
dev.off()

# --- Betweenness -------------------------------------------------------------
V(net)$betweenness <- sna::betweenness(c, gmode = "digraph", diag = FALSE,
                                       cmode = "directed", rescale = FALSE, ignore.eval = TRUE)
png(png_path("05_betweenness.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.color = pal, vertex.size = V(net)$betweenness * 0.06, main = "BETWEENNESS",
     edge.arrow.size = 0.1, layout = layout.kamada.kawai)
dev.off()

# --- Edge betweenness --------------------------------------------------------
png(png_path("06_edge_betweenness.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.color = pal,
     vertex.size = edge_betweenness(net, directed = TRUE, weights = NA) * 0.34,
     main = "EDGE BETWEENNESS", edge.arrow.size = 0.1, layout = layout.kamada.kawai)
dev.off()

# --- Prestige ----------------------------------------------------------------
V(net)$prestige <- sna::prestige(c, gmode = "digraph", diag = FALSE,
                                 cmode = "indegree", rescale = TRUE, tol = 1e-07)
png(png_path("07_prestige.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.color = pal, vertex.size = V(net)$prestige * 150, main = "PRESTIGE",
     edge.arrow.size = 0.1, layout = layout.kamada.kawai)
dev.off()

# --- PageRank ----------------------------------------------------------------
V(net)$pg <- page_rank(net, vids = V(net), directed = TRUE, damping = 0.85)$vector
png(png_path("08_pagerank.png"), width = 1000, height = 800)
set.seed(123)
plot(net, vertex.size = V(net)$pg * 300, main = "PAGE RANK",
     vertex.color = pal, edge.arrow.size = 0.1, layout = layout.kamada.kawai)
dev.off()

# --- Hubs and Authorities ----------------------------------------------------
print(hits(c, maxiter = 100L, tol = 1e-05))
hs <- hub_score(net)$vector
as <- authority_score(net, scale = TRUE, weights = NULL)$vector
png(png_path("09_hubs_authorities.png"), width = 1400, height = 700)
par(mfrow = c(1, 2))
set.seed(123)
plot(net, vertex.size = hs * 30, main = "HUBS", vertex.color = pal,
     edge.arrow.size = 0.1, layout = layout.kamada.kawai)
plot(net, vertex.size = as * 30, main = "AUTHORITIES", vertex.color = pal,
     edge.arrow.size = 0.1, layout = layout.kamada.kawai)
par(mfrow = c(1, 1))
dev.off()

# --- Community detection -----------------------------------------------------
netu <- graph.data.frame(y, directed = FALSE)
cnet <- cluster_edge_betweenness(netu)
png(png_path("10_community_detection.png"), width = 1000, height = 800)
plot(cnet, netu, main = "COMMUNITY DETECTION", vertex.size = 10, vertex.label.cex = 0.8)
dev.off()

cat("\nDone. Figures written to '", out_dir, "/'\n", sep = "")
