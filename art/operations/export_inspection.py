"""Run in Blender after appending the three asset/review collections.
Writes only Gotham's inspection copy and metadata, never the original sources.
"""
import bpy
import json
import re
from pathlib import Path
from mathutils import Vector

ROOT = Path('D:/datarocks/gotham-demo')
MODELS = {'XDE240':'mine_truck.glb', 'XE215C':'XE215C.glb', 'XC958U':'XC958U.glb'}
PARTS = [
    ('驾驶室', r'Cabin|CabAccessories'),
    ('液压与连杆', r'Cylinder|Piston|Rod_|Hoses|BucketLink|TiltRocker'),
    ('工作装置', r'DumpBed|Bucket|LiftArms|Boom|Stick'),
    ('行走机构', r'Wheel|Track'),
    ('动力舱外壳', r'EngineHood|EngineHouse'),
    ('车架与配重', r'Chassis|Frame|Carriage|carriage|Counterweight|Fender'),
]
manifest = {'version':1, 'internalGeometry':False, 'models':{}}
for name, asset in MODELS.items():
    scene = bpy.data.scenes['Gotham_Inspection_' + name]
    bpy.context.window.scene = scene
    bpy.context.view_layer.update()
    objects = [o for o in scene.objects if o.type in {'MESH','FONT'}]
    points = [o.matrix_world @ Vector(p) for o in objects for p in o.bound_box]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (low + high) / 2
    groups = {}
    for obj in objects:
        label = next((label for label, pattern in PARTS if re.search(pattern,obj.name)), '附件')
        obj['gotham_part'] = label
        groups.setdefault(label,[]).append(obj.name)
    views = {}
    for camera in [o for o in scene.objects if o.type == 'CAMERA']:
        label = next((label for suffix,label in [('Perspective','斜视'),('Front','正面'),('Side','侧视'),('Top','俯视')] if suffix in camera.name), None)
        if not label: continue
        direction = (camera.matrix_world.translation - center).normalized()
        views[label] = {'camera':camera.name, 'direction':[direction.x,direction.z,-direction.y]}
    local_views = {}
    for label,names in groups.items():
        part_points = [o.matrix_world @ Vector(p) for o in objects if o.name in names for p in o.bound_box]
        part_low = Vector(tuple(min(p[i] for p in part_points) for i in range(3)))
        part_high = Vector(tuple(max(p[i] for p in part_points) for i in range(3)))
        target = (part_low + part_high) / 2
        direction = Vector((-0.6,-0.7,0.5)).normalized()
        camera_name = 'Gotham_Local_' + name + '_' + label
        camera = bpy.data.objects.get(camera_name)
        if camera is None:
            camera = bpy.data.objects.new(camera_name,bpy.data.cameras.new(camera_name))
            scene.collection.objects.link(camera)
        camera.location = target + direction * max((part_high-part_low).length*1.8,2)
        camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.lens = 45
        local_views[label] = {'camera':camera_name,'direction':[direction.x,direction.z,-direction.y]}
    manifest['models'][name] = {'uri':'/models/'+asset,'parts':groups,'views':views,'partViews':local_views}
(ROOT/'public/models/equipment-inspection.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
bpy.context.window.scene = bpy.data.scenes['Gotham_Inspection_XDE240']
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/operations/equipment-inspection.blend'))
print(json.dumps({'exported':str(ROOT/'public/models/equipment-inspection.json'),'models':manifest['models']},ensure_ascii=False))
