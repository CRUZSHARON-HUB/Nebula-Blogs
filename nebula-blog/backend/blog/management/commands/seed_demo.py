from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from blog.models import Category, Comment, Like, Post, User


CATEGORIES = [
    ("Design", "Interfaces, motion and typography", "#f472b6"),
    ("Engineering", "Architecture and hard-won lessons", "#7c5cff"),
    ("Frontend", "React, CSS and the browser", "#22d3ee"),
    ("Databases", "SQL, schema design and performance", "#34d399"),
    ("Security", "Auth, tokens and threat models", "#fbbf24"),
    ("Career", "Shipping, learning and growing", "#fb7185"),
]

USERS = [
    {
        "username": "demo",
        "password": "demo1234",
        "email": "demo@nebula.blog",
        "headline": "Full-stack tinkerer",
        "bio": "I build small, sharp products and write down what I learn. Currently obsessed with depth, parallax and the space between design and engineering.",
        "avatar_color": "#7c5cff",
    },
    {
        "username": "mira",
        "password": "nebula123",
        "email": "mira@nebula.blog",
        "headline": "Design systems & 3D interfaces",
        "bio": "Product designer who codes. I care about motion with meaning, accessible contrast, and interfaces that feel physical without being gimmicks.",
        "avatar_color": "#f472b6",
    },
    {
        "username": "kai",
        "password": "nebula123",
        "email": "kai@nebula.blog",
        "headline": "Backend engineer, SQL apologist",
        "bio": "Django and Postgres by day, SQLite experiments by night. I like boring technology that quietly survives production.",
        "avatar_color": "#22d3ee",
    },
    {
        "username": "juno",
        "password": "nebula123",
        "email": "juno@nebula.blog",
        "headline": "Security researcher",
        "bio": "Threat models, tokens and responsible disclosure. I break auth flows so you do not have to.",
        "avatar_color": "#34d399",
    },
]


