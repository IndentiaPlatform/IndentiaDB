# Geospatial

IndentiaDB supports GeoSPARQL — the OGC/W3C standard for spatial querying of RDF data. Geometries are stored as RDF literals with type `geo:wktLiteral`, indexed with 60-bit precision, and queried with standard GeoSPARQL functions.

---

## 60-Bit Geospatial Encoding

IndentiaDB encodes each geometry's bounding-box centroid as a 60-bit integer by interleaving 30 bits of latitude and 30 bits of longitude. This encoding:

- Fits in a single 64-bit machine word for fast comparison.
- Provides ~1cm precision at the equator (2^30 subdivisions over ±90°/±180°).
- Maps naturally to the existing key-value index as a range-scannable spatial prefix.

Point lookups use the exact 60-bit code. Range-based spatial queries (within bounding box, distance radius) are implemented as key-range scans over the encoded space, followed by precise geometric refinement using WKT.

!!! note "Supported Geometry Types"
    `POINT`, `LINESTRING`, `POLYGON`, `MULTIPOINT`, `MULTILINESTRING`, `MULTIPOLYGON`, and `GEOMETRYCOLLECTION` are all supported in WKT format. All coordinates are in WGS 84 (EPSG:4326) — longitude first, latitude second, matching the GeoSPARQL standard.

---

## WKT (Well-Known Text) Parsing

Geometries are stored as WKT literals typed as `geo:wktLiteral`:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX ex:   <http://example.org/>

INSERT DATA {
    ex:amsterdam
        a ex:City ;
        ex:name "Amsterdam" ;
        geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POINT(4.9 52.37)"^^geo:wktLiteral
        ] .

    ex:rotterdam
        a ex:City ;
        ex:name "Rotterdam" ;
        geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POINT(4.48 51.92)"^^geo:wktLiteral
        ] .

    ex:port_area
        a ex:Zone ;
        ex:name "Port of Rotterdam" ;
        geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POLYGON((4.38 51.88, 4.58 51.88, 4.58 51.96, 4.38 51.96, 4.38 51.88))"^^geo:wktLiteral
        ] .
}
```

---

## Nearest Neighbor Query

Find the N nearest places to a reference point:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?place ?name ?distance WHERE {
    ?place a ex:City ;
           ex:name ?name ;
           geo:hasGeometry ?geom .
    ?geom geo:asWKT ?wkt .

    BIND(geof:distance(?wkt, "POINT(4.9 52.37)"^^geo:wktLiteral, "km") AS ?distance)
    FILTER(?distance < 100)
}
ORDER BY ?distance
LIMIT 10
```

---

## Distance Join Query

