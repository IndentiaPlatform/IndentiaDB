# IndentiaDB: Docker Deployment Guide

This guide covers deploying IndentiaDB using Docker, from a single-node quick start to a high-availability cluster.

## Prerequisites

- Docker Engine 24.0 or later
- Docker Compose v2 (included with Docker Desktop, or install the plugin separately)
- At least 2 GB of available RAM per IndentiaDB node
- A directory for persistent data storage

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
  quay.io/indentia/indentiagraph:latest
```

Verify that the instance is running:

```bash
curl http://localhost:7001/health
```

The SPARQL endpoint is available at `http://localhost:7001/sparql`, the GraphQL endpoint at `http://localhost:7001/graphql`, and the Elasticsearch-compatible API at `http://localhost:9200`.

## Docker Compose: Standalone

A ready-to-use `docker-compose.yml` is provided in the repository root. To start:

```bash
docker compose up -d
```

See the [docker-compose.yml](../docker-compose.yml) file for the full configuration. Key settings you may want to adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `SURREAL_USER` | `root` | Administrative username |
| `SURREAL_PASS` | `changeme` | Administrative password |
| `ES_HYBRID_SCORER` | `rrf` | Hybrid search scorer (`rrf`, `bayesian`, `linear`) |
| `ES_VECTOR_SEARCH_MODE` | `hnsw` | Vector search algorithm |

## Docker Compose: HA Cluster

For production use, deploy a three-node cluster with automatic Raft consensus:

```bash
docker compose -f docker-compose.ha.yml up -d
```

See the [docker-compose.ha.yml](../docker-compose.ha.yml) file for the full configuration. This setup includes:

- Three IndentiaDB nodes forming a Raft cluster
- An HAProxy load balancer exposing ports 7001 (HTTP) and 9200 (ES-compat)
- Automatic leader election and failover
- Individual persistent volumes per node

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SURREAL_USER` | Root username | _(required)_ |
| `SURREAL_PASS` | Root password | _(required)_ |
| `ES_HYBRID_SCORER` | Hybrid search fusion algorithm: `rrf`, `bayesian`, or `linear` | `rrf` |
| `ES_VECTOR_SEARCH_MODE` | Vector index type: `hnsw` or `flat` | `hnsw` |

### Configuration File

For advanced tuning, mount a configuration file at `/config/indentiagraph.toml`:

```bash
docker run -d \
  --name indentiadb \
  -p 7001:7001 \
  -p 9200:9200 \
  -v ./indentiagraph.toml:/config/indentiagraph.toml:ro \
  -v indentiadb-data:/data \
  quay.io/indentia/indentiagraph:latest
```

## Persistent Storage

IndentiaDB stores all data in `/data` inside the container. Always use a Docker volume or bind mount to persist this data across container restarts:

```bash
# Named volume (recommended)
-v indentiadb-data:/data

# Bind mount to host directory
-v /srv/indentiadb/data:/data
```

Ensure the host directory has appropriate permissions if using a bind mount.

## Health Checks

The health endpoint is available at `GET http://localhost:7001/health`. Docker Compose configurations in this repository include a built-in health check:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:7001/health"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Check health status:

```bash
docker inspect --format='{{.State.Health.Status}}' indentiadb
```

## Backup and Restore

### Creating a Backup

Stop writes or use the backup API, then copy the data volume:

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
  quay.io/indentia/indentiagraph:latest
```

## Upgrading

1. Pull the new image:

   ```bash
   docker pull quay.io/indentia/indentiagraph:latest
   ```

2. Stop and remove the running container:

   ```bash
   docker stop indentiadb && docker rm indentiadb
   ```

3. Start a new container with the same volume:

   ```bash
   docker run -d \
     --name indentiadb \
     -p 7001:7001 \
     -p 9200:9200 \
     -e SURREAL_USER=root \
     -e SURREAL_PASS=changeme \
     -v indentiadb-data:/data \
     quay.io/indentia/indentiagraph:latest
   ```

For Docker Compose deployments:

```bash
docker compose pull
docker compose up -d
```

For HA clusters, perform a rolling upgrade by restarting one node at a time and waiting for it to rejoin the Raft cluster before proceeding to the next node.

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP | SPARQL, GraphQL, REST API, and health endpoint |
| 7002 | gRPC | Raft inter-node communication (HA cluster only) |
| 9200 | HTTP | Elasticsearch-compatible search API |
