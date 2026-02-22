import time
print("Starting script...")
start = time.time()

with open('base_male_raw.obj', 'r') as f:
    lines = f.readlines()

verts = []
faces = []
for line in lines:
    if line.startswith('v '):
        verts.append(line)
    elif line.startswith('f '):
        parts = line.strip().split()[1:]
        vi = [int(p.split('/')[0]) for p in parts]
        faces.append((vi, line))

print(f"Read {len(verts)} verts, {len(faces)} faces in {time.time()-start:.2f}s")

adj = [[] for _ in range(len(verts) + 1)]
for vi, _ in faces:
    for i in range(len(vi)):
        u = vi[i]
        v = vi[(i+1)%len(vi)]
        adj[u].append(v)
        adj[v].append(u)

print("Adjacency built.")

visited = bytearray(len(verts) + 1)
comps = []
for i in range(1, len(verts) + 1):
    if not visited[i] and adj[i]:
        comp = []
        stack = [i]
        visited[i] = 1
        while stack:
            n = stack.pop()
            comp.append(n)
            for neighbor in adj[n]:
                if not visited[neighbor]:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        comps.append(comp)

largest_comp = max(comps, key=len)
print(f"Largest component has {len(largest_comp)} vertices out of {len(verts)}")

largest_set = set(largest_comp)
old_to_new = {}
new_idx = 1

with open('base_male_clean.obj', 'w') as f:
    for i, v in enumerate(verts):
        old_idx = i + 1
        if old_idx in largest_set:
            f.write(v)
            old_to_new[old_idx] = new_idx
            new_idx += 1

    for vi, line in faces:
        if vi[0] in largest_set: # if one vertex is in it, all are (due to connected components)
            parts = line.strip().split()
            new_parts = ['f']
            for p in parts[1:]:
                v_idx = int(p.split('/')[0])
                rest = p[p.find('/'):] if '/' in p else ''
                new_parts.append(str(old_to_new[v_idx]) + rest)
            f.write(' '.join(new_parts) + '\n')

print(f"Done in {time.time()-start:.2f}s")
