# Owner Onboarding Checklist — Start Here
## Salman SaaS: Your First 2 Weeks

Complete this in order. Each item should take 30 min → 2 hours. Don't skip ahead.

---

## WEEK 1: FOUNDATIONS

### Day 1: Project Walkthrough (90 min)

- [ ] **Read these 3 docs (in order, skim aggressively):**
  1. `CLAUDE.md` (5 min) — tech stack overview
  2. `Project_Memory___Execution_Status.md` (10 min) — current state snapshot
  3. `roadmap_audit_april.md` sections 1-2 (15 min) — what's done, what's pending
  
- [ ] **Set up local access:**
  - [ ] Cloned the repo locally (or have access to it)
  - [ ] Know where backend lives: `app/` folder
  - [ ] Know where frontend lives: `src/` folder
  - [ ] Know where docs live: `docs/` or uploaded here

- [ ] **Bookmark these tools:**
  - [ ] Railway (backend logs & deployment): https://railway.app
  - [ ] Vercel (frontend deployment): https://vercel.com
  - [ ] Supabase (database): https://supabase.com
  - [ ] Your admin dashboard (staging): http://localhost:3000/smar/admin (after you run locally)

**✅ Checkpoint:** You can explain in 2 sentences: "What does this SaaS do? What are its 3 main components?"
- *Expected:* "It's a booking platform for properties in MENA. Frontend (React), Backend (FastAPI), Database (Supabase)."

---

### Day 2: Revenue Flow (120 min)

- [ ] **Understand where money comes from:**
  - [ ] Read: `new_tenant_checklist.md` (5 min)
  - [ ] Trace: How does a booking create revenue? Answer: Property manager creates unit → customer books → pays WhatsApp/card → you take 5-10% commission
  
- [ ] **Find the payment code:**
  - [ ] Locate: `app/services/payment_service.py` (backend)
  - [ ] Locate: Admin dashboard payments section (frontend)
  - [ ] Don't understand it all, just know it exists
  
- [ ] **Simulate a booking in your head:**
  - [ ] Customer visits smar.salmansaas.com → clicks a unit → books → pays
  - [ ] Where does money go? (Stripe/Whish account, minus 2.9% + $0.30 fee, then you take your cut)
  - [ ] Where does booking data go? (Supabase `bookings` table)
  - [ ] Who gets notified? (Property manager via WhatsApp)

- [ ] **Write down (seriously, write it down):**
  - "When a customer books a unit for $100:"
    - [ ] How much does Stripe take? ______
    - [ ] How much do you take? ______
    - [ ] How much does the property manager get? ______
    - [ ] How long until the property manager sees the money? ______

**✅ Checkpoint:** You understand the money flow. If a tenant says "I didn't get paid," you know where to look.

---

### Day 3: Tenant Setup (120 min)

- [ ] **Read the checklist obsessively:**
  - [ ] Open: `new_tenant_checklist.md`
  - [ ] Read it 3 times (seriously, 3 times)
  - [ ] Highlight the 5 critical steps

- [ ] **Understand each step without doing it yet:**
  1. [ ] CORS Whitelist (why: preflight requests fail if origin not whitelisted)
  2. [ ] Frontend Registry (why: router looks here to find the routes)
  3. [ ] Routes File (why: defines which pages exist)
  4. [ ] Database Seed (why: creates initial Client row)
  5. [ ] Railway Env Vars (why: backend reads URLs from here)

- [ ] **Map to actual files:**
  - [ ] Find `app/core/config.py` → locate `CORS_ORIGINS`
  - [ ] Find `src/router/tenants/index.js` → locate the registry
  - [ ] Find `src/router/tenants/smar.routes.jsx` → see an example
  - [ ] Find `prisma/schema.prisma` → see Client model

- [ ] **Key insight:** If a new tenant doesn't work, one of these 5 things is broken. Which one?

**✅ Checkpoint:** You can explain "What happens if I forget step 1?" → "CORS fails, browser blocks requests with 400 error."

---

### Day 4: Database Basics (120 min)

- [ ] **Open Supabase dashboard:**
  - [ ] Go to: https://supabase.com → your project
  - [ ] Click: "Table Editor"
  - [ ] See these tables:
    - [ ] `clients` (tenants: smar, demo, vila)
    - [ ] `units` (the properties for rent)
    - [ ] `bookings` (all reservations)
    - [ ] `customers` (who booked)
    - [ ] `prices` (per-date pricing)

- [ ] **Understand relationships (without SQL):**
  - [ ] Client → "has many" Units (1:N)
  - [ ] Unit → "has many" Bookings (1:N)
  - [ ] Booking → "belongs to" Customer (N:1)
  - [ ] Unit → "has many" Prices (1:N)