Join two sets of geometries by spatial proximity:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?store ?hospital ?distance WHERE {
    # All stores
    ?store a ex:Store ;
           geo:hasGeometry/geo:asWKT ?storeWkt .

    # All hospitals
    ?hospital a ex:Hospital ;
              geo:hasGeometry/geo:asWKT ?hospitalWkt .

    # Compute distance
    BIND(geof:distance(?storeWkt, ?hospitalWkt, "km") AS ?distance)
    FILTER(?distance < 2.0)
}
ORDER BY ?store ?distance
```

This returns every (store, hospital) pair where the hospital is within 2 km of the store.

---

## GeoSPARQL Functions Reference

| Function | Description | Example |
|----------|-------------|---------|
| `geof:distance(geom1, geom2, units)` | Distance between geometries | `geof:distance(?wkt1, ?wkt2, "km")` |
| `geof:buffer(geom, radius, units)` | Buffer polygon around geometry | `geof:buffer(?wkt, 1.5, "km")` |
| `geof:within(geom1, geom2)` | True if geom1 is within geom2 | `FILTER(geof:within(?point, ?polygon))` |
| `geof:contains(geom1, geom2)` | True if geom1 contains geom2 | `FILTER(geof:contains(?region, ?store))` |
| `geof:intersects(geom1, geom2)` | True if geometries intersect | `FILTER(geof:intersects(?route, ?zone))` |
| `geof:touches(geom1, geom2)` | True if geometries share a boundary | `FILTER(geof:touches(?parcel1, ?parcel2))` |
| `geof:overlaps(geom1, geom2)` | True if geometries overlap | `FILTER(geof:overlaps(?zone1, ?zone2))` |
| `geof:disjoint(geom1, geom2)` | True if geometries have no intersection | `FILTER(geof:disjoint(?area, ?exclusionZone))` |
| `geof:union(geom1, geom2)` | Union of two geometries | `BIND(geof:union(?geom1, ?geom2) AS ?merged)` |
| `geof:envelope(geom)` | Bounding box of a geometry | `BIND(geof:envelope(?polygon) AS ?bbox)` |
| `geof:centroid(geom)` | Centroid point | `BIND(geof:centroid(?polygon) AS ?center)` |

Unit strings: `"km"`, `"m"`, `"mi"`, `"ft"`, `"deg"` (decimal degrees).

---

## SPARQL GeoSPARQL Query: Places Within 50km

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?place ?name ?distance WHERE {
    ?place a ex:Place ;
           ex:name ?name ;
           geo:hasGeometry ?geom .
    ?geom geo:asWKT ?wkt .

    BIND(geof:distance(?wkt, "POINT(4.9 52.37)"^^geo:wktLiteral, "km") AS ?distance)
    FILTER(?distance < 50)
}
ORDER BY ?distance
```

---

## SPARQL GeoSPARQL Query: Points Within a Polygon

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?sensor ?name WHERE {
    ?sensor a ex:Sensor ;
            ex:name ?name ;
            geo:hasGeometry/geo:asWKT ?sensorWkt .

    FILTER(geof:within(
        ?sensorWkt,
        "POLYGON((4.8 52.3, 5.1 52.3, 5.1 52.5, 4.8 52.5, 4.8 52.3))"^^geo:wktLiteral
    ))
}
```

---

## CLI: Compute Distance Between Two Points

```bash
indentiagraph query geo \
  --profile dev \
  --function geof:distance \
  --arg '{"wkt":"POINT(4.9 52.37)"}' \
  --arg '{"wkt":"POINT(5.12 52.09)"}' \
  --unit km
```

**Output:**

```json
{
  "function": "geof:distance",
  "result": 34.72,
  "unit": "km"
}
```

Other CLI examples:

```bash
# Buffer a point by 1km (returns WKT polygon)
indentiagraph query geo \
  --profile dev \
  --function geof:buffer \
  --arg '{"wkt":"POINT(4.9 52.37)"}' \
  --arg '{"radius": 1.0, "unit": "km"}'

# Check if a point is within a polygon
indentiagraph query geo \
  --profile dev \
  --function geof:within \
  --arg '{"wkt":"POINT(4.9 52.37)"}' \
  --arg '{"wkt":"POLYGON((4.8 52.3, 5.1 52.3, 5.1 52.5, 4.8 52.5, 4.8 52.3))"}'
```

---

## Python Integration Example

```python
import requests
import json

SPARQL_ENDPOINT = "http://localhost:7001/sparql"
UPDATE_ENDPOINT = "http://localhost:7001/update"

def insert_location(uri: str, name: str, lon: float, lat: float):
    """Insert a named location with a WKT point geometry."""
    sparql_update = f"""
        PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
        PREFIX ex:   <http://example.org/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        INSERT DATA {{
            <{uri}>
                a ex:Location ;
                rdfs:label "{name}" ;
                geo:hasGeometry [
                    a geo:Geometry ;
                    geo:asWKT "POINT({lon} {lat})"^^geo:wktLiteral
                ] .
        }}
    """
    resp = requests.post(
        UPDATE_ENDPOINT,
        headers={"Content-Type": "application/sparql-update"},
        data=sparql_update,
    )
    resp.raise_for_status()


