# Docker Deployment

This guide covers deploying IndentiaDB using Docker, from a single-container quick start to a three-node high-availability cluster with HAProxy load balancing.

## Prerequisites

- Docker Engine 24.0 or later
- Docker Compose v2 (included with Docker Desktop, or install the Compose plugin separately)
- At least 2 GB of available RAM per IndentiaDB node
- A directory for persistent data storage

---

## Quick Start

Run a single IndentiaDB instance with default settings:

```bash
docker run -d \
  --name indentiadb \
  -p 7001:7001 \
  -p 9200:9200 \
  -e SURREAL_USER=root \
  -e SURREAL_PASS=changeme \
  -v indentiadb-data:/data \
  ghcr.io/indentiaplatform/indentiadb-trial:latest
```

Verify the instance is running:

```bash
curl http://localhost:7001/health
```

The endpoints are:

| Endpoint | URL |
|----------|-----|
| SPARQL | `http://localhost:7001/sparql` |
| GraphQL | `http://localhost:7001/graphql` |
| Elasticsearch-compatible API | `http://localhost:9200` |
| Health | `http://localhost:7001/health` |
| Metrics | `http://localhost:7001/metrics` |

---

## Docker Compose — Single Node

For a development or small production deployment, use Docker Compose with a single node.

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  indentiadb:
    image: ghcr.io/indentiaplatform/indentiadb-trial:latest
    container_name: indentiadb
    restart: unless-stopped
    ports:
      - "7001:7001"
      - "9200:9200"
    environment:
      SURREAL_USER: root
      SURREAL_PASS: changeme
      ES_HYBRID_SCORER: rrf
      ES_VECTOR_SEARCH_MODE: hnsw
    volumes:
      - indentiadb-data:/data
      - ./config/indentiagraph.toml:/config/indentiagraph.toml:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 4G
        reservations:
          cpus: "0.5"
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

volumes:
  indentiadb-data:
    driver: local
```

Start the stack:

```bash
docker compose up -d
```

View logs:

```bash
docker compose logs -f indentiadb
```

Stop the stack:

```bash
docker compose down
```

---

## Docker Compose HA — 3-Node Cluster with HAProxy

For production with high availability, deploy three IndentiaDB nodes behind HAProxy.

### `docker-compose.ha.yml`

```yaml
version: "3.9"

services:
  indentiadb-1:
    image: ghcr.io/indentiaplatform/indentiadb-trial:latest
    container_name: indentiadb-1
    restart: unless-stopped
    environment:
      SURREAL_USER: root
      SURREAL_PASS: changeme
      ES_HYBRID_SCORER: bayesian
      ES_VECTOR_SEARCH_MODE: hnsw
      RAFT_SEED_NODES: "indentiadb-1:7002,indentiadb-2:7002,indentiadb-3:7002"
      NODE_ID: "1"
    volumes:
      - indentiadb-data-1:/data
    networks:
      - indentiadb-cluster
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 4G

  indentiadb-2:
    image: ghcr.io/indentiaplatform/indentiadb-trial:latest
    container_name: indentiadb-2
    restart: unless-stopped
    environment:
      SURREAL_USER: root
      SURREAL_PASS: changeme
      ES_HYBRID_SCORER: bayesian
      ES_VECTOR_SEARCH_MODE: hnsw
      RAFT_SEED_NODES: "indentiadb-1:7002,indentiadb-2:7002,indentiadb-3:7002"
      NODE_ID: "2"
    volumes:
      - indentiadb-data-2:/data
    networks:
      - indentiadb-cluster
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 4G

  indentiadb-3:
    image: ghcr.io/indentiaplatform/indentiadb-trial:latest
    container_name: indentiadb-3
    restart: unless-stopped
    environment:
      SURREAL_USER: root
      SURREAL_PASS: changeme
      ES_HYBRID_SCORER: bayesian
      ES_VECTOR_SEARCH_MODE: hnsw
      RAFT_SEED_NODES: "indentiadb-1:7002,indentiadb-2:7002,indentiadb-3:7002"
      NODE_ID: "3"
    volumes:
      - indentiadb-data-3:/data
    networks:
      - indentiadb-cluster
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 4G

  haproxy:
    image: haproxy:2.9-alpine
    container_name: indentiadb-haproxy
    restart: unless-stopped
    ports:
      - "7001:7001"
      - "9200:9200"
      - "8404:8404"    # HAProxy stats
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    networks:
      - indentiadb-cluster
    depends_on:
      indentiadb-1:
        condition: service_healthy
      indentiadb-2:
        condition: service_healthy
      indentiadb-3:
        condition: service_healthy

volumes:
  indentiadb-data-1:
    driver: local
  indentiadb-data-2:
    driver: local
  indentiadb-data-3:
    driver: local

networks:
  indentiadb-cluster:
    driver: bridge
```

### `haproxy.cfg`

```
global
    log stdout format raw local0
    maxconn 50000

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5s
    timeout client  60s
    timeout server  60s
    retries 3

frontend indentiadb_http
    bind *:7001
    default_backend indentiadb_nodes

frontend indentiadb_es
    bind *:9200
    default_backend indentiadb_es_nodes

frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s

backend indentiadb_nodes
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    server node1 indentiadb-1:7001 check inter 5s rise 2 fall 3
    server node2 indentiadb-2:7001 check inter 5s rise 2 fall 3
    server node3 indentiadb-3:7001 check inter 5s rise 2 fall 3

