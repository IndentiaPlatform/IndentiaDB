# Authentication

Authentication is the first layer of IndentiaDB's three-layer security model. It establishes the caller's identity and produces a **principal** — a user identity with roles and SIDs (Security Identifiers) used by the authorization and ACL layers.

---

## LDAP (including Windows Active Directory)

LDAP authentication supports any LDAP-compliant directory, including Microsoft Active Directory, OpenLDAP, and FreeIPA.

### Configuration

```toml
[authentication.ldap]
server_url               = "ldaps://ldap.example.com:636"
bind_dn                  = "cn=service,ou=services,dc=example,dc=com"
bind_password            = "${LDAP_BIND_PASSWORD}"
user_search_base         = "ou=users,dc=example,dc=com"
user_search_filter       = "(sAMAccountName={0})"   # AD; use "(uid={0})" for OpenLDAP
group_member_attribute   = "memberOf"
sid_attribute            = "objectSid"
display_name_attribute   = "displayName"
email_attribute          = "mail"
timeout_seconds          = 10
pool_size                = 5
follow_referrals         = false

# Map AD groups to IndentiaDB roles
[authentication.ldap.group_role_mapping]
"CN=IndentiaAdmins,OU=Groups,DC=example,DC=com"         = "admin"
"CN=DataScientists,OU=Groups,DC=example,DC=com"         = "writer"
"CN=Readers,OU=Groups,DC=example,DC=com"                = "reader"

# Map AD groups to Windows SIDs for triple-level ACL
[authentication.ldap.group_sid_mapping]
"CN=Finance,OU=Groups,DC=example,DC=com"                = "S-1-5-21-domain-2001"
"CN=HR,OU=Groups,DC=example,DC=com"                     = "S-1-5-21-domain-2002"
"CN=Engineering,OU=Groups,DC=example,DC=com"            = "S-1-5-21-domain-2003"
"CN=Executive,OU=Groups,DC=example,DC=com"              = "S-1-5-21-domain-2004"
```

### How LDAP Authentication Works

1. Client sends `Authorization: Basic base64(username:password)` header.
2. IndentiaDB takes a connection from the pool and performs a bind with the service DN.
3. A search with `user_search_filter` (substituting `{0}` with the supplied username) retrieves the user's DN and group memberships.
4. IndentiaDB attempts a second bind with the user's DN and supplied password.
5. If the bind succeeds, the `memberOf` attribute is read to determine group membership.
6. Groups are mapped to roles via `group_role_mapping` and to SIDs via `group_sid_mapping`.
7. The connection is returned to the pool.

### Windows SID Support (`objectSid`)

Active Directory stores SIDs as binary `objectSid` attributes. IndentiaDB automatically parses the binary SID format into the standard string representation (`S-1-5-21-<domain>-<RID>`). This allows triple-level ACL annotations to reference AD group SIDs directly.

If the user's own `objectSid` attribute is present, it is also included in the principal's SID set alongside group SIDs.

### Connection Pooling

`pool_size` controls how many pre-established LDAP connections IndentiaDB maintains. Each authentication request borrows a connection from the pool, performs the bind verification, and returns it. Under high authentication load, requests queue until a connection is available.

!!! tip "Pool Size Tuning"
    Set `pool_size` to slightly above your peak concurrent authentication requests. A pool of 5–10 is sufficient for most deployments. Too-large pools waste AD server resources.

### LDAPS (TLS)

Use `ldaps://` (port 636) for encrypted connections. The server's TLS certificate is validated against the system trust store. For self-signed or internal CA certificates:

```toml
[authentication.ldap]
server_url    = "ldaps://ad.internal.example.com:636"
ca_cert_file  = "/etc/indentiadb/certs/internal-ca.pem"
```

---

## OpenID Connect (OIDC) / Keycloak

OIDC is the recommended authentication provider for modern deployments. IndentiaDB acts as an OIDC Resource Server — it validates JWT access tokens issued by the OIDC provider.

### Configuration

```toml
[authentication.oidc]
issuer_url                  = "https://auth.example.com/realms/myrealm"
client_id                   = "indentiadb-client"
audience                    = "indentiadb-api"
roles_claim                 = "realm_access.roles"
sids_claim                  = "groups"
jwks_refresh_interval_secs  = 3600
http_timeout_secs           = 10

[authentication.oidc.role_mapping]
"realm-admin"   = "admin"
"realm-writer"  = "writer"
"realm-reader"  = "reader"
```

