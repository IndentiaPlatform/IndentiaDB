# OpenShift / OKD Deployment

This guide covers deploying IndentiaDB on OpenShift (OKD 4.14+ or Red Hat OpenShift 4.x). OpenShift introduces additional considerations compared to vanilla Kubernetes: SecurityContextConstraints (SCCs), Routes instead of Ingress, OperatorHub integration, and stricter pod security policies.

## Prerequisites

- OKD 4.14+ or Red Hat OpenShift 4.x
- `oc` CLI configured with cluster access
- Cluster-admin access (required for SCC and operator installation)
- A StorageClass that supports dynamic provisioning: `gp3-csi`, `thin-csi`, or `ocs-storagecluster-ceph-rbd`

---

## OpenShift-Specific Considerations

### SecurityContextConstraints (SCCs)

OpenShift enforces SCCs which restrict what a pod can do at the OS level. IndentiaDB runs as a non-root user (UID 1000) and requires:

- No privileged containers
- `MustRunAsRange` for the UID
- Access to `persistentVolumeClaim`, `configMap`, `secret`, `emptyDir`, `downwardAPI`, and `projected` volumes

### Routes vs Ingress

OpenShift uses `Route` resources instead of standard Kubernetes `Ingress`. Routes are managed by the OpenShift HAProxy router and support edge TLS termination, passthrough, and re-encryption.

### ImageStreams

Internal cluster registries are accessed via `ImageStream` resources. If pulling from `quay.io`, a pull secret must be configured.

---

## Option 1: Operator via OperatorHub

The IndentiaDB Operator is available via OperatorHub for automated lifecycle management.

### Install from the Web Console

1. Navigate to the OpenShift web console.
2. Go to **Operators > OperatorHub**.
3. Search for **IndentiaDB**.
4. Click **Install** and select the target namespace or cluster-wide installation.
5. Accept the default update channel (`stable`) and approval strategy.

### Install via CLI

```bash
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

---

## Option 2: Manual Deployment with Kustomize

For full control, use a Kustomize base/overlay structure.

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

### SecurityContextConstraints

Create a dedicated SCC and service account for IndentiaDB:

```yaml
# base/scc.yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: indentiadb-scc
allowPrivilegedContainer: false
allowPrivilegeEscalation: false
runAsUser:
  type: MustRunAsRange
  uidRangeMin: 1000
  uidRangeMax: 1000
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: MustRunAs
  ranges:
    - min: 1000
      max: 1000
volumes:
  - configMap
  - emptyDir
  - persistentVolumeClaim
  - secret
  - projected
  - downwardAPI
users: []
groups: []
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

### Base Kustomization

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: indentiadb

resources:
  - namespace.yaml
  - scc.yaml
  - configmap.yaml
  - secret.yaml
  - headless-service.yaml
  - client-service.yaml
  - statefulset.yaml
  - pdb.yaml
  - route.yaml

commonLabels:
  app.kubernetes.io/name: indentiadb
  app.kubernetes.io/part-of: indentiadb
```

### Base Resources

```yaml
# base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: indentiadb
  annotations:
    openshift.io/description: "IndentiaDB graph database"
```

```yaml
# base/configmap.yaml
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

    [search]
    hybrid_scorer = "bayesian"
    vector_search_mode = "hnsw"
```

```yaml
# base/headless-service.yaml
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

```yaml
# base/client-service.yaml
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

```yaml
# base/statefulset.yaml
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
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
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
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false
            capabilities:
              drop: ["ALL"]
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

```yaml
# base/pdb.yaml
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

---

## Route with TLS Termination

OpenShift Routes expose the service externally. Create separate routes for the API and ES-compat endpoints:

```yaml
# base/route.yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: indentiadb
  namespace: indentiadb
  annotations:
    haproxy.router.openshift.io/timeout: 120s
    haproxy.router.openshift.io/balance: roundrobin
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
    certificate: |-
      -----BEGIN CERTIFICATE-----
      (your certificate here)
      -----END CERTIFICATE-----
    key: |-
      -----BEGIN PRIVATE KEY-----
      (your private key here)
      -----END PRIVATE KEY-----
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: indentiadb-es
  namespace: indentiadb
  annotations:
    haproxy.router.openshift.io/timeout: 120s
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