POSTS = [
    {
        "author": "mira",
        "title": "Designing Interfaces That Live in Three Dimensions",
        "category": "Design",
        "theme": "aurora",
        "tags": ["3d", "css", "ux", "motion"],
        "excerpt": "Depth is not decoration. It is a way to explain hierarchy, focus and state without adding a single word of copy.",
        "status": "published",
        "views": 2418,
        "likes": ["demo", "kai", "juno"],
        "days_ago": 1,
        "content": """We have spent a decade flattening the web. Gone are the bevels and drop shadows of the skeuomorphic era, replaced by clean cards on clean backgrounds. The result is fast and legible, but it can also feel weightless. Nothing sits *in front* of anything else. Depth became a texture rather than a message.

## Depth is hierarchy you can feel

A panel that floats above the page tells you it is temporary: a dialog, a menu, a focused task. A card that tilts towards your cursor tells you it is a physical object worth touching. These are not decorative choices, they are signals. When used carefully, 3D gives users an extra channel for understanding what is foreground and what is background.

The trick is restraint. A page where everything floats is a page where nothing does.

- Use perspective on the container, never on the text.
- Keep rotations small. Six degrees of tilt reads as depth; thirty reads as a broken layout.
- Pair transforms with a soft, directional shadow so the light source stays believable.
- Always ship a `prefers-reduced-motion` path that removes the movement, not the layout.

## CSS is enough

You do not need a WebGL scene to create convincing space. A single `transform: perspective(900px) rotateX(...) rotateY(...)` plus a gradient overlay is often all it takes.

```css
.card {
  transform-style: preserve-3d;
  transition: transform 220ms ease;
}
.card:hover {
  transform: perspective(900px) rotateX(4deg) rotateY(-6deg) translateZ(18px);
}
```

The `translateZ` matters more than the rotation. It lifts the surface towards the viewer, which makes the shadow underneath grow naturally when you animate the shadow offset alongside it.

> If the interface feels like a diorama, you have gone too far. The goal is a page with a floor, not a page in orbit.

## Motion should answer a question

Every animation should answer a question the user is already asking. Where did this come from? What is selected now? What will happen if I click? Depth helps answer all three, but only if the motion is consistent. Pick one light direction, one camera distance, and one duration, then reuse them everywhere.

Three dimensions are a tool for clarity. Treat them like punctuation: powerful in the right place, exhausting if used on every line.
""",
    },
    {
        "author": "kai",
        "title": "SQLite in Production: When It Actually Works",
        "category": "Databases",
        "theme": "ocean",
        "tags": ["sqlite", "django", "sql", "backend"],
        "excerpt": "The database is a file, and that file is fast. Here is the honest list of trade-offs before you bet a product on it.",
        "status": "published",
        "views": 1975,
        "likes": ["demo", "mira", "juno"],
        "days_ago": 3,
        "content": """Every few months someone rediscovers that SQLite is shockingly capable and declares that Postgres is dead. Every few months someone else posts a horror story about `database is locked` and declares the opposite. Both are right, in context.

## What SQLite gives you

SQLite is a complete SQL database in a single file. No server, no network hop, no connection pool, no container. Backups are file copies. Local development is instant. For a blog, a side project, an internal tool, or a read-heavy site behind a cache, it is often the most reliable component in the stack.

The performance ceiling is higher than most people assume. With WAL mode enabled, readers do not block writers, and single-row reads take microseconds because the data is already in the page cache.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
```

## What it asks in return

SQLite has exactly one writer at a time. That is fine when writes are short and rare, and painful when they are long or constant. A background job that holds a transaction open for two seconds will stall every other write for two seconds. Under real concurrency you need retries, short transactions, and a busy timeout.

It also lives on a filesystem. Network filesystems and multi-instance deployments are where the "it is just a file" simplicity turns into a corruption story. One machine, one process group, one disk.

- Great: content sites, prototypes, desktop and CLI tools, test suites.
- Careful: high write throughput, long transactions, horizontal scaling.
- Avoid: shared network drives, many app servers writing concurrently.

## The Django setup

In Django, switching engines is a settings change, which makes SQLite a safe default to start with and a slightly annoying migration later. That asymmetry is the real cost: schema choices that are natural in SQLite, like loosely typed columns and application-level constraints, need rethinking on Postgres.

> Choose SQLite for the phase you are in, not the phase you hope to be in — but write migrations as if you will move.

I run this blog on SQLite. It serves a few thousand requests a day from one machine, writes a handful of rows at a time, and has never been the reason something broke. That is not a universal argument. It is a fit between a tool and a workload, which is all architecture ever is.
""",
    },
    {
        "author": "juno",
        "title": "A Field Guide to JWT Authentication",
        "category": "Security",
        "theme": "ember",
        "tags": ["jwt", "auth", "security", "django"],
        "excerpt": "Tokens are not sessions with extra steps. Understanding the difference is what keeps your refresh endpoint from becoming a liability.",
        "status": "published",
        "views": 3120,
        "likes": ["demo", "mira", "kai"],
        "days_ago": 5,
        "content": """JSON Web Tokens are the default answer to "how do we do auth" in modern APIs, and also one of the most commonly misconfigured. The format is simple: three base64url segments, a header, a payload, a signature. The difficulty is everything around them.

## What a JWT actually guarantees

A signed JWT guarantees that the payload was produced by someone holding the signing key, and that nobody has altered it since. That is all. It does **not** encrypt the payload. Anyone holding the token can read the claims, so never put secrets or sensitive personal data inside one.

It also cannot be revoked by itself. The server does not keep a list of valid tokens; it just checks the signature and expiry. That statelessness is the entire selling point, and also the source of most incidents.

## The two-token pattern

The common compromise is a short-lived access token and a longer-lived refresh token.

- Access tokens live for minutes, not days. They travel on every API request.
- Refresh tokens live for days or weeks and are only sent to one endpoint.
- Refresh tokens should rotate on use, so a stolen token is detectable the second time it is replayed.
- Store refresh tokens in `HttpOnly`, `Secure`, `SameSite` cookies when you have a browser client.

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=45),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}
```

> If you store long-lived tokens in `localStorage`, you have chosen convenience over XSS resilience. Sometimes that is the right call — just make it an explicit decision.

## Validation is a checklist

Always pin the algorithm. Reject `alg: none`. Verify `exp`, `iat` and issuer. Treat the `sub` claim as an identifier, then load the user from your database; do not trust roles embedded in a token that might outlive a permission change. And set a clock skew allowance of a few seconds, because machines disagree about time more often than anyone expects.

JWTs are a good tool. They are just not a magic one. Treat the signature as a boundary, the claims as untrusted input, and the refresh flow as the part that really needs your attention.
""",
    },
    {
        "author": "demo",
        "title": "React State Without the Ceremony",
        "category": "Frontend",
        "theme": "candy",
        "tags": ["react", "state", "hooks"],
        "excerpt": "Most apps do not need a state library. They need fewer places to put state, and a clearer idea of who owns it.",
        "status": "published",
        "views": 1688,
        "likes": ["mira", "kai"],
        "days_ago": 7,
        "content": """The first thing many React codebases add is a global store. The second thing they add is a second global store, because the first one got confusing. Somewhere around the third, a library appears to manage the other two.

## Start with ownership

Before choosing a tool, ask who owns each piece of state. Server data belongs to the server. Form drafts belong to the form. UI toggles belong to the nearest component that cares. Auth belongs to the app, because almost everything needs to read it.

Once you write that list down, the architecture mostly writes itself.

- **Server data**: fetch it, cache it, refetch on focus. A query cache earns its place here.
- **Form state**: local component state, with validation near the fields.
- **UI state**: local, unless two distant siblings truly need it.
- **Session state**: one context provider, exposed through a hook.

## Context is not a state manager

React context is a dependency injection mechanism. It moves a value down the tree without prop drilling. It does not optimise updates, batch changes for you, or decide what should re-render. A context with a fast-changing object will re-render every consumer, which is why contexts should hold small, stable slices.

```jsx
const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
```

Two patterns keep this clean. Split read and write contexts when updates are frequent. And keep the provider's value memoised, or every parent render will hand consumers a new object.

> State bugs are usually ownership bugs in disguise. Move the state closer to where it changes and most of them disappear.

## When you do need a library

Adopt a state library when you can name the specific problem it solves: undo history, offline sync, complex derived data, or server caching with invalidation. "It feels cleaner" is not a problem statement, and it is usually solved faster by deleting a layer than adding one.
""",
    },
    {
        "author": "kai",
        "title": "The Quiet Power of Django Signals",
        "category": "Engineering",
        "theme": "lime",
        "tags": ["django", "python", "architecture"],
        "excerpt": "Signals are beautiful for decoupling and dangerous for debugging. A practical rule for when to reach for them.",
        "status": "published",
        "views": 1340,
        "likes": ["demo", "juno"],
        "days_ago": 9,
        "content": """Django signals let one part of your code announce that something happened, without knowing who is listening. That is genuinely useful. It is also a great way to hide a side effect so thoroughly that you spend an afternoon wondering why creating a user sends two emails.

## The good use cases

Signals shine when the event is genuinely optional to the primary operation. Audit logs, cache invalidation, search index updates, analytics. If the listener fails, the user's request can still succeed. If you never register the listener, the app still works, just with fewer features.

They are also excellent at breaking circular imports between apps. The `blog` app can emit `post_published` without importing the `newsletter` app at all.

```python
from django.dispatch import Signal

post_published = Signal()  # providing_args were removed in Django 4.0
```

## The trap

The classic mistake is using `post_save` to fill in required fields of the same model.

```python
@receiver(post_save, sender=Post)
def set_slug(sender, instance, **kwargs):
    if not instance.slug:
        instance.slug = slugify(instance.title)
        instance.save()  # recursion, extra query, silent surprise
```

Now every save in your codebase may trigger another save, tests get slower, and `bulk_create` quietly skips the whole thing because raw saves do not fire signals. Debugging becomes archaeology.

- Do not mutate the sender inside a signal for that sender.
- Remember that `bulk_create`, `update` and `delete` querysets do not fire the usual signals.
- Wrap listener side effects in `transaction.on_commit` so they do not run for rolled-back work.
- Connect signals in `AppConfig.ready()` and nowhere else.

> If a side effect is required for correctness, call it explicitly. Signals are for broadcasting, not for invariants.

## A simple decision rule

Ask: if this listener were silently removed, would the data still be correct? If yes, a signal is a good fit. If no, write the function call and let the reader see it. Explicit beats magic every time a bug appears at 2am.
""",
    },
    {
        "author": "mira",
        "title": "Typography for Dark Interfaces",
        "category": "Design",
        "theme": "mono",
        "tags": ["typography", "dark-mode", "accessibility"],
        "excerpt": "Pure black is a lie. Light text on dark backgrounds needs different weight, different contrast and a lot more air.",
        "status": "published",
        "views": 2110,
        "likes": ["demo", "kai", "juno"],
        "days_ago": 12,
        "content": """Dark mode looks easy: invert the colours, ship it. Then the text feels cramped, the headings glow, and body copy becomes tiring after two paragraphs. The problem is that our typographic instincts were trained on white paper.

## Backlit type behaves differently

On a light background, dark glyphs absorb light. On a dark background, light glyphs emit it. Thin strokes glow outward, which makes type appear bolder than it is and increases apparent contrast. That is why the same font weight that feels calm in light mode feels loud in dark mode.

Two adjustments usually fix it. Drop one weight for headings, and slightly increase line height for body text. A 1.5 ratio in light mode often wants 1.65 in dark.

## Never use pure black or pure white

A background of `#0d0d12` with a slight blue cast feels like depth rather than a void. Text at `#e8e8f0` is softer than `#ffffff` while still clearing WCAG AA comfortably. Saturated accents should be desaturated for large areas and reserved for small highlights.

```css
:root {
  --bg: #0b0b12;
  --surface: #14141f;
  --text: #e9e9f2;
  --muted: #a0a0b8;
  --accent: #9d8cff;
}
```

> Contrast is a floor, not a target. The best dark interfaces use far less contrast than the ratio table requires.

## Space is contrast

Without shadows to separate layers, spacing becomes your primary tool for grouping. Increase gaps between sections, keep line length between 60 and 75 characters, and use borders at very low opacity to suggest edges without drawing them.

The test I use: read three paragraphs, then look away. If your eyes feel like they have been staring at a lamp, the text is too bright or too tight. Turn both dials down a notch and the whole interface sighs with relief.
""",
    },
    {
        "author": "demo",
        "title": "Shipping Your First Full-Stack App",
        "category": "Career",
        "theme": "aurora",
        "tags": ["career", "django", "react", "learning"],
        "excerpt": "A checklist that turns a tutorial project into something you can show, explain and actually maintain.",
        "status": "published",
        "views": 2890,
        "likes": ["mira", "kai", "juno"],
        "days_ago": 15,
        "content": """Every developer has a folder of half-finished projects. The gap between a tutorial and a portfolio piece is rarely technical skill. It is a handful of unglamorous decisions that make the thing real.

## Pick a small idea with one interesting constraint

A blog is a good first full-stack project because the domain is familiar and the constraints are visible: authentication, ownership, publishing, comments, search. Add one twist that forces a design decision. Here it was depth: a fully 3D interface that still has to be readable and fast.

Constraints make the project explainable. In an interview, "it is a blog" is dull. "It is a blog where the entire UI is built out of CSS 3D transforms, and here is how I kept it accessible" is a conversation.

## The stack is not the point

Django REST Framework gives you serializers, permissions and a browsable API. React gives you a component model that matches the interface. SQLite gives you real SQL with zero setup. None of those choices are impressive by themselves. How they fit together is.

- Authenticate with short-lived JWT access tokens and refresh them transparently.
- Model ownership in the database, then enforce it in the API and reflect it in the UI.
- Handle loading, empty and error states for every screen.
- Seed realistic data so a visitor sees a living product, not a blank grid.

## Finish the edges

The last ten percent is the difference. A favicon, a real 404 page, a disabled state on the submit button, a confirmation before deleting a post, a README that works from a clean machine. These are not extras; they are what users experience when something goes slightly wrong.

> Your project is not judged on the happy path alone. It is judged on how gracefully it handles the day your API is asleep.

Write the README before you think you are done. If the setup instructions do not work on a fresh machine, the project is not done. That rule alone will put you ahead of most portfolios.
""",
    },
    {
        "author": "juno",
        "title": "The Anatomy of a Perfect Loading State",
        "category": "Frontend",
        "theme": "ocean",
        "tags": ["ux", "performance", "react"],
        "excerpt": "Spinners are a confession that you know nothing. Skeletons are a promise. The best loading states do neither.",
        "status": "published",
        "views": 1522,
        "likes": ["demo", "mira"],
        "days_ago": 18,
        "content": """Loading states are the most neglected screens in most products. They are designed last, tested never, and then blamed when users complain that the app "feels slow". Yet perceived performance is often determined entirely by what happens during the wait.

## Match the shape of what is coming

A spinner communicates one thing: waiting. A skeleton communicates shape, size and position, which lets the eye start parsing the layout before the data arrives. For lists and content pages, a skeleton with the right number of rows and roughly correct proportions makes the transition feel instant.

The skeleton should be quiet. Low contrast, gentle animation, no bouncing. If the loading state is louder than the loaded content, you have built a distraction.

## Delay, then reveal

Show nothing for the first few hundred milliseconds. Many requests finish before a spinner would even appear, and flashing an indicator is worse than a brief pause. If the request takes longer, fade in the skeleton. When data arrives, cross-fade rather than snap.

- 0 to 300ms: show nothing, the page is already responsive.
- 300ms to 1s: show a skeleton with the page's real structure.
- Longer: add context, such as "Fetching 12 more stories".
- Failure: keep the layout, replace the skeleton with a retry action.

> Never replace the whole page with a spinner. Preserve the navigation, the header, the scroll position. Users are not confused by things that stay still.

## Optimistic updates are a loading state too

Liking a post should feel instantaneous. Update the interface first, send the request, and roll back with a small message if it fails. The best loading state is the one the user never sees, because the action already appeared to succeed.

The same logic applies to navigation: start fetching on hover, keep previous results visible while the next page loads. Speed is a feeling, and most of it is choreography rather than bandwidth.
""",
    },
    {
        "author": "kai",
        "title": "Why We Still Love Monoliths",
        "category": "Engineering",
        "theme": "ember",
        "tags": ["architecture", "django", "backend"],
        "excerpt": "One deploy, one database, one log stream. The boring architecture keeps winning because it optimises for change.",
        "status": "published",
        "views": 1755,
        "likes": ["demo", "juno"],
        "days_ago": 22,
        "content": """Microservices are a solution to an organisational problem disguised as a technical one. When you have hundreds of engineers, independent deploys are not a luxury, they are the only way to move. When you have five, the same architecture is a tax you pay in latency, tooling and late-night debugging.

## The monolith optimises for the right thing

Most products at an early stage need to change quickly. A monolith makes change cheap: one repository, one schema, one transaction, one place to add a field. You can refactor across the whole codebase in a single commit. You can join anything to anything. You can run the whole system on a laptop.

That last point is underrated. Local development with a single Django process and SQLite is minutes from clone to running. The equivalent in a distributed system is a compose file with nine services and a README that is already out of date.

## Modularity is a property of code, not deployment

You can get most of the benefits of services inside one process.

- Keep apps focused on a domain, with explicit public functions.
- Do not reach into another app's models; call its interface.
- Move slow work to background tasks with a queue.
- Keep transactions short and side effects on commit.
- Make each module testable without the rest of the system.

> Boundaries are cheap to draw and expensive to enforce over a network. Draw them in code first, and only pay the network cost when it buys you something.

## When to split

Split when a module needs a different scaling profile, a different deploy cadence, or a different team owning it end to end. Split when the pain of the monolith is measurable, not theoretical. And split one thing at a time, with a clear metric that tells you whether the split worked.

Until then, the monolith is not a compromise. It is the highest-leverage architecture available, and it will keep being that until your team, not your traffic, says otherwise.
""",
    },
    {
        "author": "demo",
        "title": "Notes on Building Nebula (Draft)",
        "category": "Engineering",
        "theme": "candy",
        "tags": ["meta", "react", "django"],
        "excerpt": "An unfinished postmortem of this very blog: what worked, what broke, and what I would do differently.",
        "status": "draft",
        "views": 3,
        "likes": [],
        "days_ago": 0,
        "content": """This is a draft post, visible only to its author. It exists so you can see the private side of the app: drafts are excluded from the public feed, hidden from other users, but fully editable and previewable by you.

## What I would write here

- The first version used a single giant component. Splitting the 3D scene out made the rest of the app readable.
- CSS 3D transforms turned out to be enough; no WebGL needed.
- The API needed pagination earlier than expected.

Finish this later.
""",
    },
]