def find_nearby(lon: float, lat: float, radius_km: float) -> list[dict]:
    """Find all locations within radius_km of the given coordinates."""
    sparql_query = f"""
        PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
        PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX ex:   <http://example.org/>

        SELECT ?location ?name ?distance WHERE {{
            ?location a ex:Location ;
                      rdfs:label ?name ;
                      geo:hasGeometry/geo:asWKT ?wkt .

            BIND(geof:distance(?wkt, "POINT({lon} {lat})"^^geo:wktLiteral, "km") AS ?distance)
            FILTER(?distance < {radius_km})
        }}
        ORDER BY ?distance
    """
    resp = requests.post(
        SPARQL_ENDPOINT,
        headers={
            "Content-Type": "application/sparql-query",
            "Accept":       "application/sparql-results+json",
        },
        data=sparql_query,
    )
    resp.raise_for_status()
    bindings = resp.json()["results"]["bindings"]
    return [
        {
            "uri":      b["location"]["value"],
            "name":     b["name"]["value"],
            "distance": float(b["distance"]["value"]),
        }
        for b in bindings
    ]


# Insert some locations
insert_location("http://example.org/dam",           "Dam Square",        4.8952,  52.3731)
insert_location("http://example.org/rijksmuseum",   "Rijksmuseum",       4.8852,  52.3600)
insert_location("http://example.org/anne_frank",    "Anne Frank House",  4.8839,  52.3752)
insert_location("http://example.org/central_station","Amsterdam Centraal", 4.9000, 52.3791)

# Find everything within 1km of the Dam
nearby = find_nearby(lon=4.8952, lat=52.3731, radius_km=1.0)
print(f"Found {len(nearby)} locations within 1km:")
for loc in nearby:
    print(f"  {loc['name']}: {loc['distance']:.3f} km")
```

---

## Configuration

```toml
[geospatial]
enabled           = true
default_crs       = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"   # WGS84
precision_bits    = 60       # bits for geohash (30 lat + 30 lon)
max_distance_km   = 20000    # Maximum allowed distance in FILTER clauses

[geospatial.index]
type              = "geohash"    # "geohash" | "r-tree" (future)
cell_size_meters  = 1            # ~1cm precision at 60 bits
```

!!! tip "Coordinate Order: Longitude First"
    GeoSPARQL and WKT use **longitude, latitude** order (X, Y in Cartesian terms). This is the opposite of GPS coordinate display conventions (which show latitude first). `POINT(4.9 52.37)` means longitude=4.9°E, latitude=52.37°N (Amsterdam).

---

## R-Tree Indexing

In addition to the default 60-bit geohash encoding, IndentiaDB supports **R-tree** spatial indexing for complex geometry queries. The R-tree is built on the `rstar` crate and provides efficient operations on bounding boxes (axis-aligned bounding boxes / AABBs).

### How the R-Tree Works

Each geometry is stored alongside its bounding-box envelope in the R-tree. The tree organizes envelopes hierarchically:

- **Leaf nodes** contain geometry entries with their bounding boxes.
- **Internal nodes** contain the minimum bounding rectangle (MBR) that encloses all children.
- The tree is balanced, providing **O(log n)** insertion, deletion, and query performance.

### Query Types

| Query | Operation | Complexity |
|-------|-----------|-----------|
| **Range query** | Find all geometries whose bounding box intersects a query envelope | O(log n + k) |
| **K-nearest neighbor** | Find the K closest geometries to a point | O(log n · k) |
| **Point containment** | Find all polygons containing a point | O(log n + k) |

### Bulk Loading

When loading large datasets, use bulk loading for efficient index construction. Bulk loading sorts geometries by their spatial locality before building the tree, resulting in better node utilization:

```bash
# Import with bulk-loaded spatial index
indentiagraph import \
  --profile prod \
  --input places.ttl \
  --spatial-index rtree \
  --bulk-load
