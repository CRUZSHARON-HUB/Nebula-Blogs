import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Avatar } from "../components/Avatar";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icons";
import { PostCard } from "../components/PostCard";
import { EmptyState, PostGridSkeleton, Skeleton } from "../components/Skeletons";
import { api, toQuery } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatNumber } from "../lib/format";

const PAGE_SIZE = 9;

function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const output = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) output.push("gap");
    output.push(page);
    previous = page;
  }
  return output;
}

function HeroDeck({ posts }) {
  const ref = useRef(null);

  const onPointerMove = (event) => {
    const el = ref.current;
    if (!el || event.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--dx", ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    el.style.setProperty("--dy", ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--dx", "0");
    el.style.setProperty("--dy", "0");
  };

  return (
    <div className="hero-deck" ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} aria-label="Latest stories">
      <div className="hero-deck__ring hero-deck__ring--a" aria-hidden="true" />
      <div className="hero-deck__ring hero-deck__ring--b" aria-hidden="true" />
      <div className="hero-deck__scene">
        {posts.length === 0 ? (
          [0, 1, 2].map((index) => (
            <div className={`deck-card deck-card--${index} deck-card--loading`} key={index}>
              <Skeleton className="skeleton--cover" />
              <div className="deck-card__body">
                <Skeleton className="skeleton--line skeleton--w40" />
                <Skeleton className="skeleton--line skeleton--w90" />
              </div>
            </div>
          ))
        ) : (
          posts.slice(0, 3).map((post, index) => (
            <Link
              key={post.slug}
              to={`/post/${post.slug}`}
              className={`deck-card deck-card--${index}`}
              style={{ "--delay": `${index * 90}ms` }}
            >
              <div className="deck-card__cover">
                <CoverArt theme={post.theme} category={post.category} compact />
              </div>
              <div className="deck-card__body">
                <span className="deck-card__cat">{post.category?.name || "Story"}</span>
                <h3>{post.title}</h3>
                <div className="deck-card__meta">
                  <Avatar user={post.author} size={22} />
                  <span>{post.author.username}</span>
                  <span className="meta-dot" />
                  <span>{post.reading_time} min</span>
                </div>
              </div>
              <span className="deck-card__shine" aria-hidden="true" />
            </Link>
          ))
        )}
      </div>
      <div className="hero-deck__caption">
        <span className="pulse-dot" />
        Fresh from the journal
      </div>
    </div>
  );
}

