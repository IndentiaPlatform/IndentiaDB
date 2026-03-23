# WebAssembly Runtime

IndentiaDB's SPARQL engine compiles to WebAssembly (WASM), enabling RDF triple pattern lookups and vocabulary resolution to run entirely in the browser or on edge runtimes -- with no server round-trips. The WASM module loads pre-built index and vocabulary files into memory and exposes a JavaScript/TypeScript API for scanning triples, resolving term IDs, and inspecting index statistics.

---

## Overview

The WASM runtime packages IndentiaDB's core storage layer -- permutation indices and vocabulary -- into a WebAssembly module that runs in any environment with a WASM runtime: modern browsers, Cloudflare Workers, Deno Deploy, Node.js, and Fastly Compute.

| Capability | WASM Runtime | Full Server |
|------------|:------------:|:-----------:|
| Triple pattern scan (SPO, POS, OSP) | Yes | Yes |
| Vocabulary lookup (term ID to string) | Yes | Yes |
| SPARQL SELECT/CONSTRUCT/ASK | Planned | Yes |
| SPARQL UPDATE | No | Yes |
| Full-text / BM25 search | No | Yes |
| Vector search (HNSW) | No | Yes |
| Federation (SERVICE) | No | Yes |
| Persistence / write-ahead log | No | Yes |
| Authentication / ACL | No | Yes |
| Elasticsearch-compatible API | No | Yes |

!!! note "Query-Only, No Persistence"
    The WASM runtime is read-only. It loads pre-built index files into memory and supports triple pattern lookups and vocabulary resolution. It does not support SPARQL UPDATE, write operations, full-text search, or vector search. For a full-featured deployment, use the native server binary.

---

## Installation

### npm Package

```bash
npm install @indentia/graph-wasm
```

### CDN (ES Module)

```html
<script type="module">
  import init, { WasmEngine, WasmVocabulary, WasmIndex }
    from 'https://cdn.indentia.ai/wasm/latest/indentiagraph_wasm.js';

  await init();
</script>
```

### Manual Build

Build the WASM module from source using `wasm-pack`:

```bash
# Install wasm-pack
cargo install wasm-pack

# Build for browser (ES module output)
cd indentiagraph-wasm
wasm-pack build --target web --release

# Build for Node.js
wasm-pack build --target nodejs --release

# Build for bundlers (webpack, vite, etc.)
wasm-pack build --target bundler --release
```

The build output is placed in `pkg/`:

```
pkg/
  indentiagraph_wasm.js       # JavaScript glue code
  indentiagraph_wasm_bg.wasm  # WebAssembly binary (~1.2 MB gzipped)
  indentiagraph_wasm.d.ts     # TypeScript type declarations
  package.json                # npm package metadata
```

---

## Core API

The WASM runtime exposes four main classes: `WasmEngine`, `WasmVocabulary`, `WasmIndex`, and `WasmQueryResults`.

### `WasmVocabulary`

The vocabulary maps between integer term IDs and their string representations (IRIs, blank nodes, literals).

```typescript
class WasmVocabulary {
  /** Load vocabulary from raw byte arrays. */
  static from_bytes(vocab_data: Uint8Array, offset_data: Uint8Array): WasmVocabulary;

  /** Create an empty vocabulary (for testing). */
  static empty(): WasmVocabulary;

  /** Number of terms in the vocabulary. */
  len(): number;

  /** Check if the vocabulary is empty. */
  is_empty(): boolean;

  /** Look up a term by its integer ID. Returns null if not found. */
  get_by_index(id: bigint): string | null;

  /** Check if a term ID represents a literal (vs IRI or blank node). */
  is_literal(id: bigint): boolean;

  /** Check if a term ID represents an IRI or blank node. */
  is_iri_or_blank(id: bigint): boolean;

  /** Get the boundary index between literals and IRIs. */
  first_iri_index(): number;

  /** Get vocabulary statistics as a JSON object. */
  stats(): { term_count: number; first_iri_index: number; is_empty: boolean };
}
```

### `WasmIndex`

A permutation index stores triples in a specific column order (e.g., SPO, POS, OSP) to enable efficient prefix-based lookups.

