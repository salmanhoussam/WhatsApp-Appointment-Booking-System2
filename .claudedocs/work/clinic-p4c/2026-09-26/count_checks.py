"""An honest check counter — one tree in, one (pass, fail) out.

WHY IT EXISTS. The earlier count was `grep -c FAIL`, and three suites print a SUMMARY line --
`PASSED 58   FAILED 6` -- which contains the word FAILED. So a suite with zero failures
(`PASSED 45   FAILED 0`) was counted as one failure, and every failing suite was counted one too
high. That single flaw produced a false finding: "PRE-1 is wrong, three suites fail, not two".
It is corrected here by MEASURING EACH SUITE IN ITS OWN VOCABULARY rather than by grepping a word
that means two different things in two different places.

    style A   `  PASS  <label>` / `  FAIL  <label>`     -> count the lines
    style B   `PASSED <n>   FAILED <m>` summary          -> read the numbers

Run:  venv/bin/python <this file> [tree-root]
"""
import os, re, subprocess, sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
PY_BIN = os.environ.get("PYBIN", sys.executable)
SUMMARY = re.compile(r"^PASSED\s+(\d+)\s+FAILED\s+(\d+)\s*$", re.M)
LINE = re.compile(r"^\s{2}(PASS|FAIL)\s", re.M)

total_p = total_f = 0
rows = []
env = dict(os.environ, TZ="Asia/Beirut")
for name in sorted(os.listdir(os.path.join(ROOT, "scripts"))):
    if not (name.startswith("test_") and name.endswith(".py")):
        continue
    r = subprocess.run([PY_BIN, os.path.join("scripts", name)], cwd=ROOT, env=env,
                       capture_output=True, text=True, timeout=300)
    out = r.stdout + r.stderr
    m = SUMMARY.search(out)
    if m:
        p, f = int(m.group(1)), int(m.group(2))
    else:
        p = len(re.findall(r"^\s{2}PASS\s", out, re.M))
        f = len(re.findall(r"^\s{2}FAIL\s", out, re.M))
    total_p += p
    total_f += f
    if f or not (p or f):
        rows.append((name, p, f))

print(f"{ROOT}\n  PASS={total_p}  FAIL={total_f}")
for name, p, f in rows:
    print(f"    {name:<42} pass={p:<4} fail={f}")