### How OIDC Authentication Works

1. Client obtains a JWT access token from the OIDC provider (e.g., via Authorization Code flow, Client Credentials, or Device Authorization Grant).
2. Client sends `Authorization: Bearer <token>` with every request to IndentiaDB.
3. IndentiaDB fetches the OIDC provider's JWKS (JSON Web Key Set) from `{issuer_url}/.well-known/openid-configuration` on first request. The JWKS is cached and refreshed every `jwks_refresh_interval_secs`.
4. The JWT signature is validated against the matching key in the JWKS.
5. Standard claims are verified: `iss` (must match `issuer_url`), `aud` (must contain `audience`), `exp` (must be in the future).
6. Roles are extracted from `roles_claim` (e.g., `realm_access.roles` for Keycloak) and mapped via `role_mapping`.
7. SIDs are extracted from `sids_claim` (e.g., AD group SIDs embedded as a claim by the OIDC provider) and added to the principal's SID set.

### Supported Signing Algorithms

| Algorithm | Type | Notes |
|-----------|------|-------|
| `RS256` | RSA PKCS#1 v1.5, SHA-256 | Most common; Keycloak default |
| `RS384` | RSA PKCS#1 v1.5, SHA-384 | — |
| `RS512` | RSA PKCS#1 v1.5, SHA-512 | — |
| `ES256` | ECDSA P-256, SHA-256 | Smaller tokens, faster verification |
| `ES384` | ECDSA P-384, SHA-384 | — |
| `PS256` | RSA-PSS, SHA-256 | — |
| `PS384` | RSA-PSS, SHA-384 | — |
| `PS512` | RSA-PSS, SHA-512 | — |
| `EdDSA` | Ed25519 | Fastest verification; used by newer providers |

!!! warning "HS256 Not Supported"
    HMAC-based JWT algorithms (`HS256`, `HS384`, `HS512`) are not supported because they require sharing the signing secret with IndentiaDB, which violates the principle of the OIDC provider being the sole issuer. Use RS256 or ES256.

### Keycloak Setup

Configure IndentiaDB as a client in Keycloak:

1. Create a client with `Client Protocol: openid-connect` and `Access Type: bearer-only`.
2. Set `Valid Redirect URIs` to `*` (not required for bearer-only clients).
3. Add a mapper: `Token Claim Name: realm_access.roles`, `Claim JSON Type: JSON`.
4. If using AD group SIDs, configure a `Group Membership` mapper with claim name `groups`.

### Fetching a Token for Testing

```bash
# Client Credentials (service-to-service)
TOKEN=$(curl -s -X POST \
  "https://auth.example.com/realms/myrealm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=my-service" \
  -d "client_secret=$CLIENT_SECRET" \
  | jq -r '.access_token')

# Use the token
curl -X POST http://localhost:7001/sparql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/sparql-query" \
  -d 'SELECT * WHERE { ?s ?p ?o } LIMIT 10'
```

---

## JWT Bearer Tokens

For service accounts and programmatic access, IndentiaDB can validate JWTs issued by any standard-compliant OIDC provider or by an internal token service. Configure as OIDC above — JWT bearer authentication is the underlying mechanism used by the OIDC integration.

For self-issued JWTs (e.g., tokens issued by your own backend):

```toml
[authentication.jwt]
algorithm          = "RS256"
public_key_file    = "/etc/indentiadb/certs/jwt-public-key.pem"
audience           = "indentiadb-api"
issuer             = "https://my-service.example.com"
roles_claim        = "roles"
sids_claim         = "sids"
```

### JWT Claim Structure

IndentiaDB reads the following claims from the JWT:

| Claim | Required | Description |
|-------|---------|-------------|
| `sub` | Yes | Subject (user identifier) |
| `iss` | Yes | Issuer (validated against config) |
| `aud` | Yes | Audience (validated against config) |
| `exp` | Yes | Expiry timestamp |
| `iat` | No | Issued-at timestamp |
| Configured `roles_claim` | No | Array of role strings |
| Configured `sids_claim` | No | Array of SID strings |

---

## HTTP Basic Auth

Basic Auth is supported for backward compatibility and development convenience. Credentials are sent as `Authorization: Basic base64(username:password)`.

