# Kubernetes Deployment

This guide covers deploying IndentiaDB on Kubernetes, using either the IndentiaDB Operator (recommended for production) or manual StatefulSet manifests for full control.

## Prerequisites

- Kubernetes 1.28 or later
- `kubectl` configured with cluster access
- A StorageClass that supports dynamic provisioning (for persistent volumes)
- Helm 3.x (optional, for Operator installation)

---

## Option 1: Kubernetes Operator (Recommended)

The IndentiaDB Operator automates cluster provisioning, scaling, failover, and rolling upgrades via a Custom Resource Definition (CRD).

### Install the Operator

Install the CRD and operator directly:

```bash
# Install the CRD
kubectl apply -f https://raw.githubusercontent.com/indentia/indentiagraph-operator/main/config/crd/indentiagraphcluster.yaml

# Install the operator
kubectl apply -f https://raw.githubusercontent.com/indentia/indentiagraph-operator/main/config/operator/operator.yaml
```

Or install with Helm:

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

```yaml
# indentiagraph-cluster.yaml
apiVersion: indentia.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: indentiadb
  namespace: indentiadb
spec:
  # Number of replicas (must be odd for Raft consensus)
  replicas: 3

  image:
    repository: ghcr.io/indentiaplatform/indentiadb-trial
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

Create the namespace and admin credentials secret:

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

Monitor cluster status:

```bash
kubectl get indentiagraphcluster -n indentiadb
kubectl get pods -n indentiadb -w
```

---

## Option 2: Manual StatefulSet

For environments where you need direct control over all Kubernetes resources.

### Namespace and RBAC

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: indentiadb
---
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: indentiadb
  namespace: indentiadb
---
# role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: indentiadb
  namespace: indentiadb
rules:
  - apiGroups: [""]
    resources: ["pods", "endpoints"]
    verbs: ["get", "list", "watch"]
---
# rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: indentiadb
  namespace: indentiadb
subjects:
  - kind: ServiceAccount
    name: indentiadb
    namespace: indentiadb
roleRef:
  kind: Role
  name: indentiadb
  apiGroup: rbac.authorization.k8s.io
```

### Secret for Credentials

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: indentiadb-admin-credentials
  namespace: indentiadb
type: Opaque
stringData:
  username: root
  password: changeme
```

!!! warning "Do not commit secrets to Git"
    Use a secrets manager (Vault, Sealed Secrets, External Secrets Operator) instead of committing plaintext credentials to your repository.

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: indentiadb-config
  namespace: indentiadb
data:
  indentiagraph.toml: |
    [server]
    bind = "0.0.0.0"
    http_port = 7001
    raft_port = 7002
    es_port = 9200

    [search]
    hybrid_scorer = "bayesian"
    vector_search_mode = "hnsw"

    [cache]
    query_cache_size_mb = 512

    [logging]
    level = "info"
    format = "json"
```

### Headless Service (for Raft Discovery)

A headless service is required for DNS-based peer discovery between StatefulSet pods:

```yaml
# headless-service.yaml
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

### ClusterIP Service (for Client Access)

```yaml
# client-service.yaml
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

### StatefulSet with PersistentVolumeClaims

```yaml
# statefulset.yaml
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
      serviceAccountName: indentiadb
      terminationGracePeriodSeconds: 60
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: indentiadb
          image: ghcr.io/indentiaplatform/indentiadb-trial:latest
          imagePullPolicy: IfNotPresent
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
        storageClassName: standard   # Change to your StorageClass
        resources:
          requests:
            storage: 50Gi
```

### PodDisruptionBudget

Ensures at most one pod is unavailable during voluntary disruptions (node drains, upgrades):

```yaml
# pdb.yaml
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

### Ingress with TLS

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: indentiadb
  namespace: indentiadb
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "120"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - indentiadb.example.com
        - indentiadb-es.example.com
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
    - host: indentiadb-es.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: indentiadb
                port:
                  number: 9200
```

### HorizontalPodAutoscaler

!!! note "HPA and Raft"
    IndentiaDB uses Raft consensus which requires an odd number of replicas. HPA min/max should be set to maintain odd replica counts. Consider using the Operator instead, which handles this automatically.

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: indentiadb
  namespace: indentiadb
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: indentiadb
  minReplicas: 3
  maxReplicas: 5
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

### Apply All Resources

```bash
kubectl apply -f namespace.yaml
kubectl apply -f serviceaccount.yaml
kubectl apply -f role.yaml
kubectl apply -f rolebinding.yaml
kubectl apply -f secret.yaml
kubectl apply -f configmap.yaml
kubectl apply -f headless-service.yaml
kubectl apply -f client-service.yaml
kubectl apply -f statefulset.yaml
kubectl apply -f pdb.yaml
kubectl apply -f ingress.yaml
```

---

## Persistent Volumes

The StatefulSet uses `volumeClaimTemplates` to provision one PVC per pod. List provisioned volumes:

```bash
kubectl get pvc -n indentiadb
```

Adjust the `storageClassName` and `storage` size to match your cluster's storage provider:

```yaml
volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard   # e.g., gp3-csi, premium-rwo, local-path
      resources:
        requests:
          storage: 50Gi
```

---

## Monitoring with Prometheus ServiceMonitor

Requires the Prometheus Operator (`kube-prometheus-stack`) to be installed.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: indentiadb
  namespace: indentiadb
  labels:
    app.kubernetes.io/name: indentiadb
    release: kube-prometheus-stack    # Must match Prometheus selector labels
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: indentiadb
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
```

Apply:

```bash
kubectl apply -f servicemonitor.yaml
```

---

## Scaling

IndentiaDB uses Raft consensus; replicas **must be odd** (1, 3, 5, ...).

Scale the cluster:

```bash
# Scale to 5 nodes
kubectl scale statefulset indentiadb -n indentiadb --replicas=5
```

When using the Operator, update the `spec.replicas` field in the `IndentiaGraphCluster` resource instead.

---

## Rolling Updates

The StatefulSet updates pods in reverse ordinal order (highest index first):

```bash
# Update the image
kubectl set image statefulset/indentiadb \
  indentiadb=ghcr.io/indentiaplatform/indentiadb-trial:v1.2.0 \
  -n indentiadb

# Monitor the rollout
kubectl rollout status statefulset/indentiadb -n indentiadb
```

The `PodDisruptionBudget` ensures at most one pod is unavailable during the update.

---

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP | SPARQL, GraphQL, REST API, health, and metrics |
| 7002 | gRPC | Raft inter-node communication |
| 9200 | HTTP | Elasticsearch-compatible search API |