COMMENTS = [
    {
        "post_slug": "designing-interfaces-that-live-in-three-dimensions",
        "author": "demo",
        "body": "The point about translateZ mattering more than rotation is so true. Most tilt effects skip it and feel like stickers instead of surfaces.",
        "days_ago": 1,
        "replies": [
            {
                "author": "mira",
                "body": "Exactly. Lift first, rotate second. If the shadow does not grow, the brain stops believing it.",
            },
            {
                "author": "juno",
                "body": "Also worth testing with a trackpad and a touchscreen. Hover-tilt simply does not exist on mobile, so the design has to stand on its own without it.",
            },
        ],
    },
    {
        "post_slug": "designing-interfaces-that-live-in-three-dimensions",
        "author": "kai",
        "body": "Saving the reduced-motion note. We shipped a parallax hero last quarter and had to retrofit that path after an accessibility review.",
    },
    {
        "post_slug": "sqlite-in-production-when-it-actually-works",
        "author": "juno",
        "body": "The network filesystem caveat deserves a whole post. Most incidents I have seen came from running SQLite on a mounted volume.",
    },
    {
        "post_slug": "sqlite-in-production-when-it-actually-works",
        "author": "demo",
        "body": "Would love that. Also curious how you handle backups with WAL mode enabled.",
        "replies": [
            {
                "author": "kai",
                "body": "For this blog: `sqlite3 db.sqlite3 \".backup backup.sqlite3\"` on a schedule. It is consistent with WAL and takes about a millisecond at this size.",
            }
        ],
    },
    {
        "post_slug": "a-field-guide-to-jwt-authentication",
        "author": "kai",
        "body": "The point about roles embedded in tokens outliving a permission change is underrated. We now load permissions from the database on every request and keep tokens purely for identity.",
    },
    {
        "post_slug": "a-field-guide-to-jwt-authentication",
        "author": "mira",
        "body": "Great checklist. The clock skew allowance saved me once when a container started with a slow NTP sync.",
    },
    {
        "post_slug": "react-state-without-the-ceremony",
        "author": "mira",
        "body": "Splitting read and write contexts made a bigger difference in our dashboard than switching libraries did.",
    },
    {
        "post_slug": "the-quiet-power-of-django-signals",
        "author": "demo",
        "body": "The decision rule at the end is the whole post in one line. If removing the listener breaks correctness, make the call explicit.",
    },
    {
        "post_slug": "typography-for-dark-interfaces",
        "author": "juno",
        "body": "Reading three paragraphs and looking away is a surprisingly good test. My current project fails it badly.",
    },
    {
        "post_slug": "shipping-your-first-full-stack-app",
        "author": "mira",
        "body": "The README point cannot be repeated enough. I have closed so many portfolio tabs after a five-minute setup attempt.",
    },
    {
        "post_slug": "the-anatomy-of-a-perfect-loading-state",
        "author": "kai",
        "body": "Cross-fading instead of snapping is such a small change for how much smoother the whole app feels.",
    },
    {
        "post_slug": "why-we-still-love-monoliths",
        "author": "juno",
        "body": "Draw boundaries in code first, pay the network cost later. Printing this above my desk.",
    },
]


