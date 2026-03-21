# IndentiaDB: Kubernetes Deployment Guide

This guide covers deploying IndentiaDB on Kubernetes, using either the IndentiaDB Operator (recommended) or manual StatefulSet manifests.

## Prerequisites

- Kubernetes 1.28 or later
- `kubectl` configured with cluster access
- A StorageClass that supports dynamic provisioning (for persistent volumes)
- Helm 3.x (optional, for operator installation)

## Option 1: Kubernetes Operator (Recommended)

The IndentiaDB Operator automates cluster provisioning, scaling, failover, and upgrades.

### Install the Operator

Install the Custom Resource Definition and operator:

```bash
# Install the CRD
kubectl apply -f https://raw.githubusercontent.com/indentia/indentiagraph-operator/main/config/crd/indentiagraphcluster.yaml

# Install the operator
kubectl apply -f https://raw.githubusercontent.com/indentia/indentiagraph-operator/main/config/operator/operator.yaml
```

Or with Helm:

```bash
helm repo add indentia https://charts.indentia.io
helm repo update
helm install indentiagraph-operator indentia/indentiagraph-operator \
  --namespace indentiadb-system \
  --create-namespace
```

Verify the operator is running:

```bash
kubectl get pods -n indentiadb-system
```

### Create an IndentiaGraphCluster Resource

Create a file named `indentiagraph-cluster.yaml`:

```yaml
apiVersion: indentia.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: indentiadb
  namespace: indentiadb
spec:
  # Number of replicas (must be odd for Raft consensus)
  replicas: 3

  image:
    repository: quay.io/indentia/indentiagraph
    tag: latest
    pullPolicy: IfNotPresent

  # Authentication
  auth:
    adminCredentialsSecret: indentiadb-admin-credentials

  # Resource requests and limits
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"

  # Persistent storage
  storage:
    size: 50Gi
    storageClassName: standard

  # Search configuration
  search:
    hybridScorer: bayesian
    vectorSearchMode: hnsw

  # Ports
  ports:
    http: 7001
    raft: 7002
    esCompat: 9200

  # Pod disruption budget
  disruption:
    maxUnavailable: 1

  # Monitoring
  monitoring:
    enabled: true
    serviceMonitor: true

  # Configuration file (optional)
  configRef:
    name: indentiadb-config
    key: indentiagraph.toml
```

Create the admin credentials secret:

```bash
kubectl create namespace indentiadb

kubectl create secret generic indentiadb-admin-credentials \
  --namespace indentiadb \
  --from-literal=username=root \
  --from-literal=password=changeme
```

Apply the cluster resource:

```bash
kubectl apply -f indentiagraph-cluster.yaml
```

Monitor the cluster status:

```bash
kubectl get indentiagraphcluster -n indentiadb
kubectl get pods -n indentiadb -w
```

## Option 2: Manual StatefulSet

For environments where you prefer direct control over Kubernetes resources.

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: indentiadb
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: indentiadb-config
  namespace: indentiadb
data:
  indentiagraph.toml: |
    # Add your IndentiaDB configuration here
    [server]
    bind = "0.0.0.0"
    http_port = 7001
    raft_port = 7002
    es_port = 9200
```

### Headless Service (Raft Discovery)

A headless service is required for Raft peer discovery between StatefulSet pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: indentiadb-headless
  namespace: indentiadb
  labels:
    app.kubernetes.io/name: indentiadb
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: indentiadb
  ports:
    - name: http
      port: 7001
      targetPort: 7001
    - name: raft
      port: 7002
      targetPort: 7002
    - name: es-compat
      port: 9200
      targetPort: 9200
```

### Client Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: indentiadb
  namespace: indentiadb
  labels:
    app.kubernetes.io/name: indentiadb
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: indentiadb
  ports:
    - name: http
      port: 7001
      targetPort: 7001
    - name: es-compat
      port: 9200
      targetPort: 9200
