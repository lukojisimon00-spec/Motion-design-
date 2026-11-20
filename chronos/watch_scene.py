"""CHRONOS poster - procedural watch still life rendered with Blender Cycles.
Units: 1 BU = 1 cm (scene scale 0.01 so depth of field behaves like a real macro shot).
Usage: python3 watch_scene.py <out.png> [percent] [samples]
"""
import bpy, bmesh, math, sys
from mathutils import Vector, Euler

OUT = sys.argv[1] if len(sys.argv) > 1 else "watch.png"
PCT = int(sys.argv[2]) if len(sys.argv) > 2 else 100
SAMPLES = int(sys.argv[3]) if len(sys.argv) > 3 else 384

# Layout knobs (image is 1080x1350; frame is FRAME_W x FRAME_H cm on the ground)
FRAME_W = 8.9
FRAME_H = FRAME_W * 1350 / 1080
WATCH_U, WATCH_V = 0.635, 0.650          # watch centre in image (0..1 from top-left)
WATCH_ROT = -28.0                         # degrees; 12 o'clock points up-right

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 0.01

# ---------------------------------------------------------------- materials
def mat(name, color, metal=0.0, rough=0.5, aniso=0.0, transmission=0.0, ior=1.45, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["IOR"].default_value = ior
    if aniso:
        b.inputs["Anisotropic"].default_value = aniso
    if transmission:
        b.inputs["Transmission Weight"].default_value = transmission
    if coat:
        b.inputs["Coat Weight"].default_value = coat
    return m

def bump_noise(m, scale, strength, detail=8.0, voronoi=None):
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    src = n.outputs["Fac"]
    if voronoi:
        v = nt.nodes.new("ShaderNodeTexVoronoi")
        v.inputs["Scale"].default_value = voronoi
        nt.links.new(tc.outputs["Object"], v.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMath"); mix.operation = 'ADD'
        nt.links.new(n.outputs["Fac"], mix.inputs[0])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = 'MULTIPLY'
        mul.inputs[1].default_value = 0.35
        nt.links.new(v.outputs["Distance"], mul.inputs[0])
        nt.links.new(mul.outputs[0], mix.inputs[1])
        src = mix.outputs[0]
    nt.links.new(src, bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return n

M_POL = mat("steel_polished", (0.80, 0.80, 0.81), metal=1, rough=0.07)
M_BRU = mat("steel_brushed", (0.74, 0.74, 0.75), metal=1, rough=0.24, aniso=0.7)
M_DIAL = mat("dial", (0.018, 0.036, 0.085), metal=0.65, rough=0.30, aniso=0.9, coat=0.4)
M_SUB = mat("subdial", (0.012, 0.024, 0.060), metal=0.5, rough=0.42, coat=0.3)
M_PRINT = mat("print", (0.72, 0.73, 0.76), rough=0.45)
M_GLASS = mat("crystal", (1, 1, 1), rough=0.0, transmission=1.0, ior=1.12)
M_LEATHER = mat("leather", (0.040, 0.019, 0.009), rough=0.52, coat=0.12)
M_EDGE = mat("strap_edge", (0.022, 0.010, 0.005), rough=0.35)
M_STITCH = mat("stitch", (0.075, 0.040, 0.020), rough=0.8)
M_GROUND = mat("limestone", (0.80, 0.755, 0.685), rough=0.88)
bump_noise(M_LEATHER, 90.0, 0.10, voronoi=260.0)

# radial (circular) tangent for the sunray dial
nt = M_DIAL.node_tree
tg = nt.nodes.new("ShaderNodeTangent"); tg.direction_type = 'RADIAL'; tg.axis = 'Z'
nt.links.new(tg.outputs["Tangent"], nt.nodes["Principled BSDF"].inputs["Tangent"])
nt = M_BRU.node_tree
tg = nt.nodes.new("ShaderNodeTangent"); tg.direction_type = 'RADIAL'; tg.axis = 'Z'
nt.links.new(tg.outputs["Tangent"], nt.nodes["Principled BSDF"].inputs["Tangent"])

# limestone: very low-amplitude mineral variation in colour + fine tooth
nt = M_GROUND.node_tree
b = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 0.35; n1.inputs["Detail"].default_value = 6
n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 14.0; n2.inputs["Detail"].default_value = 10
for n in (n1, n2):
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.35
ramp.color_ramp.elements[0].color = (0.800, 0.700, 0.560, 1)
ramp.color_ramp.elements[1].position = 0.65
ramp.color_ramp.elements[1].color = (0.830, 0.732, 0.590, 1)
nt.links.new(n1.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.06
nt.links.new(n2.outputs["Fac"], bp.inputs["Height"])
nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])

# ---------------------------------------------------------------- helpers
root = bpy.data.objects.new("watch", None)
scene.collection.objects.link(root)

def link(obj, m=None, parent=True):
    scene.collection.objects.link(obj)
    if m:
        obj.data.materials.append(m)
    if parent:
        obj.parent = root
    return obj

def smooth(obj, angle=35):
    for p in obj.data.polygons:
        p.use_smooth = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        pass
    obj.select_set(False)

def lathe(name, profile, m, segs=192, z_split=None, m2=None):
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)]
        rings.append(ring)
    for a, bb in zip(rings[:-1], rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            f = bm.faces.new((a[i], a[j], bb[j], bb[i]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    obj = link(bpy.data.objects.new(name, me), m)
    if m2 is not None:
        obj.data.materials.append(m2)
        for p in obj.data.polygons:
            if p.center.z < z_split:
                p.material_index = 1
    smooth(obj)
    return obj

def box(name, size, loc, m, rot_z=0.0, bevel=0.01, parent=True):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    bpy.context.collection.objects.unlink(o)
    o.scale = size
    o.location = loc
    o.rotation_euler = (0, 0, rot_z)
    bpy.context.view_layer.update()
    link(o, m, parent)
    if bevel:
        md = o.modifiers.new("bev", 'BEVEL'); md.width = bevel; md.segments = 2
    return o

def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=128):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object
    bpy.context.collection.objects.unlink(o)
    link(o, m)
    md = o.modifiers.new("bev", 'BEVEL'); md.width = min(r, depth) * 0.12; md.segments = 3
    smooth(o)
    return o

def polar(r, clock_deg):
    a = math.radians(clock_deg)
    return (r * math.sin(a), r * math.cos(a))

# ---------------------------------------------------------------- case
DIAL_Z = 0.66
case_profile = [
    (0.0005, 0.00), (1.40, 0.00), (1.62, 0.02), (1.74, 0.08), (1.83, 0.17),
    (1.93, 0.27), (1.975, 0.36), (1.985, 0.46), (1.975, 0.56), (1.95, 0.64),
    (1.91, 0.71), (1.86, 0.78), (1.80, 0.835), (1.75, 0.865), (1.715, 0.870),
    (1.700, 0.860), (1.695, 0.80), (1.692, DIAL_Z),
]
lathe("case", case_profile, M_POL, z_split=0.63, m2=M_BRU)

# crystal (slightly domed)
cr = [(0.0005, 0.925), (0.8, 0.918), (1.4, 0.90), (1.69, 0.875), (1.69, 0.84), (1.4, 0.86), (0.0005, 0.87)]
lathe("crystal", cr, M_GLASS)

# dial
cyl("dial", 1.69, 0.04, (0, 0, DIAL_Z - 0.02), M_DIAL, verts=256)

# lugs
for sx in (-1, 1):
    for sy in (-1, 1):
        lug = box("lug", (0.32, 0.82, 0.34), (sx * 1.15, sy * 1.92, 0.40), M_POL, bevel=0.12)
        lug.rotation_euler = (math.radians(-sy * 11), 0, 0)
        lug.modifiers["bev"].segments = 6
        lug.modifiers["bev"].limit_method = 'NONE'
        tp = lug.modifiers.new("taper", 'SIMPLE_DEFORM'); tp.deform_method = 'TAPER'
        tp.deform_axis = 'Y'; tp.factor = 0.0
        for p in lug.data.polygons: p.use_smooth = True

# crown with knurling
crown = cyl("crown", 0.30, 0.30, (2.13, 0, 0.42), M_POL, rot=(0, math.radians(90), 0), verts=96)
cyl("crown_stem", 0.14, 0.2, (1.98, 0, 0.42), M_BRU, rot=(0, math.radians(90), 0))
for i in range(28):
    a = 2 * math.pi * i / 28
    g = box("knurl", (0.24, 0.022, 0.022), (2.12, 0.305 * math.cos(a), 0.42 + 0.305 * math.sin(a)), M_BRU, bevel=0)
    g.rotation_euler = (a, 0, 0)

# ---------------------------------------------------------------- dial furniture
for h in range(12):
    deg = h * 30
    if h == 6:
        continue
    r0, r1 = (1.20, 1.52)
    mid = (r0 + r1) / 2
    widths = [-0.055, 0.055] if h == 0 else [0.0]
    for off in widths:
        x, y = polar(mid, deg)
        ox, oy = math.cos(math.radians(deg)) * off, -math.sin(math.radians(deg)) * off
        box("marker", (0.065, r1 - r0, 0.04), (x + ox, y + oy, DIAL_Z + 0.02), M_POL,
            rot_z=-math.radians(deg), bevel=0.012)

# printed minute track (one mesh)
bm = bmesh.new()
for i in range(60):
    if i % 5 == 0:
        continue
    deg = i * 6
    for (r, w) in [(1.605, 0.010)]:
        c = Vector((*polar(r, deg), DIAL_Z + 0.001))
        t = Vector((*polar(1, deg), 0))
        nrm = Vector((t.y, -t.x, 0))
        L = 0.07
        vs = [bm.verts.new(c + t * (L / 2) * s1 + nrm * (w / 2) * s2) for s1, s2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        bm.faces.new(vs)
me = bpy.data.meshes.new("track"); bm.to_mesh(me); bm.free()
link(bpy.data.objects.new("track", me), M_PRINT)

# small seconds sub-dial at 6
SUB = Vector((0, -0.84, 0))
o = cyl("subdial", 0.40, 0.02, (SUB.x, SUB.y, DIAL_Z - 0.005), M_SUB, verts=128)
nt = M_SUB.node_tree
tc = nt.nodes.new("ShaderNodeTexCoord")
wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = 'RINGS'; wv.inputs["Scale"].default_value = 60
nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
bpp = nt.nodes.new("ShaderNodeBump"); bpp.inputs["Strength"].default_value = 0.15
nt.links.new(wv.outputs["Fac"], bpp.inputs["Height"])
nt.links.new(bpp.outputs["Normal"], nt.nodes["Principled BSDF"].inputs["Normal"])
bm = bmesh.new()
for i in range(60):
    deg = i * 6
    L = 0.07 if i % 15 == 0 else (0.045 if i % 5 == 0 else 0.0)
    if not L:
        continue
    w = 0.012
    c = SUB + Vector((*polar(0.36 - L / 2, deg), DIAL_Z + 0.007))
    t = Vector((*polar(1, deg), 0)); nrm = Vector((t.y, -t.x, 0))
    vs = [bm.verts.new(c + t * (L / 2) * s1 + nrm * (w / 2) * s2) for s1, s2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bm.faces.new(vs)
me = bpy.data.meshes.new("subtrack"); bm.to_mesh(me); bm.free()
link(bpy.data.objects.new("subtrack", me), M_PRINT)

# ---------------------------------------------------------------- hands
def dauphine(name, length, width, z, clock_deg, tail=0.16, origin=Vector((0, 0, 0)), m=M_POL):
    bm = bmesh.new()
    B = bm.verts.new((0, -tail, z + 0.018))
    Lf = bm.verts.new((-width, length * 0.14, z))
    T = bm.verts.new((0, length, z + 0.002))
    R = bm.verts.new((width, length * 0.14, z))
    Bt = bm.verts.new((-width * 0.55, -tail, z))
    Br = bm.verts.new((width * 0.55, -tail, z))
    bm.faces.new((B, Lf, T)); bm.faces.new((B, T, R))
    bm.faces.new((B, Bt, Lf)); bm.faces.new((B, R, Br))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me), m)
    sm = o.modifiers.new("sol", 'SOLIDIFY'); sm.thickness = 0.012
    o.rotation_euler = (0, 0, -math.radians(clock_deg))
    o.location = origin
    return o

HOUR, MIN, SEC = 10, 9, 37
dauphine("hour", 0.98, 0.072, DIAL_Z + 0.06, (HOUR + MIN / 60) * 30)
dauphine("minute", 1.50, 0.060, DIAL_Z + 0.09, MIN * 6 + SEC / 10)
cyl("pinion", 0.075, 0.08, (0, 0, DIAL_Z + 0.09), M_POL)
s = box("sec_hand", (0.014, 0.40, 0.006), (0, 0, 0), M_POL, bevel=0)
s.location = SUB + Vector((*polar(0.12, SEC * 6), DIAL_Z + 0.03))
s.rotation_euler = (0, 0, -math.radians(SEC * 6))
cyl("sec_pin", 0.03, 0.04, (SUB.x, SUB.y, DIAL_Z + 0.03), M_POL)

# ---------------------------------------------------------------- strap
def strap(sign, length=15.0, w0=2.02, w1=1.62, thick=0.30):
    """sign=+1 top strap (towards 12), -1 bottom strap."""
    nl, nw = 140, 10
    bm = bmesh.new()
    grid = []
    for i in range(nl + 1):
        d = length * (i / nl) ** 1.15
        y = sign * (1.80 + d)
        w = w1 + (w0 - w1) * math.exp(-d / 3.5)
        ztop = thick + 0.30 * math.exp(-(max(d - 0.25, 0) / 0.85) ** 2)
        row = []
        for j in range(nw + 1):
            x = -w / 2 + w * j / nw
            row.append(bm.verts.new((x, y, ztop)))
        grid.append(row)
    for i in range(nl):
        for j in range(nw):
            vs = (grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j])
            bm.faces.new(vs if sign > 0 else vs[::-1])
    me = bpy.data.meshes.new("strap"); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("strap", me), M_LEATHER)
    o.data.materials.append(M_EDGE)
    sm = o.modifiers.new("sol", 'SOLIDIFY'); sm.thickness = thick; sm.offset = -1
    sm.material_offset_rim = 1; sm.use_rim = True
    bv = o.modifiers.new("bev", 'BEVEL'); bv.width = 0.05; bv.segments = 3; bv.limit_method = 'ANGLE'
    for p in o.data.polygons:
        p.use_smooth = True
    # stitching
    bm = bmesh.new()
    d = 0.45
    while d < length:
        y = sign * (1.80 + d)
        w = w1 + (w0 - w1) * math.exp(-d / 3.5)
        ztop = thick + 0.30 * math.exp(-(max(d - 0.25, 0) / 0.85) ** 2)
        for side in (-1, 1):
            x = side * (w / 2 - 0.13)
            L, W, H = 0.085, 0.026, 0.012
            c = Vector((x, y, ztop + H / 2 - 0.004))
            vs = [bm.verts.new(c + Vector((sx * W / 2, sy * L / 2, sz * H / 2)))
                  for sx, sy, sz in ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1))]
            bm.faces.new(vs)
        d += 0.17
    me = bpy.data.meshes.new("stitch"); bm.to_mesh(me); bm.free()
    link(bpy.data.objects.new("stitch", me), M_STITCH)
    return o

