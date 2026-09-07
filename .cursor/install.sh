#!/usr/bin/env bash
# Idempotent environment bootstrap for the R social-network analysis project.
# The dashboard only needs igraph. Original analysis/original_script.R still
# lists sna/networkR/DirectedClustering; those are optional provenance deps.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
  r-base-core \
  r-cran-igraph \
  libglpk-dev \
  libgmp-dev

Rscript -e 'suppressMessages(library(igraph)); cat("igraph", as.character(packageVersion("igraph")), "OK\n")'
