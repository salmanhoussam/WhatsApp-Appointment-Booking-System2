import glob
from PIL import Image
import numpy as np

files = sorted(glob.glob("hi_*.jpg"))
print(f"{len(files)} reference frames at 15fps")

diffs = []
prev = None
for f in files:
    img = Image.open(f).convert("L").resize((80, 142))  # small grayscale for fast, robust diff
    arr = np.asarray(img, dtype=np.float32)
    if prev is not None:
        d = np.mean(np.abs(arr - prev))
        diffs.append(d)
    prev = arr

diffs = np.array(diffs)
# diffs[i] = motion between 15fps frame i and i+1, i.e. per (1/15)s step
# time of diffs[i] is roughly (i+1)/15 seconds
print("\nPer-second average inter-frame delta (15fps steps), 0-100 grayscale scale:")
for sec in range(0, 20):
    start = int(sec * 15)
    end = int((sec + 1) * 15)
    seg = diffs[start:end]
    if len(seg) == 0:
        continue
    print(f"  t={sec:2d}-{sec+1:2d}s: mean={seg.mean():5.2f}  max={seg.max():5.2f}")

print(f"\nOverall: mean={diffs.mean():.2f} max={diffs.max():.2f} (single 1/15s step)")

# Now simulate what a LOWER density sampling would miss: compare cumulative motion
# between consecutive samples at candidate densities against the 15fps ground truth.
for fps in [6, 10, 12]:
    step = 15 / fps  # how many 15fps-steps between each low-fps sample
    # cumulative motion between consecutive low-fps samples = sum of the 15fps diffs it skips over
    n_samples = int(20 * fps)
    jumps = []
    for i in range(n_samples - 1):
        t0 = i / fps
        t1 = (i + 1) / fps
        idx0 = int(t0 * 15)
        idx1 = int(t1 * 15)
        idx1 = min(idx1, len(diffs))
        if idx1 > idx0:
            jumps.append(diffs[idx0:idx1].sum())
    jumps = np.array(jumps)
    print(f"\nSampling at {fps}fps ({n_samples} frames): per-sample jump mean={jumps.mean():.2f} max={jumps.max():.2f} (vs 15fps single-step mean={diffs.mean():.2f})")