```typescript
class WasmIndex {
  /** Load an index from raw byte arrays. */
  static from_bytes(
    permutation: 'SPO' | 'SOP' | 'PSO' | 'POS' | 'OSP' | 'OPS',
    data: Uint8Array,
    metadata: Uint8Array
  ): WasmIndex;

  /** Get the permutation type as a string. */
  permutation(): string;

  /** Total number of triples in this index. */
  num_triples(): bigint;

  /** Number of compressed blocks. */
  num_blocks(): number;

  /** Check if the index is empty. */
  is_empty(): boolean;

  /**
   * Scan for triples matching a prefix pattern.
   * prefix: Array of 0-3 term IDs.
   *   [] = all triples
   *   [s] = triples with subject s
   *   [s, p] = triples with subject s and predicate p
   *   [s, p, o] = exact triple lookup
   * Returns: Array of [subject_id, predicate_id, object_id] tuples.
   */
  scan(prefix: bigint[], limit: number): [bigint, bigint, bigint][];

  /** Count triples matching a prefix (more efficient than scan). */
  count(prefix: bigint[]): bigint;

  /** Check if any triple matches the prefix. */
  exists(prefix: bigint[]): boolean;

  /** Get index statistics as a JSON object. */
  stats(): { permutation: string; triple_count: number; block_count: number; is_empty: boolean };
}
```

### `WasmEngine`

A convenience wrapper that combines a vocabulary with one or more permutation indices.

```typescript
class WasmEngine {
  /** Create an engine with the given vocabulary. */
  constructor(vocabulary: WasmVocabulary);

  /** Attach the SPO index. */
  set_spo_index(index: WasmIndex): void;

  /** Attach the POS index. */
  set_pos_index(index: WasmIndex): void;

  /** Attach the OSP index. */
  set_osp_index(index: WasmIndex): void;

  /** Get vocabulary statistics. */
  vocab_stats(): { term_count: number; is_empty: boolean };

  /** Get index statistics for all loaded indices. */
  index_stats(): {
    spo: { triple_count: number; block_count: number } | null;
    pos: { triple_count: number; block_count: number } | null;
    osp: { triple_count: number; block_count: number } | null;
  };

  /** Look up a term string by its ID. */
  lookup_term(id: bigint): string | null;

  /** Scan triples from the SPO index. */
  scan(prefix: bigint[], limit: number): [bigint, bigint, bigint][];

  /** Resolve term IDs to their string representations. */
  resolve_triple(
    subject_id: bigint,
    predicate_id: bigint,
    object_id: bigint
  ): { subject: string; predicate: string; object: string };
}
```

### `version()`

Returns the library version string:

```javascript
import { version } from '@indentia/graph-wasm';
console.log(version()); // "1.4.2"
```

---

## Loading Data

The WASM runtime requires pre-built index files exported from a running IndentiaDB instance. These files are typically served as static assets.

### Required Files

| File | Description | Typical Size |
|------|-------------|--------------|
| `vocabulary` | Concatenated term strings | 10 MB - 2 GB |
| `vocabulary.offsets` | Offset table into vocabulary | ~8 bytes per term |
| `spo` | SPO permutation index (compressed blocks) | 5 MB - 1 GB |
| `spo.meta` | SPO block metadata | ~20 bytes per block |
| `pos` | POS permutation index | 5 MB - 1 GB |
| `pos.meta` | POS block metadata | ~20 bytes per block |
| `osp` | OSP permutation index | 5 MB - 1 GB |
| `osp.meta` | OSP block metadata | ~20 bytes per block |

!!! tip "Not All Indices Are Required"
    Load only the permutation indices you need. For subject-centric lookups, only the SPO index is necessary. For predicate-centric queries (e.g., "find all triples with predicate `rdf:type`"), load POS. Load all three for full triple pattern flexibility.

### Exporting Index Files

Export index files from a running IndentiaDB instance:

```bash
# Export all index files to a directory
indentiagraph backup create \
  --source /var/lib/indentiadb/data \
  --repository ./wasm-export \
  --index "spo=permutations/spo" \
  --index "pos=permutations/pos" \
  --index "osp=permutations/osp" \
  --path "vocabulary=vocabulary"
```

---

## Browser Example