export function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [heroPosts, setHeroPosts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const storiesRef = useRef(null);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() === q) return;
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) next.set("q", searchInput.trim());
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 420);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api(`/posts/${toQuery({ q, category, sort, page, page_size: PAGE_SIZE })}`, { auth: true })
      .then((data) => {
        if (!active) return;
        setPosts(data.results || []);
        setTotal(data.count || 0);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setPosts([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, category, sort, page, refreshKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api("/categories/", { auth: false }),
      api("/stats/", { auth: false }),
      api("/posts/?page_size=3&sort=newest", { auth: false }),
    ])
      .then(([categoryData, statsData, heroData]) => {
        if (!active) return;
        setCategories(categoryData || []);
        setStats(statsData);
        setHeroPosts(heroData.results || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const updateParams = (patch, scroll = false) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next);
    if (scroll) {
      storiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
  const featuredFirst = page === 1 && !q && !category;

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">
            <span className="pulse-dot" />
            A full-stack journal · React · Django · SQL
          </span>
          <h1 className="hero__title">
            Read deeper.
            <br />
            <span className="grad-text">Build stranger.</span>
          </h1>
          <p className="hero__sub">
            Nebula is a journal about the space between design and engineering — 3D interfaces,
            Django internals, authentication and the quiet craft of shipping things that last.
          </p>
          <div className="hero__actions">
            <a href="#stories" className="btn btn--primary btn--lg">
              Explore stories <Icon name="arrow" size={18} />
            </a>
            <Link to={user ? "/write" : "/register"} className="btn btn--ghost btn--lg">
              {user ? "Write a story" : "Join the journal"}
            </Link>
          </div>
          <dl className="hero__stats">
            {[
              { label: "Stories", value: stats?.posts },
              { label: "Writers", value: stats?.authors },
              { label: "Comments", value: stats?.comments },
              { label: "Likes", value: stats?.likes },
            ].map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value === undefined ? "—" : formatNumber(item.value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroDeck posts={heroPosts} />
      </section>

      <section className="stories" id="stories" ref={storiesRef}>
        <div className="section-head">
          <div>
            <span className="eyebrow">The archive</span>
            <h2 className="section-title">Latest transmissions</h2>
          </div>
          <form
            className="search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ q: searchInput.trim(), page: null }, true);
            }}
          >
            <Icon name="search" size={18} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search stories, tags, authors…"
              aria-label="Search stories"
            />
            {searchInput && (
              <button
                type="button"
                className="search__clear"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput("");
                  updateParams({ q: null, page: null });
                }}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </form>
        </div>

        <div className="filter-bar">
          <div className="chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`chip ${!category ? "is-active" : ""}`}
              onClick={() => updateParams({ category: null, page: null })}
            >
              All stories
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item.slug}
                className={`chip ${category === item.slug ? "is-active" : ""}`}
                onClick={() => updateParams({ category: item.slug, page: null })}
              >
                {item.name}
                <span className="chip__count">{item.post_count}</span>
              </button>
            ))}
          </div>
          <label className="select">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value, page: null })}
            >
              <option value="newest">Newest first</option>
              <option value="popular">Most read</option>
              <option value="discussed">Most discussed</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

        {(q || category) && !loading && !error && (
          <p className="results-line">
            {total} {total === 1 ? "story" : "stories"}
            {q && <> matching “{q}”</>}
            {category && <> in {categories.find((item) => item.slug === category)?.name || category}</>}
          </p>
        )}

        {error ? (
          <div className="error-panel">
            <span className="error-panel__glyph">!</span>
            <h3>Couldn&apos;t reach the archive</h3>
            <p>{error}</p>
            <div className="error-panel__actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setRefreshKey((key) => key + 1)}>
                Try again
              </button>
              <a href="http://127.0.0.1:8000/api/posts/" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                Check API
              </a>
            </div>
          </div>
        ) : loading ? (
          <PostGridSkeleton count={PAGE_SIZE} />
        ) : posts.length === 0 ? (
          <EmptyState
            title="Nothing in this orbit"
            message="No stories match those filters yet. Try clearing your search or exploring another category."
            action={
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams(new URLSearchParams());
                }}
              >
                Reset filters
              </button>
            }
          />
        ) : (
          <div className="post-grid">
            {posts.map((post, index) => (
              <PostCard key={post.id} post={post} featured={featuredFirst && index === 0} />
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav className="pagination" aria-label="Story pages">
            <button
              type="button"
              className="pagination__arrow"
              disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 }, true)}
              aria-label="Previous page"
            >
              <Icon name="arrowLeft" size={16} />
            </button>
            {pages.map((value, index) =>
              value === "gap" ? (
                <span className="pagination__gap" key={`gap-${index}`}>
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={value}
                  className={`pagination__page ${value === page ? "is-active" : ""}`}
                  aria-current={value === page ? "page" : undefined}
                  onClick={() => updateParams({ page: value }, true)}
                >
                  {value}
                </button>
              )
            )}
            <button
              type="button"
              className="pagination__arrow"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: page + 1 }, true)}
              aria-label="Next page"
            >
              <Icon name="arrow" size={16} />
            </button>
          </nav>
        )}
      </section>

      <section className="cta-band">
        <div className="cta-band__inner">
          <div>
            <span className="eyebrow">Open call</span>
            <h2>Your story belongs somewhere with depth.</h2>
            <p>Publish in a journal built on React, Django REST and a healthy respect for SQL.</p>
          </div>
          <div className="cta-band__actions">
            <Link to={user ? "/write" : "/register"} className="btn btn--primary btn--lg">
              {user ? "Open the editor" : "Start writing"} <Icon name="bolt" size={18} />
            </Link>
            {!user && (
              <Link to="/login" className="btn btn--ghost btn--lg">
                Try the demo account
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
