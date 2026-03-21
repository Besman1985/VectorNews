# VectorNews

VectorNews is a dark-theme international news platform scaffold built as a scalable monorepo:

- `apps/web`: Next.js 15 frontend with App Router, editorial pages, search, RSS, theme switching, and an admin console UI.
- `apps/api`: Python HTTP API with the same public contract, MySQL support, and JWT auth verification.
- `packages/shared`: shared TypeScript domain types and editorial seed data used by both frontend and Python API.

## Run

```bash
npm install
python -m pip install -r apps/api/requirements.txt
npm run dev:web
npm run dev:api
```

## Environment

Frontend `apps/web` can work in two modes:

- fallback mode without external API, using shared seed content and local demo mutations
- integrated mode through the Python API

Set these variables for integrated mode:

```bash
# apps/api/.env or apps/api/.env.local
PORT=4000
API_PUBLIC_URL=http://localhost:4000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=vectornews
CLIENT_ORIGIN=http://localhost:3000
ADMIN_JWT_SECRET=replace-with-long-random-secret
FIREBASE_SERVICE_ACCOUNT_PATH=../../firebase-adminsdk.json
FIRESTORE_EDITORS_CHOICE_COLLECTION=Editor'sСhoice
FIRESTORE_EDITORS_CHOICE_DOCUMENT=Data
FIRESTORE_EDITORS_CHOICE_FIELD=Posts

# apps/web/.env.local
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
REVALIDATE_SECRET=vectornews-demo
ADMIN_JWT_SECRET=replace-with-the-same-secret-as-api
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIRESTORE_ADMIN_COLLECTION=admin_users
```

Admin authentication now uses Firestore. Store admin users in collection `admin_users` with fields:

- `email`
- `passwordHash`
- `active`
- `role`
- `name`

Example password hash generation:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10))"
```

You can also seed or update an admin automatically:

```bash
npm run seed:admin -- --email admin@example.com --password your-password --name "Main Admin" --service-account C:\path\firebase-adminsdk.json
```

Optional flags:

- `--role`
- `--collection`
- `--inactive`

The script file:

- [scripts/seed-firestore-admin.ts](c:/Users/Besman/Desktop/VectorNews/scripts/seed-firestore-admin.ts)

## Stack

- Next.js + React + TypeScript + Tailwind CSS
- Python stdlib HTTP server + optional MySQL Connector + Node.js frontend
- Shared package for domain models

## API

Base URL for API:

```bash
http://localhost:4000/api/v1
```

### Health

`GET /health`

Response:

```json
{
  "ok": true,
  "service": "vectornews-api"
}
```

`GET /api/v1/health/db`

Response when MySQL is available:

```json
{
  "ok": true,
  "message": "MySQL connection is available",
  "database": "vectornews",
  "host": "127.0.0.1",
  "port": 3306
}
```

### Feed

`GET /api/v1/feed`

Returns homepage feed blocks:

- `hero`
- `latest`
- `popular`
- `editorPicks` from Firestore document `Editor'sСhoice/Data`, field `Posts`
- `categories`

Example:

```bash
curl http://localhost:4000/api/v1/feed
```

### Articles

`GET /api/v1/articles`

Returns all articles.

Example:

```bash
curl http://localhost:4000/api/v1/articles
```

`GET /api/v1/articles/:slug`

Returns a single article by slug.

Example:

```bash
curl http://localhost:4000/api/v1/articles/vector-alliances-redefine-global-tech-logistics
```

`POST /api/v1/articles`

Creates a new article from admin payload.

Authorization:

- requires `Authorization: Bearer <admin-jwt>`

Request body:

```json
{
  "title": "Новый материал",
  "slug": "novyy-material",
  "excerpt": "Короткий анонс",
  "coverImage": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
  "category": "technology",
  "content": ["Первый абзац", "Второй абзац"],
  "tags": ["AI", "Media"]
}
```

Example:

```bash
curl -X POST http://localhost:4000/api/v1/articles ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Новый материал\",\"slug\":\"novyy-material\",\"excerpt\":\"Короткий анонс\",\"coverImage\":\"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80\",\"category\":\"technology\",\"content\":[\"Первый абзац\",\"Второй абзац\"],\"tags\":[\"AI\",\"Media\"]}"
```

`POST /api/v1/articles/:slug/like`

Increments article likes counter.

Example:

```bash
curl -X POST http://localhost:4000/api/v1/articles/vector-alliances-redefine-global-tech-logistics/like
```

`POST /api/v1/articles/:slug/comments`

Adds a comment to an article.

Request body:

```json
{
  "authorName": "Ivan",
  "authorRole": "Reader",
  "body": "Сильный материал"
}
```

Example:

```bash
curl -X POST http://localhost:4000/api/v1/articles/vector-alliances-redefine-global-tech-logistics/comments ^
  -H "Content-Type: application/json" ^
  -d "{\"authorName\":\"Ivan\",\"authorRole\":\"Reader\",\"body\":\"Сильный материал\"}"
```

