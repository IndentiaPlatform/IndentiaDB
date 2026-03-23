# Stage 1: Build Zensical docs site
FROM nexus.lvm.local:8082/python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends git curl gcc libc6-dev libffi-dev pkg-config && rm -rf /var/lib/apt/lists/*
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build
RUN git clone https://github.com/zensical/zensical.git && cd zensical && python scripts/prepare.py
RUN pip install --no-cache-dir ./zensical

COPY . /docs
WORKDIR /docs
RUN zensical build

# Stage 2: Serve with nginx (unprivileged, OKD-compatible)
FROM nexus.lvm.local:8082/nginxinc/nginx-unprivileged:alpine

COPY --from=builder /docs/site /usr/share/nginx/html

# Custom nginx config — port 8080 (unprivileged default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
