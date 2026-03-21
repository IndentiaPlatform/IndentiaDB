# IndentiaDB: OpenShift Deployment Guide

This guide covers deploying IndentiaDB on OpenShift (OKD 4.14+ or Red Hat OpenShift 4.x), using either the OperatorHub or manual deployment with Kustomize.

## Prerequisites

- OKD 4.14+ or Red Hat OpenShift 4.x
- `oc` CLI configured with cluster access
- Cluster-admin access (for SCC and operator installation)
- A StorageClass that supports dynamic provisioning (e.g., `gp3-csi`, `thin-csi`, `ocs-storagecluster-ceph-rbd`)

## Option 1: Operator via OperatorHub

The IndentiaDB Operator is available through the OperatorHub for automated lifecycle management.

### Install from OperatorHub

1. Navigate to the OpenShift web console.
2. Go to **Operators > OperatorHub**.
3. Search for **IndentiaDB**.
4. Click **Install** and select the target namespace or install cluster-wide.
5. Accept the default update channel and approval strategy.

Or install via CLI:

```bash
# Create the operator subscription
cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: indentiadb-operator
  namespace: openshift-operators
spec:
  channel: stable
  name: indentiadb-operator
  source: community-operators
  sourceNamespace: openshift-marketplace
  installPlanApproval: Automatic
EOF
```

Verify the operator is installed:

```bash
oc get csv -n openshift-operators | grep indentiadb
```

### Create an IndentiaDB Cluster

```bash
oc new-project indentiadb

# Create admin credentials
oc create secret generic indentiadb-admin-credentials \
  --from-literal=username=root \
  --from-literal=password=changeme

# Deploy the cluster
cat <<EOF | oc apply -f -
apiVersion: indentia.io/v1alpha1
kind: IndentiaGraphCluster
metadata:
  name: indentiadb
  namespace: indentiadb
spec:
  replicas: 3
  image:
    repository: quay.io/indentia/indentiagraph
    tag: latest
  auth:
    adminCredentialsSecret: indentiadb-admin-credentials
  storage:
    size: 50Gi
    storageClassName: gp3-csi
  search:
    hybridScorer: bayesian
    vectorSearchMode: hnsw
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
EOF
```

## Option 2: Manual Deployment with Kustomize

For full control over the deployment manifests, use Kustomize with a base/overlay structure.

### Directory Structure

```
indentiadb-deploy/
  base/
    kustomization.yaml
    namespace.yaml
    configmap.yaml
    secret.yaml
    headless-service.yaml
    client-service.yaml
    statefulset.yaml
    pdb.yaml
    route.yaml
    scc.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
        statefulset-resources.yaml
    production/
      kustomization.yaml
      patches/
        statefulset-resources.yaml
        statefulset-replicas.yaml
```

### Base Kustomization

`base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: indentiadb

resources:
  - namespace.yaml
  - configmap.yaml
  - secret.yaml
  - headless-service.yaml
  - client-service.yaml
  - statefulset.yaml
  - pdb.yaml
  - route.yaml
  - scc.yaml

commonLabels:
  app.kubernetes.io/name: indentiadb
  app.kubernetes.io/part-of: indentiadb
```

### Base Resources

`base/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: indentiadb
  annotations:
    openshift.io/description: "IndentiaDB graph database"
```

`base/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: indentiadb-config
data:
  indentiagraph.toml: |
    [server]
    bind = "0.0.0.0"
    http_port = 7001
    raft_port = 7002
    es_port = 9200
```

`base/headless-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: indentiadb-headless
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

`base/client-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: indentiadb
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

`base/statefulset.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: indentiadb
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
      serviceAccountName: indentiadb
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
        storageClassName: gp3-csi
        resources:
          requests:
            storage: 50Gi
```

`base/pdb.yaml`:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: indentiadb-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: indentiadb
```

### Staging Overlay

`overlays/staging/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: indentiadb-staging

bases:
  - ../../base

namePrefix: staging-

patches:
  - path: patches/statefulset-resources.yaml
