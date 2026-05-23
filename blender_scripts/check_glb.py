import struct, json, math, sys
p = sys.argv[1] if len(sys.argv) > 1 else r"D:\1File System\2Projects\alki-app\public\alki_humgen_male.glb"
data = open(p,'rb').read()
length = struct.unpack('<I', data[8:12])[0]
off=12; chunks=[]
while off<length:
    clen,ctype=struct.unpack('<II',data[off:off+8]); chunks.append((ctype,data[off+8:off+8+clen])); off+=8+clen
g=json.loads(chunks[0][1].decode('utf-8')); binc=chunks[1][1]
CT={5121:'B',5123:'H',5125:'I'}; CSZ={5121:1,5123:2,5125:4}
def read_scalars(bvi,bo,comp,c):
    bv=g['bufferViews'][bvi]; start=bv.get('byteOffset',0)+bo
    fmt='<'+CT[comp]*c; sz=CSZ[comp]*c
    return list(struct.unpack(fmt, binc[start:start+sz]))
def acc(idx):
    a=g['accessors'][idx]; n=a['count']
    full=[[0.0,0.0,0.0] for _ in range(n)]
    if 'bufferView' in a:
        bv=g['bufferViews'][a['bufferView']]; start=bv.get('byteOffset',0)+a.get('byteOffset',0)
        flat=struct.unpack('<'+'f'*(n*3), binc[start:start+12*n])
        full=[[flat[i*3],flat[i*3+1],flat[i*3+2]] for i in range(n)]
    if 'sparse' in a:
        sp=a['sparse']; c=sp['count']; ic=sp['indices']; vc=sp['values']
        idxs=read_scalars(ic['bufferView'],ic.get('byteOffset',0),ic['componentType'],c)
        bvv=g['bufferViews'][vc['bufferView']]; vstart=bvv.get('byteOffset',0)+vc.get('byteOffset',0)
        vals=struct.unpack('<'+'f'*(c*3), binc[vstart:vstart+12*c])
        for k,vi in enumerate(idxs):
            full[vi]=[vals[k*3],vals[k*3+1],vals[k*3+2]]
    return full
m=g['meshes'][0]['primitives'][0]; tn=g['meshes'][0]['extras']['targetNames']
def D(k): return acc(m['targets'][tn.index(k)]['POSITION'])
def dot(a,b): return sum(a[i][0]*b[i][0]+a[i][1]*b[i][1]+a[i][2]*b[i][2] for i in range(len(a)))
def norm(a): return math.sqrt(sum(a[i][0]**2+a[i][1]**2+a[i][2]**2 for i in range(len(a))))
def cos(a,b):
    na,nb=norm(a),norm(b)
    return dot(a,b)/(na*nb+1e-12)
def nonzero(a): return sum(1 for v in a if (v[0]*v[0]+v[1]*v[1]+v[2]*v[2])>1e-12)
chest=D('muscle_chest'); legs=D('muscle_legs')
try:
    male=D('Male')
except Exception:
    male=None
try:
    arms=D('muscle_arms')
except Exception:
    arms=None
try:
    calves=D('muscle_calves')
except Exception:
    calves=None
print("file:", p)
print("bytes:", length)
print("muscle_chest vs muscle_legs cosine:", round(cos(chest,legs),4))
if male is not None:
    print("muscle_chest vs Male        cosine:", round(cos(chest,male),4))
else:
    print("muscle_chest vs Male        cosine: (Male key removed — slim build)")
print("muscle_chest nonzero verts:", nonzero(chest), "/", len(chest))
print("muscle_legs  nonzero verts:", nonzero(legs), "/", len(legs))
if calves is not None:
    print("muscle_calves nonzero verts:", nonzero(calves), "/", len(calves))
    print("muscle_calves max displacement:", round(max(math.sqrt(v[0]**2+v[1]**2+v[2]**2) for v in calves),5))
    print("muscle_calves vs muscle_legs cosine:", round(cos(calves,legs),4))
else:
    print("muscle_calves: KEY NOT FOUND in GLB")
if arms is not None:
    print("muscle_arms   nonzero verts:", nonzero(arms), "/", len(arms))
    print("muscle_arms   max displacement:", round(max(math.sqrt(v[0]**2+v[1]**2+v[2]**2) for v in arms),5))
print()
print(">>> calves nonzero in the hundreds-to-few-thousand + max disp > 0.005 = REAL calf morph.")
print(">>> calves nonzero ~0 or max disp ~0 = flat/empty calf morph (bake didn't take).")
