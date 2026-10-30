import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { Avatar } from "../components/Avatar";
import { CommentSection } from "../components/CommentSection";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icons";
import { Markdown } from "../components/Markdown";
import { PostCard } from "../components/PostCard";
import { Skeleton } from "../components/Skeletons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatNumber } from "../lib/format";
import { useToast } from "../lib/useToast";

function DetailSkeleton() {
  return (
    <div className="detail">
      <div className="detail__head">
        <div className="detail__headText">
          <Skeleton className="skeleton--line skeleton--w30" />
          <Skeleton className="skeleton--title" />
          <Skeleton className="skeleton--line skeleton--w80" />
          <Skeleton className="skeleton--line skeleton--w60" />
        </div>
        <Skeleton className="skeleton--hero-cover" />
      </div>
      <div className="detail__layout">
        <div className="detail__body">
          <Skeleton className="skeleton--line" />
          <Skeleton className="skeleton--line" />
          <Skeleton className="skeleton--line skeleton--w80" />
          <Skeleton className="skeleton--line skeleton--w90" />
        </div>
      </div>
    </div>
  );
}

export function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [related, setRelated] = useState([]);
  const [progress, setProgress] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const articleRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api(`/posts/${slug}/`)
      .then((data) => {
        if (!active) return;
        setPost(data);
        setLiked(data.is_liked);
        setLikes(data.likes_count);
        document.title = `${data.title} — Nebula`;
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        document.title = "Story not found — Nebula";
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      document.title = "Nebula — Read deeper. Build stranger.";
    };
  }, [slug, retryKey]);

  useEffect(() => {
    let active = true;
    api(`/posts/${slug}/related/`, { auth: false })
      .then((data) => {
        if (active) setRelated(data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (doc.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLike = async () => {
    if (!user) {
      toast.push("Sign in to like stories.", "info");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    try {
      const data = await api(`/posts/${slug}/like/`, { method: "POST" });
      setLiked(data.liked);
      setLikes(data.likes_count);
    } catch (err) {
      setLiked(!nextLiked);
      setLikes((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      toast.push(err.message, "error");
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.push("Link copied to clipboard.", "success");
    } catch {
      toast.push("Copy the URL from your address bar.", "info");
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/posts/${slug}/`, { method: "DELETE" });
      toast.push("Story deleted.", "info");
      navigate("/");
    } catch (err) {
      toast.push(err.message, "error");
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error) {
    return (
      <section className="not-found not-found--compact">
        <div className="not-found__scene" aria-hidden="true">
          <span className="not-found__code">{error.status === 404 ? "404" : "!"}</span>
          <span className="not-found__ring" />
        </div>
        <span className="eyebrow">{error.status === 404 ? "Story not found" : "The archive is unreachable"}</span>
        <h1>{error.status === 404 ? "This story drifted out of orbit." : "We couldn't load this story."}</h1>
        <p>{error.status === 404 ? "It may have been unpublished, or the link is a little off." : error.message}</p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">
            Back to the journal
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => setRetryKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!post) return null;

  const isOwner = post.is_owner;

  return (
    <>
      <div className="reading-progress" style={{ "--progress": `${progress}%` }} aria-hidden="true" />
      <article className="detail" ref={articleRef}>
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Stories</Link>
          <span aria-hidden="true">/</span>
          {post.category ? (
            <Link to={`/?category=${post.category.slug}`}>{post.category.name}</Link>
          ) : (
            <span>Uncategorised</span>
          )}
          <span aria-hidden="true">/</span>
          <span className="crumbs__current">{post.status === "draft" ? "Draft" : "Story"}</span>
        </nav>

        {post.status === "draft" && (
          <div className="draft-banner">
            <span className="badge badge--draft">Draft</span>
            <p>Only you can see this story. Publish it when it feels ready.</p>
            <Link to={`/edit/${post.slug}`} className="btn btn--ghost btn--sm">
              <Icon name="edit" size={15} /> Continue editing
            </Link>
          </div>
        )}

        <header className="detail__head">
          <div className="detail__headText">
            <span className="eyebrow">
              {post.category?.name || "Story"} <span className="meta-dot" /> {post.reading_time} min read
            </span>
            <h1>{post.title}</h1>
            {post.excerpt && <p className="detail__dek">{post.excerpt}</p>}

            <div className="detail__byline">
              <Avatar user={post.author} size={44} />
              <div className="detail__author">
                <Link to={`/profile/${post.author.username}`}>{post.author.username}</Link>
                <span>{post.author.headline || "Writer at Nebula"}</span>
              </div>
              <div className="detail__meta">
                <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                <span className="meta-dot" />
                <span>
                  <Icon name="eye" size={14} /> {formatNumber(post.views)}
                </span>
              </div>
            </div>

            {isOwner && (
              <div className="detail__owner-actions">
                <Link to={`/edit/${post.slug}`} className="btn btn--ghost btn--sm">
                  <Icon name="edit" size={15} /> Edit story
                </Link>
                <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setConfirmOpen(true)}>
                  <Icon name="trash" size={15} /> Delete
                </button>
              </div>
            )}
          </div>

          <div className="detail__coverWrap">
            <div className="detail__coverGlow" aria-hidden="true" />
            <CoverArt
              theme={post.theme}
              category={post.category}
              className="cover--detail"
              glyph={post.title.charAt(0)}
            />
            <div className="detail__coverCaption">
              <span>Nebula · Issue 07</span>
              <span>{post.category?.name || "Journal"}</span>
            </div>
          </div>
        </header>

        <div className="detail__layout">
          <aside className="detail__rail">
            <button
              type="button"
              className={`rail-btn ${liked ? "is-active" : ""}`}
              onClick={toggleLike}
              aria-pressed={liked}
              aria-label={liked ? "Unlike story" : "Like story"}
            >
              <Icon name="heart" size={19} />
              <span>{formatNumber(likes)}</span>
            </button>
            <button type="button" className="rail-btn" onClick={share} aria-label="Copy link">
              <Icon name="share" size={19} />
              <span>Share</span>
            </button>
            <a href="#comments-title" className="rail-btn" aria-label="Jump to comments">
              <Icon name="comment" size={19} />
              <span>{formatNumber(post.comments_count)}</span>
            </a>
          </aside>

          <div className="detail__body">
            <Markdown text={post.content} />

            {post.tags?.length > 0 && (
              <div className="detail__tags">
                {post.tags.map((tag) => (
                  <Link key={tag} to={`/?q=${encodeURIComponent(tag)}`} className="tag">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <aside className="author-card">
              <Avatar user={post.author} size={58} />
              <div className="author-card__text">
                <span className="eyebrow">Written by</span>
                <h2>{post.author.username}</h2>
                <p>{post.author.headline || "Writer at Nebula"}</p>
              </div>
              <Link to={`/profile/${post.author.username}`} className="btn btn--ghost btn--sm">
                View profile <Icon name="arrow" size={15} />
              </Link>
            </aside>

            <CommentSection slug={post.slug} initialCount={post.comments_count} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="related">
            <div className="section-head">
              <div>
                <span className="eyebrow">Keep orbiting</span>
                <h2 className="section-title">Related stories</h2>
              </div>
            </div>
            <div className="post-grid post-grid--related">
              {related.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        )}
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this story?"
        message={`“${post.title}” and its comments will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete story"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
