# API Reference

IndentiaDB exposes all functionality through two HTTP API surfaces: the primary REST/SPARQL/GraphQL API on port **7001** and the Elasticsearch-compatible API on port **9200**. Both APIs are available on every node in the cluster; clients should connect to the load balancer or the leader node depending on their consistency requirements.

---

## Endpoint Overview

| Endpoint | Port | Method | Path | Description |
|----------|------|--------|------|-------------|
| SPARQL Query | 7001 | GET / POST | `/sparql` | Execute SPARQL 1.2 queries |
| SPARQL Update | 7001 | POST | `/update` | SPARQL UPDATE operations |
| Graph Store | 7001 | GET / PUT / POST / DELETE | `/data` | SPARQL Graph Store Protocol |
| GraphQL | 7001 | POST | `/graphql` | GraphQL queries and mutations |
| SHACL Validation | 7001 | POST | `/shacl/validate` | Validate RDF against SHACL shapes |
| Health | 7001 | GET | `/health` | Server health and cluster status |
| Metrics | 7001 | GET | `/metrics` | Prometheus-compatible metrics |
| WebSocket | 7001 | WS | `/ws` | LIVE SELECT streaming |
| Geospatial | 7001 | POST | `/geospatial/evaluate` | GeoSPARQL function evaluation |
| Alerts | 7001 | GET / POST / DELETE | `/alerts` | Alerting engine |
| ES Cluster Health | 9200 | GET | `/_cluster/health` | Cluster health |
| ES Index Create | 9200 | PUT | `/{index}` | Create or configure an index |
| ES Document Index | 9200 | POST | `/{index}/_doc` | Index a document |
| ES Bulk | 9200 | POST | `/_bulk` | Bulk operations |
| ES Search | 9200 | GET / POST | `/{index}/_search` | Full-text and structured search |
| ES KNN Search | 9200 | POST | `/{index}/_search` | Vector / KNN search |

---

## Authentication

IndentiaDB supports three authentication methods. All API endpoints on both ports require authentication unless the server is started with authentication disabled (development only).

### Bearer Token

Include a JWT or opaque token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

### Basic Authentication

Send Base64-encoded `username:password` in the `Authorization` header:

```http
Authorization: Basic <base64(username:password)>
```

Example with curl:

```bash
curl -u root:changeme http://localhost:7001/health
```

### API Key

Include an API key in the `X-API-Key` header:

```http
X-API-Key: <api-key>
```

!!! note "Authentication Documentation"
    For full details on user management, token issuance, and role-based access control, see the [Security documentation](../security/index.md).

---

## Port Reference

| Port | Protocol | Description |
|------|----------|-------------|
| 7001 | HTTP / WebSocket | SPARQL, GraphQL, REST, health, metrics, WebSocket |
| 7002 | gRPC | Raft inter-node communication (cluster only) |
| 9200 | HTTP | Elasticsearch-compatible API |

---

## Detailed Endpoint Documentation

- [SPARQL, GraphQL, WebSocket, and REST Endpoints](sparql-endpoints.md) — covers `/sparql`, `/update`, `/data`, `/graphql`, `/shacl/validate`, `/ws`, `/health`, and `/metrics`
- [Elasticsearch-Compatible API](elasticsearch-api.md) — covers all `9200` endpoints including search, KNN, bulk operations, aggregations, and SPARQL extensions

---

## Response Formats

All endpoints on port 7001 return JSON by default unless an `Accept` header selects a different RDF serialization format. Port 9200 always returns JSON in the Elasticsearch-compatible response envelope.

Errors follow a consistent JSON structure:

```json
{
  "error": "description of the error",
  "status": 400
}
```

HTTP status codes follow standard semantics:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (DELETE success) |
| 400 | Bad Request (invalid query or body) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |
| 503 | Service Unavailable (cluster not ready) |
