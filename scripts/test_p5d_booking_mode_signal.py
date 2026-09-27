"""P5-D · T-ب-٦ — the page stops inferring its vertical from `barbers.length`.

Run:  venv/bin/python scripts/test_p5d_booking_mode_signal.py

WHAT THIS PROVES

    T-ب-٦ of .claudedocs/implementation/CLINIC_Q5B_BOOKING_MODULE_CONTRACT.md, authorized as the
    first gate of P5-D (Salman, 2026-09-27): `mode` is derived from the server-resolved
    `config.booking_module`, never from counting staff rows.

    The two halves are reported separately and ON PURPOSE, because they are not equally strong:

      BEHAVIOUR (T-ب-٦-b*)  real calls into frontend/src/hooks/bookingMode.js, executed by node 20
                            via scripts/booking_mode_cases.mjs. These prove what the code DOES.
      STRUCTURE (T-ب-٦-s*)  assertions over source text. These prove only what a file SAYS, which is
                            weaker, and they are named so no reader mistakes one for the other
                            (feedback_assert_on_code_not_text). They exist because this project has
                            NO JavaScript test runner at all -- measured: zero vitest/jest/
                            @testing-library in frontend/package.json, zero *.test.* under
                            frontend/src -- so JSX branch order cannot be executed here.

    🔴 The derivation was extracted into its own pure module for exactly that reason: a function
    with no React and no network can be CALLED, so the part that matters is measured rather than
    grepped.

    🔴 T-ب-٦-s5 asserts an interim that is WRONG ON PURPOSE and must stay visible: `mode === 'clinic'`
    is returned but ReservePage has no branch for it, so a clinic would fall through to the legacy
    form. Closing it needs the 19 approved Arabic strings (P5-E), which this batch was forbidden to
    touch, and inventing a stand-in string would break rules/text-context-rule.md. No visitor can
    reach it: zero clinic tenants exist. The assertion is here so the gap cannot be forgotten
    silently -- when P5-E closes it, this check is expected to FAIL and be flipped, naming this as
    its old value.

NO NETWORK, NO DATABASE, NO BROWSER, NO WRITES, NO PRODUCTION, NO TENANT.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok = True


def check(label, passed, detail=""):
    global ok
    ok &= bool(passed)
    print(f"  {'PASS' if passed else 'FAIL'}  {label}{('  — ' + detail) if detail else ''}")


HOOK = os.path.join(ROOT, "frontend/src/hooks/useReservationBooking.js")
PURE = os.path.join(ROOT, "frontend/src/hooks/bookingMode.js")
PAGE = os.path.join(ROOT, "frontend/src/pages/generic/normal/ReservePage.jsx")


def read(p):
    return open(p, encoding="utf-8").read()


def code_only(src: str) -> str:
    """Source with comments removed, for any assertion about what the code DOES.

    🔴 This exists because the first version of this suite fell into the self-documenting-absence
    trap TWICE in one run -- instances 10 and 11 of a pattern this project has recorded nine times
    (feedback_test_evidence_discipline, item 1). T-ب-٦-s1 searched for
    `barbers.length > 0 ? 'booking'` to prove it was gone, and found it inside the very comment
    written to explain its removal ("🔴 WAS: ..."). T-ب-٦-s5 did the same with `mode === 'clinic'`
    in ReservePage's declared-gap comment. Both checks failed while both code changes were correct.

    The rule that keeps being relearned: the better the documentation, the more wrong a text search
    over the whole file. The fix is never to water down the comment -- it is to assert on the code.
    """
    out, i, n = [], 0, len(src)
    while i < n:
        if src.startswith("/*", i):                      # block comment (incl. JSDoc headers)
            end = src.find("*/", i + 2)
            i = n if end == -1 else end + 2
        elif src.startswith("//", i):                    # line comment, to end of line
            end = src.find("\n", i)
            i = n if end == -1 else end
        elif src[i] in "'\"`":                           # a string literal is code, keep it whole
            q, j = src[i], i + 1
            while j < n and src[j] != q:
                j += 2 if src[j] == "\\" else 1
            out.append(src[i:j + 1])
            i = j + 1
        else:
            out.append(src[i])
            i += 1
    return "".join(out)


def main():
    print("\n── P5-D · T-ب-٦ — booking_module replaces barbers.length as the signal ──────────")

    # ── BEHAVIOUR: the pure derivation, really executed ─────────────────────────────────────
    node = subprocess.run(["node", "scripts/booking_mode_cases.mjs"], cwd=ROOT,
                          capture_output=True, text=True, timeout=60)
    if node.returncode != 0:
        check("T-ب-٦-b0  node could execute the derivation at all", False,
              (node.stderr or "").strip()[:200])
        print("\nFAILURES ABOVE")
        return 1
    # A counter that reports zero because nothing ran is not a result -- it is a question
    # (2026-09-27, count_checks.py printed PASS=0 for 27 suites for exactly that reason).
    cases = json.loads(node.stdout)
    check("T-ب-٦-b0  the derivation module loaded and returned real results (positive control: a "
          "zero-case run would be reported as a failure, not as success)",
          len(cases) >= 12, f"{len(cases)} cases executed")
    for c in cases:
        check(c["label"], c["passed"], c.get("detail", ""))

    hook, pure, page = read(HOOK), read(PURE), read(PAGE)

    # ── STRUCTURE (text-level, weaker -- named as such) ─────────────────────────────────────
    # TRANSITION, naming the old value it replaced (feedback_invariant_vs_transition_tests).
    hook_code, page_code = code_only(hook), code_only(page)
    # 🔴 [code] not [text]: measured on comment-stripped source. The plain-text form of this very
    # assertion failed on the comment that documents the removal -- see code_only()'s docstring.
    check("T-ب-٦-s1  [code] TRANSITION — the old derivation `barbers.length > 0 ? 'booking' : "
          "'legacy'` is GONE from the hook's CODE; that exact expression was the signal until today, "
          "and it survives only inside the comment that explains its removal",
          "barbers.length > 0" not in hook_code and "deriveBookingMode({" in hook_code,
          f"still in raw text (as a comment): {'barbers.length > 0' in hook}")
    check("T-ب-٦-s2  [text] TRANSITION — `module_key: 'barber'` is no longer a literal in the hook; "
          "it was a bare literal until today and is now the resolved value",
          "module_key:     'barber'" not in hook and "module_key:     bookingModule," in hook)
    check("T-ب-٦-s3  [text] the first /barbers request is gated on the resolved module, so a legacy "
          "tenant no longer makes a request it has no use for",
          "if (bookingModule !== 'barber') { setBarbersLoading(false); return }" in hook
          and "[slug, bookingModule, barbersRetryKey]" in hook)
    check("T-ب-٦-s4  [text] the resolved module is read from config with an explicit null fallback, "
          "and exposed for P5-E to branch on",
          "config?.booking_module ?? null" in hook
          and "mode, bookingModule, lang," in hook)

    # The declared interim -- expected to be flipped by P5-E, which is why it names itself.
    check("T-ب-٦-s5  🔴 [code] DECLARED INTERIM — ReservePage's CODE still has NO `mode === "
          "'clinic'` branch, so a clinic falls through to LegacyPage, and the gap is written down "
          "where the next gate will act. P5-E closes this and flips this check",
          "mode === 'clinic'" not in page_code and "KNOWN, DECLARED GAP" in page,
          "gap documented in a comment, absent from the code")

    # ── INVARIANTS: what this gate must NOT have touched ───────────────────────────────────
    staff = read(os.path.join(ROOT, "frontend/src/components/dynamic-sections/StaffSection.jsx"))
    check("T-ب-٦-s6  [text] INVARIANT — StaffSection's own /barbers fetch is untouched: it is a "
          "homepage showcase list, unrelated to booking",
          "publicApi.get('/reservations/barbers'" in staff
          and "booking_module" not in staff and "deriveBookingMode" not in staff)
    admin = read(os.path.join(ROOT, "frontend/src/pages/generic-admin/components/reservationInteractions.jsx"))
    check("T-ب-٦-s7  [text] INVARIANT — the admin quick-book still sends module_key 'barber' "
          "literally; it is a different surface and out of this gate's scope",
          "module_key: 'barber'" in admin)
    check("T-ب-٦-s8  [text] INVARIANT — ReservePage's three real mode branches are all still there "
          "(positive control: the gate changed the SIGNAL, not the dispatch)",
          "mode === 'loading'" in page and "mode === 'error'" in page
          and "mode === 'booking'" in page)
    check("T-ب-٦-s9  [text] INVARIANT — the pure module imports nothing: no React, no publicApi, "
          "which is what makes it callable from node",
          "import" not in pure.split("export")[0], "zero imports before first export")

    print("\nALL GREEN" if ok else "\nFAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