### Categories

`GET /api/v1/categories`

Returns all categories.

Example:

```bash
curl http://localhost:4000/api/v1/categories
```

`GET /api/v1/categories/:slug/articles`

Returns articles by category slug.

Example:

```bash
curl http://localhost:4000/api/v1/categories/technology/articles
```

### Search

`GET /api/v1/search?q=<query>`

Searches by title, excerpt, category name, and tags.

Example:

```bash
curl "http://localhost:4000/api/v1/search?q=AI"
```

### Admin Stats

`GET /api/v1/admin/stats`

Returns dashboard metrics.

Example response:

```json
{
  "totalArticles": 6,
  "totalViews": 54960,
  "totalComments": 2
}
```

Example:

```bash
curl http://localhost:4000/api/v1/admin/stats
```

Authorization:

- requires `Authorization: Bearer <admin-jwt>`

## Admin Authentication

Admin UI lives at:

```bash
http://localhost:3000/admin/login
```

Web auth endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`

Protected web routes:

- `/admin`
- `/api/admin/*`

The web app validates admin credentials against Firestore, stores an HTTP-only admin JWT cookie, and forwards it to protected API endpoints as a Bearer token.

## Implemented surfaces

- Home page
- Article page
- Category page
- Search page
- Admin dashboard
- Comments, likes, view counters, recommendations
- RSS feed and sitemap

## Notes

- The frontend ships with seed content so the portal renders immediately.
- The frontend now uses a unified data layer and proxies mutations to the Python API when `API_URL` is configured.
- Admin authentication is implemented with Firestore-backed admin users, signed JWT cookies in Next.js, and Bearer verification in the Python API.
- Article cover images use the `coverImage` URL stored in the database.
- Publications no longer have authorship metadata.
- The backend keeps the same HTTP contract as before and falls back to in-memory seed data if MySQL is unavailable.

## VDS Deployment Pipeline

Below is a production pipeline for a typical Ubuntu 22.04/24.04 VDS with:

- `Nginx` as reverse proxy
- `systemd` for process management
- `Node.js` for `Next.js`
- `Python` for `apps/api/server.py`
- `MySQL` on the same server or on a separate host

### 1. Prepare the server

Connect to the server:

```bash
ssh root@your_vds_ip
```

Create a deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
```

Install base packages:

```bash
apt update
apt install -y nginx git curl unzip python3 python3-pip python3-venv mysql-client
```

Install Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

Optional but recommended firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 2. Create directories

Run as `deploy`:

```bash
mkdir -p /var/www/vectornews
mkdir -p /var/www/vectornews/shared
mkdir -p /var/www/vectornews/logs
chown -R deploy:deploy /var/www/vectornews
```

### 3. Clone the repository

```bash
cd /var/www/vectornews
git clone <YOUR_REPOSITORY_URL> app
cd /var/www/vectornews/app
```

If the repository is already on the server, use:

```bash
cd /var/www/vectornews/app
git pull origin main
```

### 4. Install project dependencies

Install Node dependencies in the monorepo root:

```bash
cd /var/www/vectornews/app
npm install
```

Create a Python virtual environment for the API:

```bash
cd /var/www/vectornews/app
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r apps/api/requirements.txt
deactivate
```

### 5. Prepare Firebase secrets

The API expects a service account file path via `FIREBASE_SERVICE_ACCOUNT_PATH`.

Place the file outside the repo:

```bash
mkdir -p /var/www/vectornews/shared/secrets
nano /var/www/vectornews/shared/secrets/firebase-adminsdk.json
chmod 600 /var/www/vectornews/shared/secrets/firebase-adminsdk.json
chown deploy:deploy /var/www/vectornews/shared/secrets/firebase-adminsdk.json
```

For the Next.js app, Firebase Admin credentials are read from env variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Client-side auth also needs:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

### 6. Create production env files

Create `apps/api/.env`:

```bash
cd /var/www/vectornews/app
nano apps/api/.env
```

Example:

```bash
PORT=4000
API_PUBLIC_URL=https://api.example.com
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=vectornews
MYSQL_PASSWORD=strong_mysql_password
MYSQL_DATABASE=vectornews
CLIENT_ORIGIN=https://example.com
FIREBASE_SERVICE_ACCOUNT_PATH=/var/www/vectornews/shared/secrets/firebase-adminsdk.json
FIRESTORE_EDITORS_CHOICE_COLLECTION=Editor'sChoice
FIRESTORE_EDITORS_CHOICE_DOCUMENT=Data
FIRESTORE_EDITORS_CHOICE_FIELD=Posts
ADMIN_JWT_SECRET=long_random_admin_secret
USER_ACTION_JWT_SECRET=long_random_user_action_secret
STORAGE_PROVIDER=local
```

Create `apps/web/.env.production`:

```bash
nano apps/web/.env.production
```

Example:

```bash
NODE_ENV=production
API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_API_URL=https://example.com
REVALIDATE_SECRET=long_random_revalidate_secret
ADMIN_JWT_SECRET=long_random_admin_secret
USER_ACTION_JWT_SECRET=long_random_user_action_secret
USER_JWT_SECRET=long_random_user_session_secret
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIRESTORE_ADMIN_COLLECTION=admin_users
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
```

Notes:

- `ADMIN_JWT_SECRET` in web and API must be identical.
- `USER_ACTION_JWT_SECRET` in web and API should also be identical.
- `API_URL` for Next.js server-side requests should point to the internal API URL, usually `http://127.0.0.1:4000`.
- `NEXT_PUBLIC_API_URL` should point to the public domain if the browser should access the public endpoint.

### 7. Prepare MySQL

If MySQL is on the same server:

```bash
mysql -u root -p
```

Then:

```sql
CREATE DATABASE vectornews CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vectornews'@'127.0.0.1' IDENTIFIED BY 'strong_mysql_password';
GRANT ALL PRIVILEGES ON vectornews.* TO 'vectornews'@'127.0.0.1';
FLUSH PRIVILEGES;
```

The API creates the required database tables on startup if MySQL is reachable.

### 8. Build the application

Run from the repo root:

```bash
cd /var/www/vectornews/app
npm run build
```

This will build:

- `packages/shared`
- `apps/web`
- `apps/api` does not have a build step and is started directly by Python

### 9. Seed the Firestore admin user

After Firebase credentials are ready, create the admin user:

```bash
cd /var/www/vectornews/app
npm run seed:admin -- --email admin@example.com --password 'change-me' --name 'Main Admin' --service-account /var/www/vectornews/shared/secrets/firebase-adminsdk.json
```

### 10. Create systemd service for the API

Create `/etc/systemd/system/vectornews-api.service`:

```ini
[Unit]
Description=VectorNews Python API
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/vectornews/app/apps/api
ExecStart=/var/www/vectornews/app/.venv/bin/python /var/www/vectornews/app/apps/api/server.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

### 11. Create systemd service for the web app

Create `/etc/systemd/system/vectornews-web.service`:

```ini
[Unit]
Description=VectorNews Next.js web
After=network.target vectornews-api.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/vectornews/app
ExecStart=/usr/bin/npm --workspace @vectornews/web exec next start -- -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=-/var/www/vectornews/app/apps/web/.env.production

[Install]
WantedBy=multi-user.target
```

Important:

- the web service is started only after `npm run build`
- `next start` serves the already built `.next` output

### 12. Start and enable services

```bash
systemctl daemon-reload
systemctl enable vectornews-api
systemctl enable vectornews-web
systemctl start vectornews-api
systemctl start vectornews-web
```

Check status:

```bash
systemctl status vectornews-api
systemctl status vectornews-web
```

Logs:

```bash
journalctl -u vectornews-api -f
journalctl -u vectornews-web -f
```

### 13. Configure Nginx

Create `/etc/nginx/sites-available/vectornews`:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable config:

```bash
ln -s /etc/nginx/sites-available/vectornews /etc/nginx/sites-enabled/vectornews
nginx -t
systemctl reload nginx
```

### 14. Configure SSL with Let's Encrypt

Install Certbot:

```bash
apt install -y certbot python3-certbot-nginx
```

Issue the certificate:

```bash
certbot --nginx -d example.com -d www.example.com
```

Check auto-renew:

```bash
systemctl status certbot.timer
```

### 15. Smoke tests after deploy

Check local services:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/api/v1/health/db
curl http://127.0.0.1:3000
```

Check the public domain:

```bash
curl -I https://example.com
curl https://example.com/api/rss.xml
```

Open in browser:

- `/`
- `/search`
- `/admin/login`
- one article page

### 16. Deploy update pipeline

For each new release:

```bash
cd /var/www/vectornews/app
git pull origin main
npm install
. .venv/bin/activate
python -m pip install -r apps/api/requirements.txt
deactivate
npm run build
systemctl restart vectornews-api
systemctl restart vectornews-web
```

Then verify:

```bash
systemctl status vectornews-api --no-pager
systemctl status vectornews-web --no-pager
curl http://127.0.0.1:4000/health
curl -I https://example.com
```

### 17. Common failure points

- If the frontend opens but admin login fails, check Firebase Admin envs in `apps/web/.env.production`.
- If article data falls back to seed content, verify `API_URL` and API health.
- If protected API routes return `401`, verify that `ADMIN_JWT_SECRET` matches in both apps.
- If comment/like routes fail for logged in users, verify that `USER_ACTION_JWT_SECRET` matches in both apps.
- If editor picks are empty, verify the Firestore document path and service account permissions.
- If images fail in production, verify `API_URL` and `NEXT_PUBLIC_API_URL`, because `next.config.ts` uses them to allow remote image hosts.