- [ ] **Find a real booking:**
  - [ ] Go to `bookings` table
  - [ ] Pick one row (any booking)
  - [ ] See its fields: `status`, `check_in`, `check_out`, `amount_paid`, `payment_method`
  - [ ] Trace it back: Click the `customer_id` → see the customer
  - [ ] Trace it forward: Click the `unit_id` → see the unit

- [ ] **Do this exercise:**
  - [ ] Find Beit Smar's Client row → copy the `id`
  - [ ] Find all Units with that `client_id` → how many are there?
  - [ ] Count total bookings for Beit Smar (hint: filter by `client_id`)

**✅ Checkpoint:** You can find any booking, customer, or unit in Supabase in < 2 minutes.

---

### Day 5: Local Setup (120 min)

- [ ] **Get the backend running:**
  - [ ] Open `start_dev.bat` (Windows) or equivalent for your OS
  - [ ] Run it
  - [ ] Wait for: `Uvicorn running on http://127.0.0.1:8000`
  - [ ] Visit: http://localhost:8000 → should see "Docs" (API documentation)

- [ ] **Get the frontend running:**
  - [ ] Open new terminal in `src/` folder
  - [ ] Run: `npm run dev`
  - [ ] Wait for: `Local: http://localhost:5173`
  - [ ] Visit: http://localhost:5173 → should see Beit Smar site

- [ ] **Try a booking end-to-end:**
  - [ ] Frontend: Visit http://localhost:5173/smar/listings
  - [ ] Click a unit → try to book
  - [ ] Watch your browser console (F12) for network requests
  - [ ] You should see a POST to `http://localhost:8000/api/v1/public/...`
  - [ ] If it succeeds, check backend logs (the terminal running uvicorn)
  - [ ] Check Supabase: see a new row in `bookings` table

- [ ] **Celebrate: you traced a booking locally!**

**✅ Checkpoint:** You can run the full stack locally and trace a booking from UI to database.

---

### Day 6-7: Your First Diagnosis (120 min)

- [ ] **Scenario: A customer complains "I can't book!"**
  
  **Your systematic approach:**
  1. [ ] Check: Does the button appear? (If not, frontend rendering bug)
  2. [ ] Check: Does clicking it do anything? (F12 → Console, look for errors)
  3. [ ] Check: Do network requests go out? (F12 → Network tab, look for XHR/Fetch)
  4. [ ] Check: What's the API response? (Network tab → click the request → "Response")
  5. [ ] Check: If API fails, check backend logs (Railway dashboard)
  6. [ ] Check: Is it all tenants or just one? (Ask: "Can you try a different property?" or test another unit)
  
- [ ] **Practice this diagnosis on a fake bug:**
  - [ ] Ask your dev: "Introduce a small bug (anything), I'll diagnose it."
  - [ ] Work through the 6 steps above
  - [ ] Time yourself: Can you find it in < 15 minutes?

- [ ] **Create your "Diagnosis Flowchart":**
  ```
  User can't book
    ├─ Button doesn't show? → Frontend rendering
    ├─ Button shows but doesn't respond? → JS error (console)
    ├─ Button works but request fails? → API/Backend error (network tab → response)
    ├─ Request succeeds but data wrong? → Supabase data issue
    └─ All tenants broken? → Critical (page 1), else → Tenant-specific
  ```

**✅ Checkpoint:** You can diagnose a booking bug in 15 minutes without dev help.

---

## WEEK 2: OPERATIONS

### Day 8: Tenant Configuration (90 min)

- [ ] **Access the admin dashboard:**
  - [ ] Go to: http://localhost:3000/smar/admin (or your deployed staging)
  - [ ] Login as admin (email/password from your team)
  - [ ] Click: "Settings" tab

- [ ] **See what can be configured:**
  - [ ] Tenant name (English + Arabic)
  - [ ] Primary color (try changing Beit Smar gold to blue)
  - [ ] WhatsApp number (the contact number shown to customers)
  - [ ] Currency (USD, SAR, AED)
  - [ ] Payment methods (which ones are enabled?)
  - [ ] Features (spatial, listings, booking, payment)

- [ ] **Actually change something:**
  - [ ] Change primary_color from `#d4a853` to `#3b82f6` (blue)
  - [ ] Save
  - [ ] Go to frontend http://localhost:5173/smar
  - [ ] Refresh: Do you see blue instead of gold?
  - [ ] Revert to gold

- [ ] **Understand the flow:**
  - [ ] You change color in Admin → saves to Supabase `clients` table
  - [ ] Frontend calls `GET /api/v1/public/smar/config` → reads from `clients` table
  - [ ] Frontend renders with that color
  - [ ] No code deploy needed!

**✅ Checkpoint:** You understand how tenant branding works. You can change a color in 5 minutes.

---

### Day 9: Troubleshooting Playbook (120 min)