```

### Geohash vs. R-Tree

| Feature | Geohash (default) | R-Tree |
|---------|-------------------|--------|
| Point lookups | Fast (exact code match) | O(log n) |
| Range scans | Key-range scan + refinement | Bounding box intersection |
| Complex polygons | Requires WKT refinement | Native envelope support |
| KNN queries | Approximate via cell expansion | Exact via tree traversal |
| Memory overhead | Minimal (64-bit per point) | Higher (tree structure) |
| Recommended for | Point-heavy datasets | Mixed geometry types |

---

## Buffer Operations

Buffer operations create a polygon around a geometry at a specified distance, useful for proximity zones and area-of-influence queries.

### Creating Buffer Zones

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

# Find all residential areas within 500m of an industrial zone
SELECT ?area ?name WHERE {
    ex:industrial_zone geo:hasGeometry/geo:asWKT ?zoneWkt .

    # Create a 500m buffer around the industrial zone
    BIND(geof:buffer(?zoneWkt, 0.5, "km") AS ?buffer)

    ?area a ex:ResidentialArea ;
          ex:name ?name ;
          geo:hasGeometry/geo:asWKT ?areaWkt .

    FILTER(geof:intersects(?areaWkt, ?buffer))
}
```

### Multi-Ring Buffer Analysis

Create concentric buffer zones for impact analysis:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?facility ?zone ?count WHERE {
    ?facility a ex:ChemicalPlant ;
              geo:hasGeometry/geo:asWKT ?facilityWkt .

    VALUES (?zone ?radius) {
        ("immediate" 1.0)
        ("warning"   5.0)
        ("advisory" 10.0)
    }

    BIND(geof:buffer(?facilityWkt, ?radius, "km") AS ?buffer)

    {
        SELECT ?buffer (COUNT(?resident) AS ?count) WHERE {
            ?resident a ex:Resident ;
                      geo:hasGeometry/geo:asWKT ?residentWkt .
            FILTER(geof:within(?residentWkt, ?buffer))
        }
        GROUP BY ?buffer
    }
}
```

---

## Spatial Aggregations

### Counting Points in Polygons

Count the number of sensors in each monitoring zone:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?zone ?zone_name (COUNT(?sensor) AS ?sensor_count) WHERE {
    ?zone a ex:MonitoringZone ;
          ex:name ?zone_name ;
          geo:hasGeometry/geo:asWKT ?zoneWkt .

    OPTIONAL {
        ?sensor a ex:Sensor ;
                geo:hasGeometry/geo:asWKT ?sensorWkt .
        FILTER(geof:within(?sensorWkt, ?zoneWkt))
    }
}
GROUP BY ?zone ?zone_name
ORDER BY DESC(?sensor_count)
```

### Area Calculations

Compute the area of polygons using the `geof:area` function:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?parcel ?name ?area_sqkm WHERE {
    ?parcel a ex:LandParcel ;
            ex:name ?name ;
            geo:hasGeometry/geo:asWKT ?wkt .

    BIND(geof:area(?wkt, "km2") AS ?area_sqkm)
}
ORDER BY DESC(?area_sqkm)
```

Supported area units: `"m2"` (square meters), `"km2"` (square kilometers), `"ha"` (hectares), `"ac"` (acres).

---

## Multi-CRS Support

IndentiaDB defaults to WGS 84 (EPSG:4326) but also supports **Web Mercator (EPSG:3857)** for web mapping applications. CRS transformation is handled transparently.

### Supported Coordinate Reference Systems

| CRS | EPSG Code | Use Case |
|-----|-----------|----------|
| WGS 84 | 4326 | Geographic coordinates (default) |
| Web Mercator | 3857 | Web mapping (OpenStreetMap, Google Maps) |

### CRS Mismatch Detection

When combining geometries from different CRS, IndentiaDB detects the mismatch and automatically transforms coordinates. This prevents silent errors from comparing incompatible coordinate spaces.

### Explicit CRS Declaration

Declare CRS in WKT using the GeoSPARQL CRS URI:

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX ex:   <http://example.org/>

INSERT DATA {
    ex:building_footprint
        a geo:Geometry ;
        geo:asWKT "<http://www.opengis.net/def/crs/EPSG/0/3857> POLYGON((544250 6867280, 544350 6867280, 544350 6867380, 544250 6867380, 544250 6867280))"^^geo:wktLiteral .
}
```