### Complete Browser Application

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IndentiaDB WASM Triple Browser</title>
</head>
<body>
  <h1>IndentiaDB WASM Triple Browser</h1>
  <div id="stats"></div>
  <div>
    <input id="subject-id" type="number" placeholder="Subject ID">
    <button id="scan-btn">Scan Triples</button>
  </div>
  <pre id="results"></pre>

  <script type="module">
    import init, { WasmEngine, WasmVocabulary, WasmIndex }
      from './pkg/indentiagraph_wasm.js';

    async function loadBytes(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }

    async function main() {
      // Initialize WASM module
      await init();

      // Load vocabulary
      const [vocabData, offsetData] = await Promise.all([
        loadBytes('/data/vocabulary'),
        loadBytes('/data/vocabulary.offsets'),
      ]);
      const vocab = WasmVocabulary.from_bytes(vocabData, offsetData);

      // Load SPO index
      const [spoData, spoMeta] = await Promise.all([
        loadBytes('/data/spo'),
        loadBytes('/data/spo.meta'),
      ]);
      const spoIndex = WasmIndex.from_bytes('SPO', spoData, spoMeta);

      // Create engine
      const engine = new WasmEngine(vocab);
      engine.set_spo_index(spoIndex);

      // Display statistics
      const vocabStats = engine.vocab_stats();
      const indexStats = engine.index_stats();
      document.getElementById('stats').innerHTML = `
        <p>Vocabulary: ${vocabStats.term_count} terms</p>
        <p>SPO Index: ${indexStats.spo?.triple_count ?? 0} triples
           in ${indexStats.spo?.block_count ?? 0} blocks</p>
      `;

      // Scan button handler
      document.getElementById('scan-btn').addEventListener('click', () => {
        const subjectId = document.getElementById('subject-id').value;
        const prefix = subjectId ? [BigInt(subjectId)] : [];
        const triples = engine.scan(prefix, 50);

        const resolved = triples.map(([s, p, o]) => {
          const triple = engine.resolve_triple(s, p, o);
          return `${triple.subject}  ${triple.predicate}  ${triple.object}`;
        });

        document.getElementById('results').textContent = resolved.join('\n');
      });
    }

    main().catch(console.error);
  </script>
</body>
</html>
```

---

## Node.js / Server-Side Example

```javascript
const { WasmEngine, WasmVocabulary, WasmIndex } = require('@indentia/graph-wasm');
const fs = require('fs');

// Load files from disk
const vocabData = new Uint8Array(fs.readFileSync('./data/vocabulary'));
const offsetData = new Uint8Array(fs.readFileSync('./data/vocabulary.offsets'));
const spoData = new Uint8Array(fs.readFileSync('./data/spo'));
const spoMeta = new Uint8Array(fs.readFileSync('./data/spo.meta'));

// Build engine
const vocab = WasmVocabulary.from_bytes(vocabData, offsetData);
const spoIndex = WasmIndex.from_bytes('SPO', spoData, spoMeta);

const engine = new WasmEngine(vocab);
engine.set_spo_index(spoIndex);

// Scan all triples (first 100)
const triples = engine.scan([], 100);
for (const [s, p, o] of triples) {
  const resolved = engine.resolve_triple(s, p, o);
  console.log(`${resolved.subject}  ${resolved.predicate}  ${resolved.object}`);
}
```

---

## Edge Runtime Example (Cloudflare Workers)

Deploy a lightweight triple lookup API on Cloudflare Workers:

```javascript
import init, { WasmEngine, WasmVocabulary, WasmIndex }
  from '@indentia/graph-wasm';

let engine = null;

async function initEngine(env) {
  if (engine) return engine;

  await init();

  // Load from R2 or KV storage
  const [vocabData, offsetData, spoData, spoMeta] = await Promise.all([
    env.INDEX_BUCKET.get('vocabulary').then(r => r.arrayBuffer()),
    env.INDEX_BUCKET.get('vocabulary.offsets').then(r => r.arrayBuffer()),
    env.INDEX_BUCKET.get('spo').then(r => r.arrayBuffer()),
    env.INDEX_BUCKET.get('spo.meta').then(r => r.arrayBuffer()),
  ]);

  const vocab = WasmVocabulary.from_bytes(
    new Uint8Array(vocabData),
    new Uint8Array(offsetData)
  );
  const spoIndex = WasmIndex.from_bytes(
    'SPO',
    new Uint8Array(spoData),
    new Uint8Array(spoMeta)
  );

  engine = new WasmEngine(vocab);
  engine.set_spo_index(spoIndex);
  return engine;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const e = await initEngine(env);

    if (url.pathname === '/stats') {
      return Response.json({
        vocab: e.vocab_stats(),
        indices: e.index_stats(),
      });
    }

    if (url.pathname === '/scan') {
      const subjectId = url.searchParams.get('subject');
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const prefix = subjectId ? [BigInt(subjectId)] : [];
      const triples = e.scan(prefix, limit);

      const resolved = triples.map(([s, p, o]) => e.resolve_triple(s, p, o));
      return Response.json({ count: resolved.length, triples: resolved });
    }

    if (url.pathname === '/lookup') {
      const termId = url.searchParams.get('id');
      if (!termId) return new Response('Missing id parameter', { status: 400 });
      const term = e.lookup_term(BigInt(termId));
      return Response.json({ id: termId, term });
    }

    return new Response('Not found', { status: 404 });
  }
};
```

---

## TypeScript Integration

The npm package ships with TypeScript declarations. Import types directly:

```typescript
import init, {
  WasmEngine,
  WasmVocabulary,
  WasmIndex,
  version,
} from '@indentia/graph-wasm';

