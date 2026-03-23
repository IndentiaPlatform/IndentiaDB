# Kubernetes Operator

The IndentiaGraph Operator is a Kubernetes-native controller that manages the full lifecycle of IndentiaGraph clusters through a Custom Resource Definition (CRD). It automates deployment, scaling, upgrades, monitoring, and backend provisioning -- reducing a multi-component distributed database to a single declarative YAML resource.

---

## Custom Resource Definition

The operator introduces the `IndentiaGraphCluster` CRD (API group `indentiagraph.io`, version `v1alpha1`). Creating an `IndentiaGraphCluster` resource causes the operator to provision a complete cluster including StatefulSets, Services, ConfigMaps, PersistentVolumeClaims, and PodDisruptionBudgets.

```
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster    (shortname: igc)
scope: Namespaced
```

**Printer columns:**

| Column | JSONPath | Description |
|--------|----------|-------------|
| Replicas | `.spec.replicas` | Desired replica count |
| Ready | `.status.readyReplicas` | Ready replica count |
| Phase | `.status.phase` | Current cluster phase |
| Age | `.metadata.creationTimestamp` | Time since creation |

```bash
$ kubectl get igc
NAME          REPLICAS   READY   PHASE     AGE
my-cluster    3          3       Running   4d
```

---

## Installation

### Option 1: Kustomize (Recommended)

```bash
# Install the CRD
kubectl apply -f https://raw.githubusercontent.com/indentia/indentiagraph-operator/main/deploy/crds/indentiagraphcluster.yaml

# Install the operator
kubectl apply -k https://github.com/indentia/indentiagraph-operator/deploy/operator
```

This creates the `indentiagraph-system` namespace and deploys the operator with its RBAC rules, ServiceAccount, Deployment, and metrics Service.

### Option 2: Manual

Apply each manifest individually:

```bash
# 1. CRD
kubectl apply -f deploy/crds/indentiagraphcluster.yaml

# 2. RBAC
kubectl apply -f deploy/operator/rbac.yaml

# 3. Operator deployment
kubectl apply -f deploy/operator/deployment.yaml
```

### Option 3: Helm Chart

```bash
helm repo add indentia https://charts.indentia.ai
helm repo update

helm install indentiagraph-operator indentia/indentiagraph-operator \
  --namespace indentiagraph-system \
  --create-namespace \
  --set image.tag=v0.1.0
```

### Verify Installation

```bash
# Check operator pod
kubectl -n indentiagraph-system get pods

# Check CRD registration
kubectl get crd indentiagraphclusters.indentiagraph.io

# Check operator logs
kubectl -n indentiagraph-system logs -l app.kubernetes.io/name=indentiagraph-operator
```

---

## CRD Spec Reference

### Top-Level Spec Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `replicas` | int | `3` | Number of IndentiaGraph replicas (must be odd for Raft consensus) |
| `image` | string | `quay.io/indentia/indentiagraph:latest` | Container image for IndentiaGraph |
| `imagePullPolicy` | string | `IfNotPresent` | Image pull policy (`Always`, `IfNotPresent`, `Never`) |
| `storage` | object | `{size: "10Gi"}` | Persistent storage configuration |
| `resources` | object | (none) | CPU/memory requests and limits |
| `raft` | object | (none) | Raft consensus tuning |
| `surrealdb` | object | (none) | External SurrealDB backend (disabled by default; embedded Surreal is the default) |
| `elasticsearchCompat` | object | `{enabled: true}` | Elasticsearch-compatible listener |
| `tikv` | object | (none) | TiKV distributed storage backend |
| `monitoring` | object | (none) | Prometheus monitoring |
| `nodeSelector` | map | (none) | Node selector for scheduling |
| `tolerations` | list | (none) | Pod tolerations |
| `affinity` | object | (none) | Pod affinity/anti-affinity rules |
| `env` | list | (none) | Additional environment variables |

### Storage Configuration

```yaml
storage:
  size: "50Gi"                    # PVC size
  storageClassName: "fast-ssd"    # StorageClass name
  accessModes:                    # PVC access modes
    - ReadWriteOnce
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `size` | string | `"10Gi"` | Storage request size |
| `storageClassName` | string | (cluster default) | StorageClass to use |
| `accessModes` | list | `["ReadWriteOnce"]` | PVC access modes |

### Resource Requirements

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2"
    memory: "4Gi"
```