class Command(BaseCommand):
    help = "Seed Nebula Blog with demo users, categories, posts, comments and likes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Delete existing demo content before seeding.",
        )

    def handle(self, *args, **options):
        if options["fresh"]:
            Comment.objects.all().delete()
            Like.objects.all().delete()
            Post.objects.all().delete()
            Category.objects.all().delete()
            User.objects.exclude(is_superuser=True).delete()
            self.stdout.write("Cleared existing demo content.")

        if Post.objects.exists() and not options["fresh"]:
            self.stdout.write(
                self.style.WARNING("Posts already exist. Use --fresh to reseed from scratch.")
            )
            return

        users = {}
        for data in USERS:
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data["email"],
                    "headline": data["headline"],
                    "bio": data["bio"],
                    "avatar_color": data["avatar_color"],
                },
            )
            if created:
                user.set_password(data["password"])
                user.save()
            users[user.username] = user

        categories = {}
        for name, description, accent in CATEGORIES:
            category, _ = Category.objects.get_or_create(
                name=name, defaults={"description": description, "accent": accent}
            )
            categories[name] = category

        posts = {}
        now = timezone.now()
        for data in POSTS:
            post = Post.objects.create(
                author=users[data["author"]],
                title=data["title"],
                content=data["content"].strip(),
                excerpt=data["excerpt"],
                category=categories[data["category"]],
                tags=",".join(data["tags"]),
                theme=data["theme"],
                status=data["status"],
                views=data["views"],
                publishedAt=now - timedelta(days=data["days_ago"], hours=2),
            )
            posts[post.slug] = post
            for username in data["likes"]:
                Like.objects.get_or_create(post=post, user=users[username])

        for data in COMMENTS:
            post = posts[data["post_slug"]]
            root = Comment.objects.create(
                post=post,
                author=users[data["author"]],
                body=data["body"],
                createdAt=now - timedelta(days=data.get("days_ago", 2), hours=1),
            )
            for reply in data.get("replies", []):
                Comment.objects.create(
                    post=post,
                    author=users[reply["author"]],
                    body=reply["body"],
                    parent=root,
                    createdAt=root.createdAt + timedelta(hours=3),
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {User.objects.count()} users, {len(posts)} posts and "
                f"{Comment.objects.count()} comments."
            )
        )
        self.stdout.write("Demo login: demo / demo1234")