Queries mixing CRS84 and EPSG:3857 geometries will transparently transform to a common CRS before computing spatial relations.

### WGS 84 to Web Mercator Limits

Web Mercator is undefined beyond approximately +/-85.05 degrees latitude. Geometries at extreme latitudes (e.g., polar regions) must remain in WGS 84.

---

## Geospatial + Temporal: Moving Objects

Combine spatial and temporal queries to track objects that change location over time:

### Tracking Vehicle Positions

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

# Insert timestamped positions
INSERT DATA {
    TEMPORAL VALID "2026-03-23T08:00:00Z" TO "2026-03-23T08:15:00Z" {
        ex:truck_42 geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POINT(4.90 52.37)"^^geo:wktLiteral
        ] .
    }
}
```

```sparql
INSERT DATA {
    TEMPORAL VALID "2026-03-23T08:15:00Z" TO "2026-03-23T08:30:00Z" {
        ex:truck_42 geo:hasGeometry [
            a geo:Geometry ;
            geo:asWKT "POINT(4.48 51.92)"^^geo:wktLiteral
        ] .
    }
}
```

### Query: Where Was a Vehicle at a Given Time?

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX ex:   <http://example.org/>

SELECT ?wkt WHERE {
    TEMPORAL AS OF VALID "2026-03-23T08:10:00Z"
    ex:truck_42 geo:hasGeometry/geo:asWKT ?wkt .
}
```

### Query: Which Vehicles Entered a Zone During a Time Window?

```sparql
PREFIX geo:  <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX ex:   <http://example.org/>

SELECT ?vehicle ?arrival WHERE {
    TEMPORAL BETWEEN VALID "2026-03-23T06:00:00Z" AND "2026-03-23T18:00:00Z"

    ?vehicle a ex:Vehicle ;
             geo:hasGeometry/geo:asWKT ?vehicleWkt .
    BIND(TEMPORAL_START(?vehicle) AS ?arrival)

    FILTER(geof:within(
        ?vehicleWkt,
        "POLYGON((4.38 51.88, 4.58 51.88, 4.58 51.96, 4.38 51.96, 4.38 51.88))"^^geo:wktLiteral
    ))
}
ORDER BY ?arrival
```

---

## Performance Tuning

### Index Configuration

```toml
[geospatial]
enabled = true

[geospatial.index]
type             = "geohash"     # "geohash" for point-heavy, "r-tree" for polygons
precision_bits   = 60            # Default 60; lower values = faster range scans, less precision
cell_size_meters = 1             # Minimum cell resolution

[geospatial.performance]
use_spatial_index = true         # Always true unless debugging
max_vertices     = 10000         # Reject overly complex geometries
```

### Query Optimization Tips

1. **Add bounding-box pre-filters**: For distance queries over large datasets, add a coarse bounding-box filter before the precise distance calculation:

    ```sparql
    FILTER(?lat > 51.0 && ?lat < 53.0 && ?lon > 4.0 && ?lon < 6.0)
    FILTER(geof:distance(?wkt, ?refWkt, "km") < 50)
    ```

2. **Limit result sets**: Always use `LIMIT` on spatial queries to avoid scanning the entire index.

3. **Use `geof:within` over `geof:distance` when possible**: Polygon containment checks are faster than distance calculations because they avoid trigonometric functions.

4. **Validate geometry complexity**: The `max_vertices` setting (default 10,000) rejects overly complex geometries on insert. For datasets with high-resolution coastlines or boundaries, consider simplifying geometries before import.

5. **Monitor index size**: Check spatial index statistics:

    ```bash
    indentiagraph admin geo stats --profile prod
    ```

    ```json
    {
      "index_type": "geohash",
      "geometry_count": 1284731,
      "index_size_bytes": 82543104,
      "avg_query_ms": 2.3
    }
    ```