strap(+1)
strap(-1)

# ---------------------------------------------------------------- ground, light, camera
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
g = bpy.context.active_object
g.data.materials.append(M_GROUND)

# place watch in frame
wx = (WATCH_U - 0.5) * FRAME_W
wy = -(WATCH_V - 0.5) * FRAME_H
root.location = (wx, wy, 0)
root.rotation_euler = (0, 0, math.radians(WATCH_ROT))

sun = bpy.data.lights.new("sun", 'SUN')
sun.energy = 5.2
sun.angle = math.radians(4.0)
sun.color = (1.0, 0.965, 0.92)
so = bpy.data.objects.new("sun", sun); scene.collection.objects.link(so)
# light from upper-left of frame, ~36 deg elevation -> shadow toward lower-right
elev, az = math.radians(33), math.radians(138)
dirv = Vector((math.cos(elev) * math.cos(az), math.cos(elev) * math.sin(az), math.sin(elev)))
so.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler()

M_FLAG = mat("flag", (0.003, 0.003, 0.003), rough=0.9)
def flag(loc, rot, size):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    f = bpy.context.active_object
    f.scale = (size[0], size[1], 1)
    f.data.materials.append(M_FLAG)
    f.visible_camera = False
    f.visible_shadow = False
    f.visible_diffuse = False
    return f