- [ ] **Build a "Troubleshooting Decision Tree":**
  
  Create a document (or print this) with decision points:
  
  ```
  PROBLEM: ___________________
  
  Q1: Is it affecting ALL tenants or just ONE?
    → All: P0 Critical (infrastructure issue)
    → One: P1 High (tenant-specific config issue)
  
  Q2: Is it frontend, backend, or database?
    → Frontend: Check browser console (F12)
    → Backend: Check Railway logs + Supabase
    → Database: Check Supabase table directly
  
  Q3: Is it a code issue or a configuration issue?
    → Code: Need developer to fix
    → Config: You can fix it now (colors, URLs, etc.)
  
  Q4: When did it start? (today? after a deploy? after new tenant?)
    → Today after deploy: Rollback (revert code)
    → After new tenant: Check tenant config (step 1-5 checklist)
    → Sporadic: Check logs for clues (errors, timeouts)
  ```

- [ ] **Apply it to a real scenario:**
  - Scenario: "Bookings on Beit Smar are failing, but demo.salmansaas.com works fine."
  - Q1 answer: One tenant → P1
  - Q2 answer: Need to check (frontend working? API response? Supabase data?)
  - Q3 answer: Likely config (Beit Smar specific)
  - Next steps: Check Beit Smar's config in admin dashboard

**✅ Checkpoint:** You have a systematic approach to any problem.

---

### Day 10: Payment & Revenue (120 min)

- [ ] **Understand your payment methods:**
  - [ ] Whish (Arabic payment, popular in KSA): takes X%, you take Y%
  - [ ] OMT (Middle East transfer): similar
  - [ ] Stripe (global): takes 2.9% + $0.30, you take Z%
  - [ ] WhatsApp direct (customer sends money, you confirm): 0% fee
  - [ ] Cash at property: 0% fee

- [ ] **Know the flow for each:**
  - [ ] Customer selects payment method
  - [ ] If card/Whish: redirected to payment gateway → approved/declined
  - [ ] If WhatsApp/Cash: booking confirmed, customer sees instructions
  - [ ] Booking marked as PENDING_PAYMENT until you confirm receipt

- [ ] **Simulate a failed payment:**
  - [ ] Go to admin dashboard → Reservations
  - [ ] Find a booking with status PENDING_PAYMENT
  - [ ] Question: If it's been 48 hours and customer didn't pay, what do you do?
    - [ ] Option 1: Cancel it automatically (customer might be upset)
    - [ ] Option 2: Send reminder via WhatsApp (gentle)
    - [ ] Option 3: Call customer (personal touch)
  - [ ] Write down your policy: "Bookings auto-cancel after ___ days of no payment"

- [ ] **Calculate your unit economics:**
  - [ ] If a booking is $100:
    - [ ] Stripe takes 2.9% + $0.30 = $3.20
    - [ ] You take 10% commission = $10
    - [ ] Property manager gets $86.80
    - [ ] Your net after hosting cost? (need to calculate total costs)

**✅ Checkpoint:** You can explain payment flow to a new property manager. You know your margins.

---

### Day 11: Customer Support Scenarios (120 min)

For each scenario, write your response (don't overthink, be quick):

- [ ] **Scenario 1:** "I booked a villa but now I want to cancel. Can I get my money back?"
  - Your response: _____________
  - Actions needed: _____________
  - Time to resolve: _____________

- [ ] **Scenario 2:** "My booking button doesn't work. I tried on mobile and web."
  - Your response: _____________
  - Actions needed: _____________
  - Time to resolve: _____________

- [ ] **Scenario 3:** "I'm a property manager. I want to add my property to your platform. How much does it cost?"
  - Your response: _____________
  - Actions needed: _____________
  - Time to resolve: _____________

- [ ] **Scenario 4:** "I booked 2 nights but was only charged for 1. What happened?"
  - Your response: _____________
  - Actions needed: _____________
  - Time to resolve: _____________

- [ ] **Scenario 5:** "Your website shows wrong times. It says 3 PM check-in but I need 2 PM."
  - Your response: _____________
  - Actions needed: _____________
  - Time to resolve: _____________

**✅ Checkpoint:** You've thought through common support issues. You won't panic when they happen.

---

### Day 12: Monitoring & Alerts (120 min)

- [ ] **Set up uptime monitoring (free tier):**
  - [ ] Go to: https://uptimerobot.com
  - [ ] Create free account
  - [ ] Add your URLs:
    - [ ] https://salmansaas.com (or your deployed frontend)
    - [ ] https://api.salmansaas.com (or your deployed backend)
  - [ ] Set check interval: every 5 minutes
  - [ ] Get email alert if down: YES

- [ ] **Access backend logs on Railway:**
  - [ ] Go to: https://railway.app
  - [ ] Click your backend service
  - [ ] Click: "Logs" tab
  - [ ] Scroll to see recent requests/errors
  - [ ] Search for "500" or "error" to find failures

- [ ] **Create a simple "Health Check" routine:**
  - [ ] Every morning (takes 2 min):
    - [ ] Check Uptime Robot: any downtime last night?
    - [ ] Check Railway logs: any errors?
    - [ ] Check Supabase: any queries timing out?
  - [ ] If anything odd, investigate before opening to customers

- [ ] **Document your on-call procedure:**
  - [ ] If platform goes down at 3 AM:
    - [ ] Who do you call? (your dev, you personally)
    - [ ] What's the rollback procedure? (revert last deploy on Railway)
    - [ ] How long till it's back up? (< 5 min if you know what you're doing)