```

### StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: indentiadb
  namespace: indentiadb
  labels:
    app.kubernetes.io/name: indentiadb
spec:
  serviceName: indentiadb-headless
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app.kubernetes.io/name: indentiadb
  template:
    metadata:
      labels:
        app.kubernetes.io/name: indentiadb
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: indentiadb
          image: quay.io/indentia/indentiagraph:latest
          ports:
            - name: http
              containerPort: 7001
            - name: raft
              containerPort: 7002
            - name: es-compat
              containerPort: 9200
          env:
            - name: SURREAL_USER
              valueFrom:
                secretKeyRef:
                  name: indentiadb-admin-credentials
                  key: username
            - name: SURREAL_PASS
              valueFrom:
                secretKeyRef:
                  name: indentiadb-admin-credentials
                  key: password
            - name: ES_HYBRID_SCORER
              value: "bayesian"
            - name: ES_VECTOR_SEARCH_MODE
              value: "hnsw"
            - name: RAFT_SEED_NODES
              value: "indentiadb-0.indentiadb-headless.indentiadb.svc.cluster.local:7002,indentiadb-1.indentiadb-headless.indentiadb.svc.cluster.local:7002,indentiadb-2.indentiadb-headless.indentiadb.svc.cluster.local:7002"
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /config
          livenessProbe:
            httpGet:
              path: /health
              port: 7001
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 6
          readinessProbe:
            httpGet:
              path: /health
              port: 7001
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
      volumes:
        - name: config
          configMap:
            name: indentiadb-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 50Gi
```

### PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: indentiadb-pdb
  namespace: indentiadb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: indentiadb
```

### Apply All Resources

```bash
kubectl apply -f namespace.yaml
kubectl apply -f indentiadb-admin-credentials.yaml
kubectl apply -f configmap.yaml
kubectl apply -f headless-service.yaml
kubectl apply -f client-service.yaml
kubectl apply -f statefulset.yaml
kubectl apply -f pdb.yaml
```

## Persistent Volumes

The StatefulSet uses `volumeClaimTemplates` to dynamically provision a PersistentVolumeClaim per pod. Adjust the `storageClassName` and `storage` size to match your cluster:

```yaml
volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard   # Change to your StorageClass
      resources:
        requests:
          storage: 50Gi            # Adjust based on expected data size
```

To list provisioned volumes:

```bash
kubectl get pvc -n indentiadb
```

## Monitoring with Prometheus

Create a ServiceMonitor to scrape IndentiaDB metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: indentiadb
  namespace: indentiadb
  labels:
    app.kubernetes.io/name: indentiadb
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: indentiadb
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

## Ingress Configuration

Expose IndentiaDB externally with an Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: indentiadb
  namespace: indentiadb
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - indentiadb.example.com
      secretName: indentiadb-tls
  rules:
    - host: indentiadb.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: indentiadb
                port:
                  number: 7001
          - path: /es
            pathType: Prefix
            backend:
              service:
                name: indentiadb
                port:
                  number: 9200
```

## Scaling

IndentiaDB uses Raft consensus for cluster coordination. The number of replicas **must be odd** (1, 3, 5, ...) to maintain quorum.

Scale the cluster:

```bash
# Scale to 5 nodes
kubectl scale statefulset indentiadb -n indentiadb --replicas=5
```

When using the operator, update the `spec.replicas` field in the `IndentiaGraphCluster` resource instead.

## Rolling Updates

The StatefulSet performs rolling updates by default, replacing pods one at a time starting from the highest ordinal:

```bash
# Update the image
kubectl set image statefulset/indentiadb \
  indentiadb=quay.io/indentia/indentiagraph:v1.2.0 \
  -n indentiadb

# Monitor the rollout
kubectl rollout status statefulset/indentiadb -n indentiadb
```

The `PodDisruptionBudget` ensures that at most one pod is unavailable during the update, preserving cluster availability.

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP | SPARQL, GraphQL, REST API, health, and metrics |
| 7002 | gRPC | Raft inter-node communication |
| 9200 | HTTP | Elasticsearch-compatible search API |