!!! danger "Use Only for Development"
    HTTP Basic Auth transmits credentials with every request. Without TLS, credentials are exposed in plaintext. In production, always use OIDC/JWT with HTTPS, or LDAP over LDAPS. Basic Auth is suitable only for local development on `localhost`.

```toml
[authentication.basic]
enabled = true
users = [
    { username = "dev-admin", password_hash = "$argon2id$v=19$m=65536,t=3,p=4$...", roles = ["admin"] },
    { username = "dev-reader", password_hash = "$argon2id$v=19$m=65536,t=3,p=4$...", roles = ["reader"] },
]
```

Passwords are stored as Argon2id hashes. Generate a hash:

```bash
indentiagraph auth hash-password --password "mysecretpassword"
# Output: $argon2id$v=19$m=65536,t=3,p=4$...
```

---

## CLI Authentication

The IndentiaDB CLI supports OIDC Device Authorization Grant (device flow) for interactive logins — no browser redirect required for CLI use.

### OIDC Device Login

```bash
indentiagraph auth login \
  --profile dev \
  --endpoint http://localhost:7001 \
  --issuer https://auth.example.com/realms/main \
  --client-id indentiagraph-cli \
  --scope "openid profile email offline_access" \
  --default
```

The CLI prints a verification URL and code:

```
Open https://auth.example.com/realms/main/device in your browser
Enter code: ABCD-EFGH
Waiting for authorization...
✓ Logged in as alice@example.com (roles: admin)
Profile 'dev' saved.
```

`--default` marks this profile as the default for subsequent CLI commands.

### List Profiles

```bash
indentiagraph auth profiles list
```

```
NAME     ENDPOINT                  USER                    EXPIRES
dev *    http://localhost:7001     alice@example.com       2025-11-15T10:30:00Z
staging  http://staging:7001       alice@example.com       2025-11-15T08:00:00Z
prod     http://prod-lb:7001       svc-deploy@example.com  never (client_credentials)
```

### Get Current Token

```bash
indentiagraph auth token --profile dev
```

Prints the raw JWT access token to stdout. Useful for scripting:

```bash
TOKEN=$(indentiagraph auth token --profile dev)
curl -H "Authorization: Bearer $TOKEN" http://localhost:7001/sparql ...
```

### Refresh Token

```bash
indentiagraph auth token --profile dev --refresh
```

Uses the stored refresh token to obtain a new access token from the OIDC provider. The profile is updated with the new tokens. The CLI automatically refreshes expired tokens before each command.

---

## Rate Limiting (Brute Force Protection)

IndentiaDB applies per-IP rate limiting on authentication endpoints to prevent brute-force attacks:

```toml
[authentication.rate_limiting]
enabled              = true
max_attempts         = 10          # Failed attempts before lockout
window_seconds       = 300         # Time window for counting failures (5 min)
lockout_duration     = 900         # Lockout duration in seconds (15 min)
whitelist            = ["127.0.0.1", "10.0.0.0/8"]  # Never rate-limited
```

Behavior:
- After `max_attempts` failed authentication attempts from the same IP within `window_seconds`, the IP is locked out for `lockout_duration` seconds.
- Locked-out requests return `429 Too Many Requests` with a `Retry-After` header.
- Successful authentications do not reset the failure counter (to prevent rate-limit bypass via interleaved successes).
- IPs in `whitelist` are never rate-limited (use for monitoring, load balancers, internal services).

!!! warning "Distributed Deployments"
    Rate limiting state is stored in-process. In a multi-node Raft cluster, each node tracks its own failure counts. To share rate-limit state across nodes, configure Redis as the rate-limit backend:

    ```toml
    [authentication.rate_limiting]
    backend = "redis"
    redis_url = "redis://redis.internal:6379/0"
    ```

---

## HTTP Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `401 Unauthorized` | Authentication required or failed | Missing `Authorization` header; expired JWT; invalid Basic Auth credentials; LDAP bind failure |
| `403 Forbidden` | Authenticated but not authorized | Role has `Read` permission but request needs `Write`; ACL blocks access to the requested graph |
| `429 Too Many Requests` | Rate limit exceeded | Too many failed login attempts from this IP |

The `401` response includes a `WWW-Authenticate` header indicating the supported schemes:

```
WWW-Authenticate: Bearer realm="IndentiaDB", error="invalid_token", error_description="Token expired"
WWW-Authenticate: Basic realm="IndentiaDB"
```