!!! tip "Production Sizing"
    For production workloads, always set explicit resource requests and limits. A good starting point for IndentiaGraph nodes is 2 CPU / 4Gi memory per replica. Increase memory for large HNSW vector indexes.

### Raft Consensus Configuration

```yaml
raft:
  heartbeatIntervalMs: 150     # Heartbeat interval
  electionTimeoutMs: 300       # Election timeout
  snapshotThreshold: 10000     # Log entries before snapshot
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `heartbeatIntervalMs` | int | `150` | Raft heartbeat interval in ms |
| `electionTimeoutMs` | int | `300` | Raft election timeout in ms |
| `snapshotThreshold` | int | `10000` | Number of log entries before triggering a snapshot |

!!! warning "Raft Requires Odd Replicas"
    Raft consensus requires a majority quorum. Always use an odd number of replicas (1, 3, 5, 7) to avoid split-brain scenarios. The operator validates this constraint and rejects even replica counts.

### External SurrealDB Backend

By default, IndentiaGraph runs an embedded Surreal runtime inside each pod. You can optionally enable a separate SurrealDB StatefulSet:

```yaml
surrealdb:
  enabled: true                         # false = use embedded Surreal (default)
  replicas: 3
  image: "surrealdb/surrealdb:v3.0.2"
  storage:
    size: "20Gi"
    storageClassName: "fast-ssd"
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `false` | Enable external SurrealDB. When false, embedded Surreal is used. |
| `replicas` | int | `3` | SurrealDB replica count |
| `image` | string | `surrealdb/surrealdb:v3.0.2` | SurrealDB container image |
| `storage` | object | (none) | Storage configuration |
| `resources` | object | (none) | CPU/memory configuration |

!!! note "Embedded vs External SurrealDB"
    The embedded Surreal runtime is the default and simplest deployment model -- SurrealDB runs as a library inside each IndentiaGraph process. Enable external SurrealDB only when you need independent scaling or shared storage across services.

### Elasticsearch-Compatible Listener

```yaml
elasticsearchCompat:
  enabled: true                  # Enable ES-compatible API (default: true)
  port: 9200                     # Listener port
  bootstrapAdminSecretRef:       # Admin credentials from a Secret
    name: "es-admin-credentials"
    usernameKey: "username"      # default: "username"
    passwordKey: "password"      # default: "password"
  inference:                     # External inference providers
    defaultEmbeddingProvider: "openai"
    defaultRerankProvider: "cohere"
    providers:
      openai:
        kind: "embedding"
        url: "https://api.openai.com/v1/embeddings"
        model: "text-embedding-3-small"
        bearerTokenEnv: "OPENAI_API_KEY"
      cohere:
        kind: "rerank"
        url: "https://api.cohere.ai/v1/rerank"
        model: "rerank-english-v3.0"
        bearerTokenEnv: "COHERE_API_KEY"
```

### TiKV Distributed Storage

```yaml
tikv:
  enabled: true
  replicas: 3
  image: "pingcap/tikv:v8.1.0"
  pdImage: "pingcap/pd:v8.1.0"
  pdReplicas: 3
  storage:
    size: "100Gi"
    storageClassName: "fast-ssd"
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
    limits:
      cpu: "4"
      memory: "8Gi"
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `false` | Enable TiKV backend |
| `replicas` | int | `3` | TiKV server replicas |
| `image` | string | `pingcap/tikv:v8.1.0` | TiKV container image |
| `pdImage` | string | `pingcap/pd:v8.1.0` | Placement Driver image |
| `pdReplicas` | int | `3` | PD replicas |
| `storage` | object | (none) | Storage for TiKV data |
| `resources` | object | (none) | CPU/memory for TiKV pods |

---

## Monitoring

### Prometheus Metrics

Enable Prometheus metrics and ServiceMonitor creation:

```yaml
monitoring:
  enabled: true
  serviceMonitor: true       # Create a ServiceMonitor resource
  metricsPort: 8080          # Metrics endpoint port
  metricsPath: "/metrics"    # Metrics endpoint path
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `false` | Enable Prometheus metrics endpoint |
| `serviceMonitor` | bool | `false` | Create a Prometheus Operator ServiceMonitor |
| `metricsPort` | int | `8080` | Port for `/metrics` endpoint |
| `metricsPath` | string | `"/metrics"` | HTTP path for metrics |