```

`overlays/staging/patches/statefulset-resources.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: indentiadb
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: indentiadb
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "2Gi"
```

### Production Overlay

`overlays/production/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: indentiadb-production

bases:
  - ../../base

namePrefix: prod-

patches:
  - path: patches/statefulset-resources.yaml
  - path: patches/statefulset-replicas.yaml
```

`overlays/production/patches/statefulset-replicas.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: indentiadb
spec:
  replicas: 5
```

`overlays/production/patches/statefulset-resources.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: indentiadb
spec:
  template:
    spec:
      containers:
        - name: indentiadb
          resources:
            requests:
              cpu: "1"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "16Gi"
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        resources:
          requests:
            storage: 200Gi
```

### Deploy with Kustomize

```bash
# Staging
oc apply -k overlays/staging/

# Production
oc apply -k overlays/production/
```

## Route Configuration

Expose IndentiaDB via an OpenShift Route with TLS passthrough:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: indentiadb
  namespace: indentiadb
  annotations:
    haproxy.router.openshift.io/timeout: 120s
spec:
  host: indentiadb.apps.example.com
  to:
    kind: Service
    name: indentiadb
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

For the Elasticsearch-compatible endpoint, create a separate Route:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: indentiadb-es
  namespace: indentiadb
spec:
  host: indentiadb-es.apps.example.com
  to:
    kind: Service
    name: indentiadb
    weight: 100
  port:
    targetPort: es-compat
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## SecurityContextConstraints (SCC)

IndentiaDB runs as a non-root user. Create a dedicated SCC and service account:

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: indentiadb-scc
allowPrivilegedContainer: false
runAsUser:
  type: MustRunAsRange
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: MustRunAs
volumes:
  - configMap
  - emptyDir
  - persistentVolumeClaim
  - secret
  - projected
  - downwardAPI
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: indentiadb
  namespace: indentiadb
```

Bind the SCC to the service account:

```bash
oc adm policy add-scc-to-user indentiadb-scc \
  -z indentiadb \
  -n indentiadb
```

## Image Pull from Quay Registry

If your cluster requires explicit pull credentials for `quay.io`:

```bash
# Create the pull secret
oc create secret docker-registry quay-pull-secret \
  --docker-server=quay.io \
  --docker-username=<username> \
  --docker-password=<password> \
  --namespace=indentiadb

# Link to the service account
oc secrets link indentiadb quay-pull-secret --for=pull -n indentiadb
```

## Monitoring Integration

OpenShift includes built-in user workload monitoring. Enable it and create a ServiceMonitor:

### Enable User Workload Monitoring

If not already enabled, create or update the cluster monitoring config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
```

```bash
oc apply -f cluster-monitoring-config.yaml
```

### Create a ServiceMonitor

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

### PrometheusRule (Alerting)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: indentiadb-alerts
  namespace: indentiadb
spec:
  groups:
    - name: indentiadb
      rules:
        - alert: IndentiaDBDown
          expr: up{job="indentiadb"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "IndentiaDB instance {{ $labels.instance }} is down"
        - alert: IndentiaDBHighMemory
          expr: container_memory_usage_bytes{container="indentiadb"} / container_spec_memory_limit_bytes{container="indentiadb"} > 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "IndentiaDB instance {{ $labels.instance }} memory usage above 90%"
```

## ArgoCD GitOps Integration

Deploy IndentiaDB via ArgoCD for a GitOps workflow. Create an ArgoCD Application resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: indentiadb-production
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://gitlab.example.com/infra/indentiadb-deploy.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: indentiadb-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        maxDuration: 3m0s
        factor: 2
```

Apply the ArgoCD Application:

```bash
oc apply -f argocd-application.yaml
```

ArgoCD will automatically sync the Kustomize overlays from Git and reconcile any drift in the cluster.

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP | SPARQL, GraphQL, REST API, health, and metrics |
| 7002 | gRPC | Raft inter-node communication |
| 9200 | HTTP | Elasticsearch-compatible search API |
