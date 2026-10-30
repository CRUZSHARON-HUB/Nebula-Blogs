# Nebula — Full-Stack Blog with Auth

A complete, working full-stack blog: a React single-page app with a hand-built 3D interface, a Django REST API with JWT authentication, and a SQL (SQLite) database.

**Demo login:** `demo` / `demo1234`

---

## What is included

- **React 19 + Vite 7** frontend (HTML + CSS + JSX, no UI or animation libraries)
- **Django 6 + Django REST Framework** backend with **SimpleJWT** auth
- **SQLite** database, pre-seeded with 4 writers, 10 stories (9 published + 1 draft), 15 threaded comments and 23 likes
- A custom **3D interface** — canvas-rendered rotating icosahedron, starfield and floating cubes, CSS 3D tilt cards, parallax hero deck, rotating auth cube, 3D modal entrances, and full `prefers-reduced-motion` support
- Lightweight **Markdown** rendering (headings, lists, quotes, code fences, inline formatting, safe links)

## Features

- Register / login / logout with JWT access + refresh tokens and automatic token refresh
- Publish, edit, delete and draft stories (drafts are private to their author)
- Markdown editor with live preview, cover themes, categories and tags
- Search, category filters, sorting (newest / most read / most discussed / oldest) and pagination
- Likes, one-level threaded comments, comment moderation by the author or post owner
- Author profiles with stats, published/drafts tabs, editable headline, bio and avatar
- Reading progress bar, related stories, shareable links, responsive layout and accessible focus states

---

## Quick start

Requirements: **Python 3.12+** and **Node.js 20+**.

### Windows (one click)

Double-click `start-backend.bat`, then `start-frontend.bat` in a second terminal window. The scripts create the virtual environment, install dependencies, apply migrations and start both servers.

### Manual (any OS)

**Backend**

```bash
cd backend
python -m venv ../.venv
# Windows: ..\.venv\Scripts\activate
source ../.venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

### Production build

```bash
cd frontend
npm run build      # outputs to frontend/dist
npm run preview    # serves the build on http://localhost:4173
```

If you serve the API from another host, set `VITE_API_URL` (for example `VITE_API_URL=https://api.example.com/api`) before building.

### Reseed the demo data

```bash
cd backend
python manage.py seed_demo --fresh
```

`--fresh` removes existing demo posts, comments and users before seeding.

---

## Demo accounts

| Username | Password   | Role                         |
| -------- | ---------- | ---------------------------- |
| `demo`   | `demo1234` | Main demo account, can write |
| `mira`   | `nebula123`| Design writer                |
| `kai`    | `nebula123`| Engineering writer           |
| `juno`   | `nebula123`| Security frontend writer     |

---

## Project structure

```
backend/
  config/                 Django project (settings, URLs, WSGI/ASGI)
  blog/
    models.py             User, Category, Post, Comment, Like
    serializers.py        Read/write serializers, auth payloads
    views.py              ViewSets + auth/profile/stats endpoints
    urls.py               API routes
    permissions.py        IsAuthorOrReadOnly
    pagination.py         Default page size 9
    management/commands/seed_demo.py
  db.sqlite3              Seeded SQL database
  requirements.txt

frontend/
  src/
    lib/                  API client, auth context, toast, formatting, tilt hook
    components/           3D canvas scene, navbar, cards, markdown, comments, dialogs
    pages/                Home, Login, Register, PostDetail, Editor, Profile, 404
    styles/               Design tokens, components, page styles
  index.html
  vite.config.js

start-backend.bat
start-frontend.bat
```

---

## API overview

Base URL: `/api`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/auth/register/` | Create an account, returns tokens + user |
| `POST` | `/auth/login/` | Sign in with username **or** email |
| `POST` | `/auth/refresh/` | Exchange a refresh token for a new access token |
| `GET/PATCH` | `/auth/me/` | Current user, update profile |
| `GET` | `/profiles/<username>/` | Public profile with stats |
| `GET` | `/stats/` | Global story, writer, comment and like counts |
| `GET` | `/posts/` | List published stories. Query: `q`, `category`, `tag`, `author`, `sort`, `page`, `page_size` |
| `POST` | `/posts/` | Create a story (auth) |
| `GET` | `/posts/<slug>/` | Story detail, increments views |
| `PATCH/DELETE` | `/posts/<slug>/` | Update or delete your story |
| `POST` | `/posts/<slug>/like/` | Toggle a like |
| `GET/POST` | `/posts/<slug>/comments/` | List or create comments/replies |
| `GET` | `/posts/<slug>/related/` | Three related stories |
| `DELETE` | `/comments/<id>/` | Delete your comment (or as post owner/staff) |
| `GET` | `/categories/` | Categories with story counts |

Authenticated requests use `Authorization: Bearer <access_token>`.

### Data model

- `User` — extends `AbstractUser` with headline, bio, avatar colour and avatar URL
- `Category` — name, slug, description, accent
- `Post` — author, title, unique slug, excerpt, content, category, tags, cover, theme, status, views, timestamps
- `Comment` — post, author, optional parent (one level of replies), body
- `Like` — unique per user per post

Drafts are excluded from public lists and are only retrievable by their author. Only authors can edit or delete their own stories; comment deletion is allowed for the comment author, the post author, or staff.

---

## Configuration notes

- `backend/config/settings.py` reads `SECRET_KEY`, `DEBUG` and `ALLOWED_HOSTS` from the environment, with development defaults.
- CORS is enabled for `localhost`/`127.0.0.1` ports 5173 and 4173.
- Access tokens last 45 minutes, refresh tokens 7 days.
- The SQLite file is committed with demo data so the app works immediately after `migrate`.
- Django admin is available at `/admin/` after creating a superuser (`python manage.py createsuperuser`).