For automatic TLS via OpenShift's service serving certificates:

```yaml
metadata:
  annotations:
    service.beta.openshift.io/serving-cert-secret-name: indentiadb-tls
```

---

## Persistent Storage

### Ceph RBD (OCS/ODF)

```yaml
storageClassName: ocs-storagecluster-ceph-rbd
```

### Local Storage

For bare-metal deployments using the Local Storage Operator:

```yaml
storageClassName: local-storage
```

### Thin-csi (VMware / vSphere)

```yaml
storageClassName: thin-csi
```

---

## Staging Overlay

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: indentiadb-staging

bases:
  - ../../base

namePrefix: staging-

patches:
  - path: patches/statefulset-resources.yaml
```

```yaml
# overlays/staging/patches/statefulset-resources.yaml
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

## Production Overlay

```yaml
# overlays/production/kustomization.yaml
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

```yaml
# overlays/production/patches/statefulset-replicas.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: indentiadb
spec:
  replicas: 5
```

```yaml
# overlays/production/patches/statefulset-resources.yaml
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

---

## Image Pull from Quay Registry

If the cluster requires explicit pull credentials for `quay.io`:

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

### ImageStream for Internal Registry

Mirror the image to the internal cluster registry:

```bash
# Import the image into an ImageStream
oc import-image indentiagraph:latest \
  --from=quay.io/indentia/indentiagraph:latest \
  --confirm \
  -n indentiadb

# Update the StatefulSet to use the ImageStream
oc set image statefulset/indentiadb \
  indentiadb=image-registry.openshift-image-registry.svc:5000/indentiadb/indentiagraph:latest \
  -n indentiadb
```

---

## Monitoring Integration

### Enable User Workload Monitoring

```yaml
# cluster-monitoring-config.yaml
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

### ServiceMonitor

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
        - alert: IndentiaDBHighQueryLatency
          expr: histogram_quantile(0.99, rate(indentiadb_query_duration_seconds_bucket[5m])) > 1.0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "IndentiaDB p99 query latency exceeds 1 second on {{ $labels.instance }}"
```

---

## OAuth Proxy for Authentication

Deploy the OpenShift OAuth proxy as a sidecar to protect the IndentiaDB endpoint with OpenShift SSO:

```yaml
# Add to the StatefulSet containers list
- name: oauth-proxy
  image: quay.io/openshift/origin-oauth-proxy:4.14
  ports:
    - containerPort: 8443
      name: oauth-proxy
  args:
    - --https-address=:8443
    - --provider=openshift
    - --openshift-service-account=indentiadb
    - --upstream=http://localhost:7001
    - --tls-cert=/etc/tls/private/tls.crt
    - --tls-key=/etc/tls/private/tls.key
    - --cookie-secret-file=/etc/proxy/secrets/session_secret
  volumeMounts:
    - mountPath: /etc/tls/private
      name: proxy-tls
    - mountPath: /etc/proxy/secrets
      name: proxy-secret
```

Add required RBAC for the OAuth proxy:

```bash
oc adm policy add-cluster-role-to-user system:auth-delegator \
  -z indentiadb \
  -n indentiadb
```

---

## ArgoCD GitOps Integration

Deploy IndentiaDB via ArgoCD for a GitOps workflow:

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

```bash
oc apply -f argocd-application.yaml
```

ArgoCD automatically syncs the Kustomize overlays from Git and reconciles any drift in the cluster.

---

## Ports Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP | SPARQL, GraphQL, REST API, health, and metrics |
| 7002 | gRPC | Raft inter-node communication |
| 9200 | HTTP | Elasticsearch-compatible search API |