**✅ Checkpoint:** You'll know if the platform is down before customers complain.

---

### Day 13: Your First Real Onboarding (180 min)

- [ ] **Get a test "property manager" (friend, colleague, or your own test property)**

- [ ] **Walk through the 5-step checklist:**
  1. [ ] Add their domain to CORS whitelist (ask your dev for help this first time)
  2. [ ] Create their registry entry in `src/router/tenants/index.js`
  3. [ ] Create their routes file (copy from smar.routes.jsx)
  4. [ ] Seed their Client + Unit rows in database (via admin or SQL)
  5. [ ] Deploy and test
  
- [ ] **Verify it works:**
  - [ ] Can they access their subdomain?
  - [ ] Can they see their branding (colors, logo)?
  - [ ] Can they see their units?
  - [ ] Can a test customer book?

- [ ] **Document what went wrong (there will be something):**
  - [ ] Was it missing CORS? Missing registry? Bad data?
  - [ ] How long did it take total?
  - [ ] Can you do it faster next time?

- [ ] **Refinement:**
  - [ ] Ask your dev: "Can we automate steps 1-4 with a script?"
  - [ ] Goal: Make onboarding a 30-minute job, not 2 hours

**✅ Checkpoint:** You've onboarded a real tenant. You know where the friction is.

---

### Day 14: Creating Your Playbooks (120 min)

Create these 3 documents (they're your insurance policy):

- [ ] **Playbook 1: New Tenant Onboarding**
  ```
  Title: "How to Onboard a New Property Manager"
  
  Pre-onboarding (1 day before):
  - [ ] Confirm their domain name (e.g., vila.salmansaas.com)
  - [ ] Ask for: business name, WhatsApp number, payment methods, units info
  
  Day 1 (1 hour):
  - [ ] Step 1: CORS (follow new_tenant_checklist.md step 1)
  - [ ] Step 2: Registry (follow new_tenant_checklist.md step 2)
  - [ ] [etc...]
  
  Day 2 (30 min):
  - [ ] Verify on live site
  - [ ] Create 2 test bookings
  - [ ] Send welcome email to property manager
  ```

- [ ] **Playbook 2: Support Ticket Triage**
  ```
  P0 (Fix immediately, < 30 min):
  - Bookings broken (all tenants)
  - Payment processing failing
  - Database down (platform totally unavailable)
  
  P1 (Fix within 4 hours):
  - One tenant can't book
  - Admin dashboard slow
  - Specific feature broken
  
  P2 (Fix within 24 hours):
  - UI bug (doesn't affect revenue)
  - Typo or aesthetic issue
  
  P3 (Backlog):
  - Feature requests
  - "Nice to have" improvements
  ```

- [ ] **Playbook 3: Troubleshooting Decision Tree**
  (Copy the one you made on Day 9)

**✅ Checkpoint:** If you get hit by a bus, your dev can run the company. (Don't actually get hit by a bus.)

---

## GRADUATION: Week 2 Complete ✅

**By now, you should be able to:**

- ✅ Explain the business model (SaaS for property managers in MENA)
- ✅ Trace a booking from customer click to database row
- ✅ Run the full stack locally
- ✅ Diagnose a booking bug in 15 minutes
- ✅ Change a tenant's branding in the admin dashboard
- ✅ Onboard a new property manager (with dev help for deploy)
- ✅ Handle basic support tickets
- ✅ Monitor platform health daily
- ✅ Know where money comes from and where it goes

**Next Phase (Week 3+):**
- [ ] Close your first paid tenant
- [ ] Deploy a code change without dev help
- [ ] Manage admin dashboard KPI metrics
- [ ] Build financial dashboard (revenue, churn, growth)

---

## One More Thing: Make It a Habit

- [ ] **Daily (5 min):** Check uptime, scan logs
- [ ] **Weekly (30 min):** Review metrics, list support issues
- [ ] **Monthly (2 hours):** Review playbooks, update procedures
- [ ] **Quarterly (4 hours):** Review roadmap, plan next features

You've got this. 🚀
