# IndentiaDB Trial Container
# ============================================================================
# Gebruikt een pre-built binary van de private CI pipeline.
# De expiry datum is compile-time gebakken in de binary via option_env!("TRIAL_EXPIRES_AT").
# Er zijn geen runtime environment variabelen die de expiry beïnvloeden.
# ============================================================================

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY artifacts/linux-amd64/indentiagraph /usr/local/bin/indentiagraph

RUN chmod +x /usr/local/bin/indentiagraph && \
    mkdir -p /data /config /app && \
    chgrp -R 0 /data /config /app && \
    chmod -R g+rwX /data /config /app

WORKDIR /app

# OpenShift/OKD: random UID support
ENV HOME=/tmp
USER 1001

# 7001: HTTP SPARQL/GraphQL/REST/Health/Metrics
# 7002: Raft gRPC (cluster communicatie)
# 9200: Elasticsearch-compatible API
EXPOSE 7001 7002 9200

VOLUME ["/data", "/config"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7001/health || exit 1

ENTRYPOINT ["indentiagraph"]
CMD ["serve", "--config", "/config/indentiagraph.toml"]
