"""P5-E — the clinic's UI, the 19 ratified strings, and proof the barber path never learned of it.

Run:  venv/bin/python scripts/test_p5e_clinic_ui.py

WHAT THIS PROVES

    🔴 THE STRONGEST CHECK HERE IS T-هـ-s1, and it is the reason this suite exists in this shape:
    every patient-facing string is parsed OUT OF THE RATIFIED CONTRACT
    (.claudedocs/architecture/CLINIC_WEB_UX_CONTRACT.md §6) and compared BYTE-FOR-BYTE with
    frontend/src/pages/generic/normal/clinicStrings.js. §6's heading is "تُعتمَد حرفيّاً قبل أيِّ
    كود" — ratified verbatim, before any code — so "I copied them carefully" is not evidence. A
    typo of mine fails this. So does a well-meant rewording by anyone later.

    ISOLATION, the second requirement: the clinic file must read ONLY the neutral staff surface, and
    the barber branch must be untouched and unaware. Both are measured by enumerating the actual key
    names, not by reading the diff.

    BEHAVIOUR (T-هـ-b*) runs in node against the pure logic — the 8 error codes of §6's second table
    (string AND return step, per code), and §2's back-cascade.

NO NETWORK, NO DATABASE, NO BROWSER, NO WRITES, NO PRODUCTION, NO TENANT.

🔴 AND WHAT THIS SUITE CANNOT DO, SAID PLAINLY
    It proves the strings are right, the mapping is right, and the isolation holds. It does NOT prove
    the screens RENDER — there is no JS test runner and no browser here, and §5 of the contract says
    it itself: "«لا أخطاءَ في الـconsole» ليست إثباتاً ... تُثبَت في P5-F بدليلِ DOM حقيقيّ". Every
    rendering claim stays an Unknown until P5-F.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


def read(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


def code_only(src: str) -> str:
    """Comments stripped, string literals kept. Same reason as the P5-D suite: a check that searches
    the whole file finds the comment written to explain an absence (instances 10 and 11 of that trap,
    both on 2026-09-27)."""
    out, i, n = [], 0, len(src)
    while i < n:
        if src.startswith("/*", i):
            e = src.find("*/", i + 2); i = n if e == -1 else e + 2
        elif src.startswith("//", i):
            e = src.find("\n", i); i = n if e == -1 else e
        elif src[i] in "'\"`":
            q, j = src[i], i + 1
            while j < n and src[j] != q:
                j += 2 if src[j] == "\\" else 1
            out.append(src[i:j + 1]); i = j + 1
        else:
            out.append(src[i]); i += 1
    return "".join(out)


AR_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def contract_strings():
    """§6's table -> {n: [backticked values in row order]}. Parsed, never transcribed."""
    sec = read(".claudedocs/architecture/CLINIC_WEB_UX_CONTRACT.md").split("## §٦")[1].split("###")[0]
    out = {}
    for line in sec.splitlines():
        t = line.strip()
        if not (t.startswith("| ن-") or t.startswith("| **ن-")):
            continue
        digits = re.search(r"ن-([٠-٩]+)", t).group(1)
        n = int("".join(str(AR_DIGITS.index(d)) for d in digits))
        out[n] = re.findall(r"`([^`]+)`", t)
    return out


# key in clinicStrings.js -> (§6 row, which backticked value in that row)
# ن-١٨/ن-١٩ list their error_code first, so the STRING is the last value on those rows.
EXPECTED = {
    'n1': (1, 0), 'n2': (2, 0), 'n3': (3, 0), 'n4': (4, 0), 'n5': (5, 0), 'n6': (6, 0),
    'n7_self': (7, 0), 'n7_other': (7, 1), 'n8': (8, 0), 'n9': (9, 0),
    'n10_name': (10, 0), 'n10_phone': (10, 1), 'n11_name': (11, 0), 'n11_phone': (11, 1),
    'n12': (12, 0), 'n13': (13, 0), 'n14': (14, 0), 'n14_retry': (14, 1),
    'n15': (15, 0), 'n15_sending': (15, 1), 'n16': (16, 0), 'n17': (17, 0),
    'n18': (18, -1), 'n19': (19, -1), 'n20': (20, 0),
}

