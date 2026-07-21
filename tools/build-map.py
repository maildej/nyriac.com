#!/usr/bin/env python3
"""Generate the clickable RIAC region map (SVG) from ny-counties.topo.json.

Dan: you never need to run this. It was used once to create the map that is
embedded in index.html and saved as images/riac-mark.svg / favicon.svg.
Re-run only if the region/county assignments ever change:
    python3 build-map.py
It prints the inline SVG to map-inline.svg in this folder.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))

REGIONS = {
    1: ("Western New York", "#55b7e8",
        ["Allegany","Cattaraugus","Cayuga","Chautauqua","Erie","Genesee","Livingston","Monroe",
         "Niagara","Ontario","Orleans","Seneca","Steuben","Wayne","Wyoming","Yates"]),
    2: ("Central New York", "#2e8540",
        ["Broome","Chemung","Chenango","Cortland","Delaware","Herkimer","Jefferson","Lewis",
         "Madison","Oneida","Onondaga","Oswego","Otsego","Schuyler","Tioga","Tompkins"]),
    3: ("Northern New York", "#c22b30",
        ["Albany","Clinton","Essex","Franklin","Fulton","Hamilton","Montgomery","Rensselaer",
         "St. Lawrence","Saratoga","Schenectady","Schoharie","Warren","Washington"]),
    4: ("Hudson Valley", "#f2d43d",
        ["Columbia","Dutchess","Greene","Orange","Putnam","Rockland","Sullivan","Ulster","Westchester"]),
    5: ("New York City", "#ef7c28",
        ["Bronx","Kings","New York","Queens","Richmond"]),
    6: ("Long Island", "#8347ad",
        ["Nassau","Suffolk"]),
}

with open(os.path.join(HERE, "ny-counties.topo.json")) as f:
    topo = json.load(f)

sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]

# Decode quantized delta-encoded arcs -> lon/lat
arcs = []
for arc in topo["arcs"]:
    pts, x, y = [], 0, 0
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)

def ring_coords(arc_idxs):
    pts = []
    for i in arc_idxs:
        a = arcs[i] if i >= 0 else list(reversed(arcs[~i]))
        pts.extend(a if not pts else a[1:])
    return pts

# Equirectangular projection with latitude correction (keeps NY upright, like the logo)
import math
all_lons, all_lats = [], []
for a in arcs:
    for lon, lat in a:
        all_lons.append(lon); all_lats.append(lat)
lat_mid = (min(all_lats) + max(all_lats)) / 2
K = math.cos(math.radians(lat_mid))

def project(lon, lat):
    return lon * K, -lat

pxs = [project(lo, la) for lo, la in zip(all_lons, all_lats)]
minx = min(p[0] for p in pxs); maxx = max(p[0] for p in pxs)
miny = min(p[1] for p in pxs); maxy = max(p[1] for p in pxs)
W = 900.0
S = W / (maxx - minx)
H = (maxy - miny) * S

def path_for(geom):
    polys = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
    d = []
    for poly in polys:
        for ring in poly:
            pts = ring_coords(ring)
            cmds = []
            for j, (lon, lat) in enumerate(pts):
                px, py = project(lon, lat)
                px = (px - minx) * S; py = (py - miny) * S
                cmds.append(("M" if j == 0 else "L") + f"{px:.1f},{py:.1f}")
            cmds.append("Z")
            d.append("".join(cmds))
    return "".join(d)

county_region = {}
for rid, (_, _, names) in REGIONS.items():
    for n in names:
        county_region[n] = rid

geoms = topo["objects"]["counties"]["geometries"]
assert len(geoms) == 62, len(geoms)
seen = set()
groups = {rid: [] for rid in REGIONS}
for g in geoms:
    name = g["properties"]["name"]
    assert name in county_region, f"unmapped county {name}"
    seen.add(name)
    groups[county_region[name]].append((name, path_for(g)))
assert len(seen) == 62, "county count mismatch"

svg = []
svg.append(f'<svg class="riac-map" viewBox="0 0 {W:.0f} {H:.0f}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mapTitle">')
svg.append('<title id="mapTitle">Map of New York State: the six RIAC regions. Select a region for contact details.</title>')
for rid, (rname, color, _) in REGIONS.items():
    svg.append(f'<a href="contact.html#region-{rid}" class="map-region" aria-label="Region {rid}: {rname}">')
    svg.append(f'<g fill="{color}">')
    for cname, d in sorted(groups[rid]):
        svg.append(f'<path d="{d}"><title>{cname} County — Region {rid}: {rname}</title></path>')
    svg.append('</g></a>')
svg.append('</svg>')
out = "\n".join(svg)
with open(os.path.join(HERE, "map-inline.svg"), "w") as f:
    f.write(out)
print(f"wrote map-inline.svg ({len(out)/1024:.1f} KB), regions:",
      {rid: len(v) for rid, v in groups.items()})
