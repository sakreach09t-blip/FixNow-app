# FixNow

Home-services booking platform for Phnom Penh. The original static HTML site was upgraded to:

| Part | Tech | Folder |
|---|---|---|
| Front end | React 18 + Vite + React Router | `frontend/` |
| API | Node.js + Express + PostgreSQL | `backend/node/` |
| Smart services | Python + FastAPI | `backend/python/` |
| Database | Neon PostgreSQL (`db/schema.sql`, `db/seed-data.json`) | `db/` |

The original design is unchanged: `frontend/src/styles/style.css` is your stylesheet (plus the animation CSS added earlier), and
the transitions and animations now live in React (`src/hooks/motion.jsx`, `Header.jsx`, `FaqItem.jsx`).

## How the pieces talk

```
Browser ──> React (Vite / nginx) ──/api──> Node API ──> Neon PostgreSQL
   ├────────> Firebase Auth
   └────────> Neon Realtime
                                              └────────> Python service
```
Firebase Auth manages sign-in and sessions. The Node API verifies Firebase ID tokens and maps each Firebase UID to the FixNow profile, role and bookings stored in Neon Postgres.
The browser uses Node for application APIs, Firebase Auth for identity and Neon Realtime for live booking updates. Node asks Python for three things:
- `POST /rank` typo-tolerant, synonym-aware technician search ("leaking tap" finds plumbers)
- `POST /validate-booking` date window and "at least 1 hour from now" rules (Phnom Penh time)
- `POST /ics` builds the calendar file for a booking

If Python is down, Node falls back to simple built-in versions, so the site keeps working.
Booking rules and calendar exports use `Asia/Phnom_Penh`; the application currently targets Phnom Penh.
State-changing requests are checked against the configured origin allowlist. Authentication uses bearer tokens in the `Authorization` header rather than cookies, so browser requests do not rely on ambient cookie credentials.

## Run with Docker (easiest)
```bash
# .env.local is created by `neon env pull` from the linked project.
docker compose --env-file .env.local up --build
# open http://localhost:8081
```

## Run locally for development
You need Node 20+, Python 3.11+ and a linked Neon project.

```bash
# 1. Pull the linked Neon project's local environment to the repository root.
npx neon@latest env pull

# 2. Python service  (port 8000)
cd backend/python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000  # or 
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
pytest                      # optional tests

# 3. Node API (port 4000). Applies schema and starter data on start.
cd backend/node
npm install
npm run dev

# 4. React app  (port 5173, proxies /api to :4000)
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

## Firebase Auth setup

Create a Firebase web app, enable the Email/Password sign-in provider, and add its web configuration to the root `.env.local`:

```dotenv
FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
# For Docker Compose, use a local credential file outside the repository.
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/firebase-admin-credentials.json
```

The `VITE_` values are public Firebase web-app configuration and are embedded in the frontend build. The Node API verifies ID tokens with Firebase Admin using Application Default Credentials. For local development, configure ADC (for example, with `gcloud auth application-default login`) or point `GOOGLE_APPLICATION_CREDENTIALS` to a service-account file kept outside the repository. Docker Compose mounts that file read-only into the API container, so set its host path in `.env.local` (use a Docker-compatible absolute path on Windows). In production, use the hosting platform's service identity. Never put Admin credentials in frontend variables.

Existing profiles still use Neon for application data and roles. On first sign-in, a Firebase account with a verified email can be linked to a profile previously linked to Neon Auth; otherwise, the user must verify that email or provide their previous FixNow password. Firebase Security Rules do not protect Neon, so all database access and role checks remain in the Node API.

## API
| Method | Path | Notes |
|---|---|---|
| GET | `/api/meta` | services, districts, time slots, FAQ, contact, stats |
| GET | `/api/technicians?q=&service=&area=&available=1&sort=&limit=` | `q` is ranked by the Python service |
| GET | `/api/technicians/:id/slots?date=YYYY-MM-DD` | taken / too-soon slots |
| POST | `/api/auth/register` | Creates or links the FixNow profile for the signed-in Firebase Auth user |
| GET | `/api/auth/me` | FixNow profile for the signed-in Firebase Auth user |
| POST | `/api/bookings` | guest or signed in. A unique index stops double-booking |
| GET | `/api/bookings` | signed-in user's bookings |
| GET | `/api/bookings/live` | Sealed Neon Realtime query scoped to the signed-in user's bookings |
| GET | `/api/ai/models` | Current Neon AI Gateway model availability |
| POST | `/api/ai/assist` | Authenticated home-service assistant via Neon AI Gateway |
| GET | `/api/neon/hello` | Calls the deployed Neon Function |
| GET | `/api/bookings/lookup?ref=&phone=` | guest lookup |
| POST | `/api/bookings/:id/cancel` | owner, or reference + phone |
| GET | `/api/bookings/:id/ics` | calendar file |
| POST | `/api/contact` | stored in the `messages` table |

## Admin dashboard
The dashboard is available at `/admin`; its API requires a signed-in user whose database role is `admin`. Public registration only permits customer and technician roles.

To create the first administrator, register a normal account, then promote that account using a trusted database session after the API has applied the schema:
```sql
UPDATE users
SET role = 'admin'
WHERE lower(email) = lower('admin@example.com')
  AND role IN ('customer', 'technician')
  AND deleted_at IS NULL
RETURNING id, email, role;
```

The dashboard lists registered accounts separately from public technician listings. Suspensions end at the selected date and time. Account deletion anonymizes the account and linked booking contact details; hiding a technician listing preserves its booking history. The booking-value summary is an estimate based on confirmed bookings' listed starting prices, not recorded payments.

The backend loads generated Neon values from the root `.env.local`, uses the pooled `DATABASE_URL` for normal requests and the direct `DATABASE_URL_UNPOOLED` for schema migrations. The frontend receives only public Firebase web configuration and the Neon Realtime URL.

## Before going live
- Add the production frontend domain to Firebase Authentication's authorized domains and configure production email delivery.
- Add Neon AI Gateway credits to enable model inference.
- Technician ratings, job counts and bios in `db/seed-data.json` are sample data. Contact details are placeholders.
- Privacy and Terms pages are template text and need a legal review.
- Contact messages and technician applications are saved in the database; sending email notifications is not wired up yet.
- New technician sign-ups are stored as `pending-review` users; an admin screen to approve them and publish a profile is not built yet.
