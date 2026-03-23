# Deployment Overview

IndentiaDB can be deployed in several configurations, from a single container for local development to a multi-node Kubernetes cluster for enterprise production workloads. All deployment options use the same container image from `ghcr.io/indentiaplatform/indentiadb-trial`.

---

## Deployment Options

| Option | Scale | Complexity | High Availability | Use Case |
|--------|-------|------------|-------------------|----------|
| [Docker single container](docker.md#quick-start) | Dev / small | Low | No | Development and testing |
| [Docker Compose (single node)](docker.md#docker-compose-single-node) | Small–medium | Low | No | Small production, staging |
| [Docker Compose HA (3 nodes)](docker.md#docker-compose-ha-cluster) | Medium | Medium | Yes | Production with HA |
| [Kubernetes](kubernetes.md) | Large | Medium | Yes | Cloud-native production |
| [OpenShift / OKD](openshift.md) | Enterprise | Medium | Yes | Enterprise on-premises |

---

## System Requirements

### Minimum (Development)

| Resource | Requirement |
|----------|-------------|
| CPU | 2 cores |
| RAM | 2 GB |
| Disk | 10 GB |
| OS | Linux (x86_64 or arm64), macOS, Windows (Docker Desktop) |

### Recommended (Production, per node)

| Resource | Requirement |
|----------|-------------|
| CPU | 4–8 cores |
| RAM | 8–16 GB |
| Disk | 100 GB SSD (NVMe preferred) |
| Network | 1 Gbps between cluster nodes |

### High-Availability Cluster

IndentiaDB uses the **Raft consensus algorithm** for distributed coordination. Raft requires a majority quorum to elect a leader and commit writes:

| Nodes | Tolerated Failures |
|-------|-------------------|
| 1 | 0 (no HA) |
| 3 | 1 |
| 5 | 2 |
| 7 | 3 |

!!! important "Always deploy an odd number of nodes"
    An even number of nodes does not improve fault tolerance and increases the risk of split-brain scenarios. Always use 1, 3, 5, or 7 nodes.

---

## Firewall Ports

| Port | Protocol | Direction | Description |
|------|----------|-----------|-------------|
| 7001 | TCP | Inbound | SPARQL, GraphQL, REST API, health, metrics |
| 9200 | TCP | Inbound | Elasticsearch-compatible API |
| 7002 | TCP | Internal | Raft inter-node communication (cluster nodes only) |

Port 7002 must be reachable between all cluster nodes but should **not** be exposed to clients or the public internet.

---

## Data Directory

IndentiaDB stores all persistent data in the `/data` directory inside the container. Always mount a persistent volume at this path:

```bash
# Docker named volume
-v indentiadb-data:/data

# Bind mount
-v /srv/indentiadb/data:/data
```

The data directory contains:

| Subdirectory | Contents |
|--------------|----------|
| `/data/surreal/` | SurrealDB storage engine files |
| `/data/oxigraph/` | RDF triple store files |
| `/data/index/` | Full-text search and vector index files |
| `/data/raft/` | Raft log and snapshot files (cluster mode) |

---

## Container Image

```
ghcr.io/indentiaplatform/indentiadb-trial:latest
ghcr.io/indentiaplatform/indentiadb-trial:1.2.0
```

Versioned tags are recommended for production deployments. The `latest` tag always points to the most recent stable release.

---

## Deployment Guides

- **[Docker](docker.md)** — Single container, Docker Compose (standalone), and Docker Compose HA
- **[Kubernetes](kubernetes.md)** — StatefulSet, Operator (CRD-based), Ingress, HPA, monitoring
- **[OpenShift / OKD](openshift.md)** — SCCs, Routes, OperatorHub, Kustomize overlays, ArgoCD