async function buildEngine(baseUrl: string): Promise<WasmEngine> {
  await init();

  const load = async (path: string): Promise<Uint8Array> => {
    const res = await fetch(`${baseUrl}/${path}`);
    return new Uint8Array(await res.arrayBuffer());
  };

  const vocab = WasmVocabulary.from_bytes(
    await load('vocabulary'),
    await load('vocabulary.offsets'),
  );

  const engine = new WasmEngine(vocab);

  // Load indices in parallel
  const [spoData, spoMeta, posData, posMeta] = await Promise.all([
    load('spo'), load('spo.meta'),
    load('pos'), load('pos.meta'),
  ]);

  engine.set_spo_index(WasmIndex.from_bytes('SPO', spoData, spoMeta));
  engine.set_pos_index(WasmIndex.from_bytes('POS', posData, posMeta));

  return engine;
}

// Usage
const engine = await buildEngine('https://cdn.example.com/indentiadb-index');
console.log(`Loaded ${engine.vocab_stats().term_count} terms`);
```

---

## Performance Considerations

### Memory

The WASM runtime loads all index data into linear memory. Plan for approximately:

| Dataset Size (triples) | Vocabulary | Index Files (SPO) | Total Memory |
|------------------------|------------|-------------------|--------------|
| 100,000 | ~5 MB | ~3 MB | ~15 MB |
| 1,000,000 | ~40 MB | ~25 MB | ~100 MB |
| 10,000,000 | ~300 MB | ~200 MB | ~800 MB |
| 100,000,000 | ~2 GB | ~1.5 GB | ~5 GB |

!!! warning "Browser Memory Limits"
    Most browsers limit WASM linear memory to 2-4 GB. For datasets larger than ~50 million triples, use the native server binary instead of the WASM runtime. Edge runtimes (Cloudflare Workers, Deno Deploy) typically have lower memory limits (128 MB - 512 MB).

### Startup Time

Initial loading involves fetching index files over the network and decompressing blocks into memory. Expect:

| Dataset Size | File Transfer (50 Mbps) | Initialization | Total |
|-------------|------------------------|----------------|-------|
| 100K triples | < 1s | < 100ms | ~1s |
| 1M triples | ~5s | ~500ms | ~6s |
| 10M triples | ~40s | ~3s | ~45s |

Use HTTP range requests or split indices into chunks for progressive loading of large datasets.

### Query Latency

Once loaded, triple pattern scans are fast:

| Operation | Latency |
|-----------|---------|
| Exact triple lookup (`scan([s, p, o], 1)`) | < 1 ms |
| Subject scan (`scan([s], 100)`) | 1-5 ms |
| Full scan (`scan([], 1000)`) | 5-20 ms |
| Term lookup (`lookup_term(id)`) | < 0.1 ms |

---

## Supported Permutations

Each permutation index optimizes for a different query pattern:

| Permutation | Column Order | Optimized Query Pattern |
|-------------|-------------|------------------------|
| `SPO` | Subject, Predicate, Object | "Find all properties of entity X" |
| `SOP` | Subject, Object, Predicate | "Find the relationship between X and Y" |
| `PSO` | Predicate, Subject, Object | "Find all entities with property P" |
| `POS` | Predicate, Object, Subject | "Find entities where P = value" |
| `OSP` | Object, Subject, Predicate | "Find all entities that reference Y" |
| `OPS` | Object, Predicate, Subject | "Find entities linked to Y via P" |

For most use cases, loading SPO and POS provides good coverage. Add OSP if you need reverse lookups (finding which subjects reference a given object).

---

## Build Configuration

The `Cargo.toml` for the WASM crate:

```toml
[package]
name = "indentiagraph-wasm"
description = "WebAssembly bindings for IndentiaGraph SPARQL engine"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
js-sys = "0.3"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde-wasm-bindgen = "0.6"
getrandom = { version = "0.3", features = ["wasm_js"] }
console_error_panic_hook = { version = "0.1", optional = true }

[features]
default = ["console_error_panic_hook"]
```

!!! tip "Reducing WASM Binary Size"
    The release build with `wasm-opt` disabled produces a ~1.2 MB gzipped binary. Enable `wasm-opt` in `wasm-pack` for further size reduction (~15-20% smaller), at the cost of longer build times. Set `lto = true` and `codegen-units = 1` in the workspace `[profile.release]` for maximum optimization.