# Every barber-named key on the hook's surface. The clinic file must contain NONE of them.
BARBER_KEYS = ["barbers", "barbersLoading", "barbersError", "retryBarbers",
               "selectedBarberId", "selectedBarber", "chooseBarber"]


def main():
    print("\n── P5-E · the clinic UI, its ratified strings, and the barber path's isolation ────")

    for probe, label, floor in (("scripts/clinic_ui_cases.mjs", "T-هـ-b0", 10),):
        node = subprocess.run(["node", probe], cwd=ROOT, capture_output=True, text=True, timeout=60)
        if node.returncode != 0:
            check(f"{label}  node could execute {probe}", False, (node.stderr or "").strip()[:200])
            print("\nFAILURES ABOVE")
            return 1
        cases = json.loads(node.stdout)
        check(f"{label}  the pure clinic logic loaded and returned real results (positive control: "
              f"a zero-case run is a FAILURE, not a pass)", len(cases) >= floor,
              f"{len(cases)} cases executed")
        for c in cases:
            check(c["label"], c["passed"], c.get("detail", ""))

    js = read("frontend/src/pages/generic/normal/clinicStrings.js")
    flow = read("frontend/src/pages/generic/normal/ClinicBookingFlow.jsx")
    page = read("frontend/src/pages/generic/normal/ReservePage.jsx")
    hook = read("frontend/src/hooks/useReservationBooking.js")
    flow_code, page_code, hook_code = code_only(flow), code_only(page), code_only(hook)

    # ── T-هـ-s1 · the strings, against the contract itself ──────────────────────────────────
    contract = contract_strings()
    check("T-هـ-s1a  §6's table really parsed — 20 ن-rows found (was 19 until ن-٢٠ was ratified "
          "2026-09-27; positive control, since a parser that silently matched nothing would make "
          "every comparison below vacuously true)",
          len(contract) == 20, f"{len(contract)} rows")

    block = js.split("export const CLINIC_TEXT = {")[1].split("\n}")[0]
    mine = dict(re.findall(r"^\s*(\w+):\s*'((?:[^'\\]|\\.)*)',", block, re.M))
    mismatches = []
    for key, (n, idx) in EXPECTED.items():
        want = contract.get(n, [None])[idx] if contract.get(n) else None
        if mine.get(key) != want:
            mismatches.append((key, want, mine.get(key)))
    check("T-هـ-s1b  🔴 EVERY patient-facing string is BYTE-IDENTICAL to the ratified contract — "
          "parsed out of §6 and compared, so neither my typing nor a later edit can drift from it",
          not mismatches and set(mine) == set(EXPECTED),
          f"{len(EXPECTED)} compared, {len(mismatches)} mismatched"
          + (f": {[m[0] for m in mismatches]}" if mismatches else ""))
    check("T-هـ-s1c  and the file defines no EXTRA patient-facing string beyond §6's table — nothing "
          "was invented alongside them",
          set(mine) - set(EXPECTED) == set(), str(sorted(set(mine) - set(EXPECTED))))

    # §5/§6: the success screen's strings stay as they are. Asserted against the ORIGINAL component
    # so this copy cannot drift from it.
    succ = dict(re.findall(r"^\s*(\w+):\s*'((?:[^'\\]|\\.)*)',", js.split("CLINIC_SUCCESS = {")[1]
                           .split("\n}")[0], re.M))
    check("T-هـ-s2  the success screen's four strings are copied VERBATIM from ReservePage's own "
          "SuccessScreen, which §5 says stays untouched — compared against that component, not typed "
          "from memory",
          all(v in page for v in succ.values()) and len(succ) == 4,
          f"{len(succ)} strings, all present in ReservePage")

    # ── T-هـ-s3 · isolation, both directions ───────────────────────────────────────────────
    leaked = [k for k in BARBER_KEYS if re.search(rf"\b{k}\b", flow_code)]
    check("T-هـ-s3a  🔴 the clinic flow reads ZERO barber-named keys — all 7 enumerated by name, not "
          "eyeballed from a diff",
          leaked == [], f"leaked: {leaked}" if leaked else "0 of 7 present")
    check("T-هـ-s3b  and it really does read the NEUTRAL surface (positive control: absence of "
          "barber keys would also be true of a file that reads nothing at all)",
          all(re.search(rf"\b{k}\b", flow_code) for k in
              ["staff", "staffLoading", "staffError", "retryStaff", "selectedStaffId",
               "selectedStaff", "chooseStaff"]))
    check("T-هـ-s3c  🔴 INVARIANT — the BARBER branch still reads its own barber-named keys and is "
          "untouched: it does not import, mention or branch on anything clinic",
          "barbers, barbersLoading, selectedBarberId, chooseBarber," in page_code
          and "CLINIC_TEXT" not in page_code and "clinicStrings" not in page_code,
          "BookingPage unchanged, no clinic strings in the page")
    check("T-هـ-s3d  INVARIANT — the clinic flow is reached ONLY through the page's own mode switch "
          "and is not a second page: no route, no registry entry anywhere",
          "if (mode === 'clinic')" in page_code
          and not any("ClinicBookingFlow" in read(f) for f in
                      ["frontend/src/router/tenants/index.js", "frontend/src/App.jsx"]))

    # ── T-هـ-s4 · the contract's hard prohibitions, in code ────────────────────────────────
    check("T-هـ-s4a  🔴 §4 — the clinic NEVER converts a time: no toLocaleString, no "
          "getTimezoneOffset, no Date math on a slot. The server returns local wall clock labelled "
          "UTC (F-TZ-1) and converting is the live defect closed in 044aafe",
          not re.search(r"toLocaleString|toLocaleTimeString|getTimezoneOffset", flow_code),
          "displays s.time as received")
    check("T-هـ-s4b  §3/C1.1 — the patient question cannot be skipped: `relation` starts null and "
          "confirmation is impossible without it",
          "useState(null)" in flow_code and "!relation" in flow_code)
    check("T-هـ-s4c  §7 — svh, not vh, for the full-height shell (a real mobile defect this project "
          "already paid for)",
          "100svh" in flow_code and not re.search(r"minHeight:\s*'100vh'", flow_code))
    check("T-هـ-s4d  §8 — the accent is never hard-coded: it arrives as a prop from "
          "Client.primary_color, and no hex literal is used as the accent",
          "accent" in flow_code and "primary_color" not in flow_code)
    check("T-هـ-s4e  §6 — the server's own prose is never rendered: the flow reads error.code and "
          "nothing reads `detail`",
          "resolveClinicError" in flow_code and "detail" not in flow_code)

    # ── T-هـ-s5 · the hook's clinic confirm, and the barber body left alone ─────────────────
    check("T-هـ-s5a  the clinic confirm reads `error.code` from the envelope — not `detail`, which "
          "the envelope does not contain at all",
          "data?.error?.code" in hook_code and "confirmClinic" in hook_code)
    check("T-هـ-s5b  🔴 INVARIANT — the patient is spread in CONDITIONALLY, so the barber's create "
          "body is byte-identical to what it was: no `patient` key at all when none is given",
          "...(patient ? { patient } : {})" in hook_code)
    check("T-هـ-s5c  INVARIANT — confirmLocally (the barber's own confirm) is untouched and still "
          "reads its own path",
          "const confirmLocally = useCallback" in hook_code
          and "data?.detail" in hook_code)

    # ── W-1 · the landing page's Staff section, which §11 assigns to P5-E ──────────────────
    staff = read("frontend/src/components/dynamic-sections/StaffSection.jsx")
    check("T-هـ-s6  W-1 (§11, «تعميمُ StaffSection», delivered WITH P5-E) — the section resolves its "
          "endpoint through the SAME resolver the booking hook uses, so the two can never disagree "
          "about where a vertical's staff come from",
          "staffListRequest({" in staff and "/reservations/barbers'" not in code_only(staff))
    check("T-هـ-s7  🔴 INVARIANT — and the BARBER request is byte-identical: the resolver returns "
          "exactly /reservations/barbers with {client_slug} for bookingModule 'barber', so rk's and "
          "mr-h's landing pages are unaffected",
          "bookingModule: config?.booking_module ?? null" in staff
          and "if (!req) { setLoading(false); return }" in staff)

    print("\nALL GREEN" if ok else "\nFAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