When `serviceMonitor: true`, the operator creates a `ServiceMonitor` resource that Prometheus Operator automatically discovers.

**Operator metrics** are also exposed on the operator pod itself (port 8080):

| Endpoint | Description |
|----------|-------------|
| `/metrics` | Prometheus metrics |
| `/healthz` | Liveness probe |
| `/readyz` | Readiness probe |

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `indentiagraph_cluster_replicas` | Gauge | Desired replica count |
| `indentiagraph_cluster_ready_replicas` | Gauge | Ready replica count |
| `indentiagraph_cluster_phase` | Gauge | Current cluster phase (encoded) |
| `indentiagraph_reconcile_duration_seconds` | Histogram | Reconciliation loop duration |
| `indentiagraph_reconcile_errors_total` | Counter | Reconciliation errors |

---

## Cluster Lifecycle

### Phases

The operator tracks the cluster lifecycle through phases:

| Phase | Description |
|-------|-------------|
| `Pending` | Cluster resources are being created |
| `Starting` | Cluster is starting up and forming Raft consensus |
| `Running` | Cluster is running and healthy |
| `Degraded` | Cluster is operational but not all replicas are ready |
| `Failed` | Cluster is in a failed state |
| `Scaling` | Cluster is being scaled up or down |
| `Upgrading` | Cluster is performing a rolling upgrade |
| `Terminating` | Cluster is being deleted |

### Status Conditions

The operator sets standard Kubernetes-style conditions:

| Condition | Description |
|-----------|-------------|
| `Ready` | Cluster is ready to accept traffic |
| `ConsensusFormed` | Raft consensus has been established |
| `Available` | All desired replicas are available |
| `Progressing` | Cluster is progressing toward desired state |
| `ReconcileError` | An error occurred during reconciliation |
| `SurrealDbHealthy` | External SurrealDB backend is healthy |
| `TikvHealthy` | TiKV backend is healthy |

**Inspect status:**

```bash
kubectl get igc my-cluster -o jsonpath='{.status}' | jq .
```

```json
{
  "phase": "Running",
  "replicas": 3,
  "readyReplicas": 3,
  "leaderNode": "my-cluster-0",
  "raftTerm": 42,
  "conditions": [
    {
      "conditionType": "Ready",
      "status": "True",
      "lastTransitionTime": "2026-03-23T10:15:00Z",
      "reason": "AllReplicasReady",
      "message": "All 3 replicas are ready and healthy"
    },
    {
      "conditionType": "ConsensusFormed",
      "status": "True",
      "lastTransitionTime": "2026-03-23T10:14:30Z",
      "reason": "RaftLeaderElected",
      "message": "Leader elected: my-cluster-0 (term 42)"
    }
  ],
  "lastReconcileTime": "2026-03-23T10:20:00Z",
  "observedGeneration": 3,
  "surrealdb": {
    "readyReplicas": 3,
    "replicas": 3,
    "healthy": true,
    "endpoint": "surrealdb-my-cluster.default.svc:8000",
    "version": "3.0.2"
  }
}
```

---

## Reconciliation

The operator watches `IndentiaGraphCluster` resources and reconciles the following child resources on every change:

| Resource | Kind | Purpose |
|----------|------|---------|
| `{name}` | ConfigMap | IndentiaGraph configuration |
| `{name}` | Service (ClusterIP) | Internal client access |
| `{name}-headless` | Service (Headless) | Pod DNS for Raft peer discovery |
| `{name}` | StatefulSet | IndentiaGraph pods |
| `{name}` | PodDisruptionBudget | Availability during maintenance |
| `surrealdb-{name}` | StatefulSet | External SurrealDB pods (if enabled) |
| `surrealdb-{name}` | Service | SurrealDB access (if enabled) |

The reconciliation loop runs every 60 seconds and on any resource change event. It uses server-side apply with a `indentiagraph.io/finalizer` to ensure clean deletion.

