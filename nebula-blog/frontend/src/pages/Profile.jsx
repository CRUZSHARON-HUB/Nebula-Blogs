import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icons";
import { PostCard } from "../components/PostCard";
import { EmptyState, PageLoader, PostGridSkeleton } from "../components/Skeletons";
import { api, toQuery } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatNumber } from "../lib/format";
import { useToast } from "../lib/useToast";

const COLORS = ["#7c5cff", "#22d3ee", "#f472b6", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];

export function Profile() {
  const { username } = useParams();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const isMe = Boolean(user && user.username.toLowerCase() === username.toLowerCase());
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [tab, setTab] = useState("published");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ headline: "", bio: "", avatar_color: "#7c5cff", avatar_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    api(`/profiles/${username}/`, { auth: false })
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setDraft({
          headline: data.headline || "",
          bio: data.bio || "",
          avatar_color: data.avatar_color || "#7c5cff",
          avatar_url: data.avatar_url || "",
        });
        document.title = `${data.username} — Nebula`;
      })
      .catch((err) => {
        if (active) setProfileError(err);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
      document.title = "Nebula — Read deeper. Build stranger.";
    };
  }, [username]);

  useEffect(() => {
    let active = true;
    setPostsLoading(true);
    const status = isMe ? tab : "published";
    api(`/posts/${toQuery({ author: username, status, page_size: 12, sort: "newest" })}`)
      .then((data) => {
        if (active) setPosts(data.results || []);
      })
      .catch(() => {
        if (active) setPosts([]);
      })
      .finally(() => {
        if (active) setPostsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [username, tab, isMe]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({
        headline: draft.headline.trim(),
        bio: draft.bio.trim(),
        avatar_color: draft.avatar_color,
        avatar_url: draft.avatar_url.trim(),
      });
      setProfile((current) => ({ ...current, ...updated }));
      toast.push("Profile updated.", "success");
      setEditing(false);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) return <PageLoader label="Finding this writer" />;

  if (profileError) {
    return (
      <section className="not-found not-found--compact">
        <div className="not-found__scene" aria-hidden="true">
          <span className="not-found__code">404</span>
        </div>
        <span className="eyebrow">Writer not found</span>
        <h1>@{username} hasn&apos;t joined this universe.</h1>
        <p>The profile you&apos;re looking for does not exist — yet.</p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">
            Back to the journal
          </Link>
        </div>
      </section>
    );
  }

  const stats = profile.stats || {};

  return (
    <section className="profile">
      <header className="profile__head">
        <div className="profile__halo" aria-hidden="true" />
        <div className="profile__identity">
          <Avatar user={{ ...profile, username: profile.username }} size={96} className="avatar--xl" />
          <div>
            <span className="eyebrow">@{profile.username}</span>
            <h1>{profile.username}</h1>
            <p className="profile__headline">{profile.headline || "Writer at Nebula"}</p>
            <p className="profile__bio">
              {profile.bio ||
                "No bio yet. Just a person with opinions about whitespace and a stack of drafts."}
            </p>
            <div className="profile__actions">
              {isMe ? (
                <>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing((open) => !open)}>
                    <Icon name="edit" size={15} /> {editing ? "Close editor" : "Edit profile"}
                  </button>
                  <Link to="/write" className="btn btn--primary btn--sm">
                    <Icon name="plus" size={15} /> New story
                  </Link>
                </>
              ) : (
                <span className="profile__joined">Joined {new Date(profile.date_joined).getFullYear()}</span>
              )}
            </div>
          </div>
        </div>

        <dl className="profile__stats">
          <div>
            <dt>Stories</dt>
            <dd>{formatNumber(stats.posts)}</dd>
          </div>
          {isMe && (
            <div>
              <dt>Drafts</dt>
              <dd>{formatNumber(stats.drafts)}</dd>
            </div>
          )}
          <div>
            <dt>Likes</dt>
            <dd>{formatNumber(stats.likes)}</dd>
          </div>
          <div>
            <dt>Views</dt>
            <dd>{formatNumber(stats.views)}</dd>
          </div>
        </dl>
      </header>

      {isMe && editing && (
        <form className="profile-edit" onSubmit={saveProfile}>
          <div className="profile-edit__head">
            <h2>Edit your profile</h2>
            <button type="button" className="icon-btn" onClick={() => setEditing(false)} aria-label="Close">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Headline</span>
              <input
                type="text"
                value={draft.headline}
                maxLength={120}
                onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))}
                placeholder="Design systems & 3D interfaces"
              />
            </label>
            <label className="field">
              <span>Avatar image URL (optional)</span>
              <input
                type="url"
                value={draft.avatar_url}
                onChange={(event) => setDraft((current) => ({ ...current, avatar_url: event.target.value }))}
                placeholder="https://…"
              />
            </label>
          </div>
          <label className="field">
            <span>Bio</span>
            <textarea
              rows={3}
              value={draft.bio}
              maxLength={600}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              placeholder="A few lines about what you build and why."
            />
          </label>
          <fieldset className="color-picker">
            <legend>Avatar colour</legend>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-dot ${draft.avatar_color === color ? "is-active" : ""}`}
                style={{ "--dot": color }}
                onClick={() => setDraft((current) => ({ ...current, avatar_color: color }))}
                aria-label={`Use colour ${color}`}
                aria-pressed={draft.avatar_color === color}
              />
            ))}
          </fieldset>
          <div className="profile-edit__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      )}

      <div className="profile__tabs">
        <div className="tabs" role="tablist" aria-label="Profile stories">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "published"}
            className={tab === "published" ? "is-active" : ""}
            onClick={() => setTab("published")}
          >
            Published <span>{stats.posts ?? 0}</span>
          </button>
          {isMe && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "draft"}
              className={tab === "draft" ? "is-active" : ""}
              onClick={() => setTab("draft")}
            >
              Drafts <span>{stats.drafts ?? 0}</span>
            </button>
          )}
        </div>
        {isMe && tab === "published" && (
          <Link to="/write" className="btn btn--ghost btn--sm profile__write">
            <Icon name="plus" size={15} /> New story
          </Link>
        )}
      </div>

      {postsLoading ? (
        <PostGridSkeleton count={3} />
      ) : posts.length === 0 ? (
        <EmptyState
          title={tab === "draft" ? "No drafts gathering dust" : "No stories yet"}
          message={
            tab === "draft"
              ? "Drafts you save will live here, visible only to you."
              : isMe
              ? "Your first story is a blank page with good lighting. Start it now."
              : `@${profile.username} hasn't published anything yet. Check back soon.`
          }
          action={
            isMe ? (
              <Link to="/write" className="btn btn--primary btn--sm">
                Write a story
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="post-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