# a large black flag above-right of the watch, facing down at an angle
flag((wx + 14, wy - 6, 16), (0, math.radians(-40), 0), (22, 30))
flag((wx - 6, wy - 16, 12), (math.radians(50), 0, 0), (14, 10))

world = bpy.data.worlds.new("w"); scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.92, 0.90, 0.87, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

cam = bpy.data.cameras.new("cam")
cam.lens = 100
cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36
co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co)
D = FRAME_W / (36 / 100)
tilt = math.radians(4)
co.location = (0, -D * math.sin(tilt), D * math.cos(tilt))
co.rotation_euler = (tilt, 0, 0)
scene.camera = co
cam.dof.use_dof = True
cam.dof.focus_object = root
cam.dof.aperture_fstop = 5.6

r = scene.render
r.engine = 'CYCLES'
r.resolution_x, r.resolution_y, r.resolution_percentage = 1080, 1350, PCT
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 12
scene.cycles.transmission_bounces = 12
scene.cycles.glossy_bounces = 8
try:
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
except Exception as e:
    print("view transform:", e)
scene.view_settings.exposure = 0.55
r.image_settings.file_format = 'PNG'
r.image_settings.color_depth = '16'
r.filepath = OUT
bpy.ops.render.render(write_still=True)
print("WROTE", OUT)