backend indentiadb_es_nodes
    balance roundrobin
    option httpchk GET /_cluster/health
    http-check expect status 200
    server node1 indentiadb-1:9200 check inter 5s rise 2 fall 3
    server node2 indentiadb-2:9200 check inter 5s rise 2 fall 3
    server node3 indentiadb-3:9200 check inter 5s rise 2 fall 3
```

Start the HA cluster:

```bash
docker compose -f docker-compose.ha.yml up -d
```

The cluster automatically elects a Raft leader. All nodes serve read requests; writes are forwarded to the leader.

---

## Environment Variable Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SURREAL_USER` | Root username | _(required)_ |
| `SURREAL_PASS` | Root password | _(required)_ |
| `ES_HYBRID_SCORER` | Hybrid search fusion algorithm: `rrf`, `bayesian`, or `linear` | `rrf` |
| `ES_VECTOR_SEARCH_MODE` | Vector index type: `hnsw` or `flat` | `hnsw` |
| `RAFT_SEED_NODES` | Comma-separated list of `host:port` for Raft peer discovery (cluster mode) | _(unset)_ |
| `NODE_ID` | Unique node identifier within the cluster | _(auto)_ |
| `LOG_LEVEL` | Log verbosity: `error`, `warn`, `info`, `debug`, `trace` | `info` |
| `DATA_DIR` | Override the data directory path | `/data` |

---

## Configuration File

For advanced tuning, mount a TOML configuration file at `/config/indentiagraph.toml`:

```bash
docker run -d \
  --name indentiadb \
  -p 7001:7001 \
  -p 9200:9200 \
  -e SURREAL_USER=root \
  -e SURREAL_PASS=changeme \
  -v ./indentiagraph.toml:/config/indentiagraph.toml:ro \
  -v indentiadb-data:/data \
  ghcr.io/indentiaplatform/indentiadb-trial:latest
```

Example `indentiagraph.toml`:

```toml
[server]
bind = "0.0.0.0"
http_port = 7001
raft_port = 7002
es_port = 9200

[storage]
data_dir = "/data"

[search]
hybrid_scorer = "rrf"
vector_search_mode = "hnsw"

[cache]
query_cache_size_mb = 256

[logging]
level = "info"
format = "json"
```

---

## Volume Mount Strategy

### Recommended: Named Docker Volume

```bash
-v indentiadb-data:/data
```

Named volumes are managed by Docker and survive container removal. Use this for most deployments.

### Bind Mount (Host Directory)

```bash
-v /srv/indentiadb/data:/data
```

Bind mounts give direct access to data from the host. Ensure the host directory is owned by the user that Docker runs the container as (typically UID 1000).

### Multiple Mounts

Separate data and configuration:

```bash
-v indentiadb-data:/data \
-v ./config:/config:ro \
-v ./logs:/var/log/indentiadb
```

---

## Health Check Configuration

The `/health` endpoint returns HTTP 200 when the node is ready. Docker Compose and Docker Swarm use this for container health tracking:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Check container health status:

```bash
docker inspect --format='{{.State.Health.Status}}' indentiadb
```

---

## Log Streaming

Stream logs from a running container:

```bash
docker logs -f indentiadb
```

Stream logs with timestamps:

```bash
docker logs -f --timestamps indentiadb
```

With Docker Compose:

```bash
docker compose logs -f --tail=100 indentiadb
```

Configure JSON log driver with rotation in `docker-compose.yml`:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "5"
```

---

## Backup and Restore

### Creating a Backup

```bash
# Stop the container gracefully
docker stop indentiadb

# Create a tarball of the data volume
docker run --rm \
  -v indentiadb-data:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/indentiadb-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restart the container
docker start indentiadb
```

### Restoring from Backup

```bash
# Stop and remove the existing container
docker stop indentiadb && docker rm indentiadb

# Clear and restore the data volume
docker run --rm \
  -v indentiadb-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/indentiadb-backup-20260321.tar.gz -C /data"

# Start the container again
docker run -d \
  --name indentiadb \
  -p 7001:7001 \
  -p 9200:9200 \
  -e SURREAL_USER=root \
  -e SURREAL_PASS=changeme \
  -v indentiadb-data:/data \
  ghcr.io/indentiaplatform/indentiadb-trial:latest
```

---

## Production Considerations

### Resource Limits

Always set CPU and memory limits in production to prevent runaway resource consumption:

```yaml
deploy:
  resources:
    limits:
      cpus: "4"
      memory: 8G
    reservations:
      cpus: "1"
      memory: 2G
```

### Log Rotation

Configure log rotation to prevent disk exhaustion:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "200m"
    max-file: "10"
```

### Restart Policy

Use `restart: unless-stopped` or `restart: always` to ensure the container recovers from crashes:

```yaml
restart: unless-stopped
```

### Upgrading

1. Pull the new image:

   ```bash
   docker pull ghcr.io/indentiaplatform/indentiadb-trial:latest
   ```

2. For Docker Compose:

   ```bash
   docker compose pull
   docker compose up -d
   ```

3. For HA clusters, perform a rolling upgrade by restarting one node at a time and waiting for it to rejoin the Raft cluster before proceeding to the next node:

   ```bash
   docker compose -f docker-compose.ha.yml pull
   docker compose -f docker-compose.ha.yml up -d --no-deps indentiadb-1
   # Wait for node 1 to be healthy
   docker compose -f docker-compose.ha.yml up -d --no-deps indentiadb-2
   # Wait for node 2 to be healthy
   docker compose -f docker-compose.ha.yml up -d --no-deps indentiadb-3
   ```

---

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP | SPARQL, GraphQL, REST API, health, and metrics |
| 7002 | gRPC | Raft inter-node communication (cluster only) |
| 9200 | HTTP | Elasticsearch-compatible search API |
