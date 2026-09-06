#!/usr/bin/env bash
# Idempotent environment bootstrap for the R social-network analysis project.
# Installs R, binary R packages from apt, and the two CRAN-only packages.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

# System packages: R plus the binary R packages that ship with Ubuntu, plus the
# toolchain/headers needed to compile networkR (Rcpp/RcppArmadillo) from source.
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
  r-base-core \
  r-cran-igraph \
  r-cran-sna \
  r-cran-network \
  r-cran-matrix \
  r-cran-rcpp \
  r-cran-rcpparmadillo \
  build-essential \
  gfortran \
  libxml2-dev \
  libglpk-dev \
  libgmp-dev

# CRAN-only packages, installed into the writable site-library (via sudo).
# networkR: current CRAN version (compiles from source).
# DirectedClustering: current CRAN version needs R >= 4.4; Ubuntu ships R 4.3.3,
# so pin the archived 0.1.1 which is compatible. Guard both for idempotency.
sudo Rscript -e '
pkgs <- c(networkR = NA, DirectedClustering = "0.1.1")
repo <- "https://cloud.r-project.org"
for (p in names(pkgs)) {
  if (requireNamespace(p, quietly = TRUE)) { cat(p, "already installed\n"); next }
  if (p == "DirectedClustering") {
    install.packages(
      sprintf("%s/src/contrib/Archive/DirectedClustering/DirectedClustering_%s.tar.gz", repo, pkgs[[p]]),
      repos = NULL, type = "source")
  } else {
    install.packages(p, repos = repo)
  }
}
'

# Verify every library required by "R code" loads.
Rscript -e 'for (p in c("igraph","sna","networkR","DirectedClustering")) { suppressMessages(library(p, character.only=TRUE)); cat(p, as.character(packageVersion(p)), "OK\n") }'