```
IndentiaGraphCluster CR
         │
         ▼
┌─────────────────────┐
│   Reconcile Loop    │
│                     │
│  1. ConfigMap       │
│  2. Services        │
│  3. PDB             │
│  4. StatefulSet     │
│  5. Backend STS     │
│  6. Update Status   │
│                     │
│  Requeue: 60s       │
└─────────────────────┘
```

---

## Scaling

### Manual Scaling

Update the `replicas` field in the CR:

```bash
kubectl patch igc my-cluster --type merge -p '{"spec":{"replicas":5}}'
```

Or edit the YAML:

```bash
kubectl edit igc my-cluster
```

The operator detects the spec change, sets the phase to `Scaling`, updates the StatefulSet, and waits for new pods to become ready before returning to `Running`.

### HPA Integration

The IndentiaGraph operator exposes the `/scale` subresource, enabling Horizontal Pod Autoscaler integration:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: igc-autoscaler
spec:
  scaleTargetRef:
    apiVersion: indentiagraph.io/v1alpha1
    kind: IndentiaGraphCluster
    name: my-cluster
  minReplicas: 3
  maxReplicas: 9
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

!!! warning "HPA and Odd Replicas"
    When using HPA, configure `minReplicas` and `maxReplicas` to odd numbers. If the HPA scales to an even number, the operator will accept it but Raft consensus performance may be suboptimal.

---

## Rolling Upgrades

Update the container image to trigger a rolling upgrade:

```bash
kubectl patch igc my-cluster --type merge \
  -p '{"spec":{"image":"quay.io/indentia/indentiagraph:v1.2.0"}}'
```

The operator:

1. Sets the cluster phase to `Upgrading`.
2. Updates the StatefulSet with the new image.
3. The StatefulSet controller performs a rolling update (one pod at a time, respecting PDB).
4. After all pods are updated and ready, the phase returns to `Running`.

!!! tip "Canary Upgrades"
    For critical production clusters, consider creating a single-replica test cluster with the new image first, running your validation suite, then upgrading the production cluster.

---

## Backup and Restore

### Trigger a Backup via Annotation

```bash
kubectl annotate igc my-cluster indentiagraph.io/backup=now
```

The operator detects the annotation, triggers a snapshot on the Raft leader, and uploads it to the configured backup location.

### Backup Configuration

```yaml
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: my-cluster
spec:
  replicas: 3
  backup:
    enabled: true
    schedule: "0 2 * * *"           # Daily at 02:00
    retention: 7                     # Keep 7 backups
    destination:
      s3:
        bucket: "indentiagraph-backups"
        endpoint: "http://s3.lvm.local"
        secretRef:
          name: "backup-s3-credentials"
```

### Restore from Backup

```yaml
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: restored-cluster
spec:
  replicas: 3
  restore:
    backupName: "my-cluster-2026-03-23-020000"
    source:
      s3:
        bucket: "indentiagraph-backups"
        endpoint: "http://s3.lvm.local"
        secretRef:
          name: "backup-s3-credentials"
```

---

## Examples

### Minimal Single-Node

```yaml
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: dev-cluster
  namespace: default
spec:
  replicas: 1
  storage:
    size: 5Gi
```

### Development Cluster

```yaml
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: dev-cluster
  namespace: development
spec:
  replicas: 3
  image: quay.io/indentia/indentiagraph:latest
  imagePullPolicy: Always
  storage:
    size: 10Gi
  resources:
    requests:
      cpu: "250m"
      memory: "512Mi"
    limits:
      cpu: "1"
      memory: "2Gi"
  elasticsearchCompat:
    enabled: true
    port: 9200
  monitoring:
    enabled: true
    serviceMonitor: false
    metricsPort: 8080
```

### Production Cluster

```yaml
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: prod-cluster
  namespace: production
  labels:
    environment: production
    team: platform
spec:
  replicas: 5

  image: quay.io/indentia/indentiagraph:v1.2.0
  imagePullPolicy: IfNotPresent

  storage:
    size: 100Gi
    storageClassName: fast-ssd
    accessModes:
      - ReadWriteOnce

  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "8Gi"

  raft:
    heartbeatIntervalMs: 150
    electionTimeoutMs: 300
    snapshotThreshold: 10000

  surrealdb:
    enabled: true
    replicas: 3
    image: surrealdb/surrealdb:v3.0.2
    storage:
      size: 50Gi
      storageClassName: fast-ssd
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"

  elasticsearchCompat:
    enabled: true
    port: 9200
    bootstrapAdminSecretRef:
      name: es-admin-secret
    inference:
      defaultEmbeddingProvider: local-embeddings
      providers:
        local-embeddings:
          kind: embedding
          url: "http://embedding-service.ml.svc:8080/embed"
          model: "all-MiniLM-L6-v2"
          timeout: "10s"

  tikv:
    enabled: true
    replicas: 3
    pdReplicas: 3
    storage:
      size: 200Gi
      storageClassName: fast-ssd
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"

  monitoring:
    enabled: true
    serviceMonitor: true
    metricsPort: 8080
    metricsPath: "/metrics"

  nodeSelector:
    node-role.kubernetes.io/database: ""

  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "database"
      effect: "NoSchedule"

  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: indentiagraph
          topologyKey: kubernetes.io/hostname
```

### With TiKV Only (No External SurrealDB)

```yaml
apiVersion: indentiagraph.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: tikv-cluster
  namespace: default
spec:
  replicas: 3
  storage:
    size: 20Gi

  tikv:
    enabled: true
    replicas: 3
    pdReplicas: 3
    storage:
      size: 100Gi

  monitoring:
    enabled: true
    serviceMonitor: true
```

---

## Operator RBAC

The operator requires the following cluster-level permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: indentiagraph-operator
rules:
  - apiGroups: ["indentiagraph.io"]
    resources: ["indentiagraphclusters", "indentiagraphclusters/status"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["monitoring.coreos.com"]
    resources: ["servicemonitors"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
```

---

## Troubleshooting

### Common Issues

**Cluster stuck in `Pending` phase:**

```bash
# Check operator logs
kubectl -n indentiagraph-system logs -l app.kubernetes.io/name=indentiagraph-operator --tail=50

# Check if PVCs are bound
kubectl get pvc -l app.kubernetes.io/instance=my-cluster

# Check pod events
kubectl describe pod my-cluster-0
```

**Raft consensus not forming:**

```bash
# Check all pods are running
kubectl get pods -l app.kubernetes.io/instance=my-cluster

# Check headless service DNS
kubectl run -it --rm dns-test --image=busybox -- nslookup my-cluster-headless

# Check Raft logs
kubectl logs my-cluster-0 | grep -i raft
```

**Operator not reconciling:**

```bash
# Check operator health
kubectl -n indentiagraph-system get pods
kubectl -n indentiagraph-system logs -l app.kubernetes.io/name=indentiagraph-operator --tail=100

# Check for RBAC issues
kubectl auth can-i create statefulsets --as system:serviceaccount:indentiagraph-system:indentiagraph-operator

# Check events
kubectl get events --field-selector involvedObject.kind=IndentiaGraphCluster
```

### Useful Commands

```bash
# List all clusters
kubectl get igc --all-namespaces

# Watch cluster status in real time
kubectl get igc my-cluster -w

# Get full status as YAML
kubectl get igc my-cluster -o yaml

# View operator metrics
kubectl -n indentiagraph-system port-forward svc/indentiagraph-operator-metrics 8080
curl http://localhost:8080/metrics

# Force reconciliation
kubectl annotate igc my-cluster indentiagraph.io/reconcile=$(date +%s)
```

---

## Operator Configuration

The operator itself is configured via command-line flags and environment variables:

| Flag / Env | Default | Description |
|------------|---------|-------------|
| `--metrics-bind-address` | `:8080` | Metrics server listen address |
| `--health-probe-bind-address` | `:8081` | Health probe listen address |
| `RUST_LOG` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `WATCH_NAMESPACE` | (all) | Restrict to a single namespace |

```yaml
# Operator deployment excerpt
containers:
  - name: operator
    image: quay.io/indentia/indentiagraph-operator:v0.1.0
    args:
      - --metrics-bind-address=:8080
      - --health-probe-bind-address=:8081
    env:
      - name: RUST_LOG
        value: "indentiagraph_operator=info,kube=info"
      - name: WATCH_NAMESPACE
        valueFrom:
          fieldRef:
            fieldPath: metadata.namespace
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
```

The operator runs as a non-root user (UID 65534) with a read-only root filesystem and all capabilities dropped.
