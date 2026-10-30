import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Avatar } from "../components/Avatar";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icons";
import { Markdown } from "../components/Markdown";
import { PageLoader } from "../components/Skeletons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { readingTime, THEMES } from "../lib/format";
import { useToast } from "../lib/useToast";

const EMPTY_FORM = {
  title: "",
  excerpt: "",
  content: "",
  category_id: "",
  tags: "",
  theme: "aurora",
  status: "draft",
};

export function Editor() {
  const { slug } = useParams();
  const editing = Boolean(slug);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("write");
  const dirtyRef = useRef(false);

  useEffect(() => {
    let active = true;
    api("/categories/", { auth: false })
      .then((data) => {
        if (active) setCategories(data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editing) {
      setForm(EMPTY_FORM);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    api(`/posts/${slug}/`)
      .then((post) => {
        if (!active) return;
        if (!post.is_owner) {
          setLoadError({ status: 403, message: "This story belongs to another writer." });
          return;
        }
        setForm({
          title: post.title,
          excerpt: post.excerpt || "",
          content: post.content || "",
          category_id: post.category?.id ? String(post.category.id) : "",
          tags: (post.tags || []).join(", "),
          theme: post.theme,
          status: post.status,
        });
        dirtyRef.current = false;
      })
      .catch((err) => {
        if (active) setLoadError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editing, slug]);

  useEffect(() => {
    const handler = (event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const setField = (key) => (event) => {
    const value = event.target.value;
    dirtyRef.current = true;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, non_field_errors: undefined }));
  };

  const words = useMemo(
    () => form.content.trim().split(/\s+/).filter(Boolean).length,
    [form.content]
  );
  const minutes = readingTime(form.content);
  const selectedCategory = categories.find((item) => String(item.id) === form.category_id);
  const previewTheme = form.theme;

  const save = async (statusOverride) => {
    const status = statusOverride || form.status;
    const nextErrors = {};
    if (form.title.trim().length < 4) nextErrors.title = "At least 4 characters for the title.";
    if (form.content.trim().length < 20) nextErrors.content = "At least 20 characters of content.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setMode("write");
      toast.push("A couple of fields need attention.", "error");
      return;
    }

    setSaving(true);
    setErrors({});
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      category_id: form.category_id ? Number(form.category_id) : null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      theme: form.theme,
      status,
    };

    try {
      const post = editing
        ? await api(`/posts/${slug}/`, { method: "PATCH", body: payload })
        : await api("/posts/", { method: "POST", body: payload });
      dirtyRef.current = false;
      setForm((current) => ({ ...current, status: post.status }));
      if (post.status === "published") {
        toast.push(editing ? "Story updated." : "Story published. Beautiful.", "success");
        navigate(`/post/${post.slug}`);
      } else if (!editing) {
        toast.push("Draft saved. Only you can see it.", "success");
        navigate(`/edit/${post.slug}`, { replace: true });
      } else {
        toast.push("Draft saved.", "success");
      }
    } catch (err) {
      const data = err.data && typeof err.data === "object" ? err.data : {};
      const mapped = {};
      Object.entries(data).forEach(([key, value]) => {
        mapped[key] = Array.isArray(value) ? value[0] : value;
      });
      setErrors(mapped);
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Opening your draft" />;

  if (loadError) {
    return (
      <section className="not-found not-found--compact">
        <div className="not-found__scene" aria-hidden="true">
          <span className="not-found__code">401</span>
        </div>
        <span className="eyebrow">Not your story</span>
        <h1>{loadError.message || "We couldn't open this story."}</h1>
        <p>You can only edit stories that you wrote.</p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">
            Back to the journal
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="editor">
      <div className="editor__topbar">
        <Link to={editing ? `/post/${slug}` : "/"} className="back-link">
          <Icon name="arrowLeft" size={16} /> {editing ? "Back to story" : "Back to stories"}
        </Link>
        <div className="editor__status">
          <span className={`status-pill ${form.status === "published" ? "is-live" : ""}`}>
            <span className="status-pill__dot" />
            {form.status === "published" ? "Published" : "Private draft"}
          </span>
          {editing && <span className="editor__slug">/post/{slug}</span>}
        </div>
      </div>

      <div className="editor__grid">
        <form
          className="editor__form"
          onSubmit={(event) => {
            event.preventDefault();
            save("published");
          }}
        >
          <div className="editor__masthead">
            <span className="eyebrow">{editing ? "Edit story" : "New story"}</span>
            <h1>{editing ? "Shape your story." : "Start something worth reading."}</h1>
            <p>Write in plain text with light markdown. The preview updates as you type.</p>
          </div>

          {errors.non_field_errors && (
            <p className="form-error" role="alert">
              <Icon name="bolt" size={15} /> {errors.non_field_errors}
            </p>
          )}

          <label className="field field--title">
            <span className="field__label">
              Title <em>{form.title.length}/180</em>
            </span>
            <input
              type="text"
              value={form.title}
              onChange={setField("title")}
              placeholder="A title with a little gravity"
              maxLength={180}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <small className="field__error">{errors.title}</small>}
          </label>

          <label className="field">
            <span className="field__label">
              Dek <em>optional · {form.excerpt.length}/260</em>
            </span>
            <textarea
              value={form.excerpt}
              onChange={setField("excerpt")}
              placeholder="One or two lines that make a stranger curious."
              rows={2}
              maxLength={260}
            />
            <small className="field__hint">Leave blank and we&apos;ll cut a dek from your first lines.</small>
          </label>

          <div className="editor__toolbar">
            <div className="segmented" role="group" aria-label="Editor mode">
              <button
                type="button"
                className={mode === "write" ? "is-active" : ""}
                onClick={() => setMode("write")}
              >
                Write
              </button>
              <button
                type="button"
                className={mode === "preview" ? "is-active" : ""}
                onClick={() => setMode("preview")}
              >
                Preview
              </button>
            </div>
            <span className="editor__hint">## heading · &gt; quote · ``` code · - list</span>
            <span className="editor__words">
              {words} words · {minutes} min
            </span>
          </div>

          {mode === "write" ? (
            <label className="field field--content">
              <span className="visually-hidden">Story content</span>
              <textarea
                className="editor__content"
                value={form.content}
                onChange={setField("content")}
                placeholder={"Start with a scene, a problem or a confession.\n\n## Use headings to give the reader air\n\n> Pull out the line you want remembered."}
                aria-invalid={Boolean(errors.content)}
              />
              {errors.content && <small className="field__error">{errors.content}</small>}
            </label>
          ) : (
            <div className="editor__inline-preview">
              {form.content.trim() ? (
                <Markdown text={form.content} />
              ) : (
                <p className="editor__preview-empty">Your prose will appear here.</p>
              )}
            </div>
          )}

          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select value={form.category_id} onChange={setField("category_id")}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tags</span>
              <input
                type="text"
                value={form.tags}
                onChange={setField("tags")}
                placeholder="react, css, 3d"
                maxLength={200}
              />
              <small className="field__hint">Comma separated, up to 6.</small>
            </label>
          </div>

          <fieldset className="theme-picker">
            <legend>Cover theme</legend>
            <div className="theme-picker__options">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-swatch cover--${theme.id} ${form.theme === theme.id ? "is-active" : ""}`}
                  onClick={() => {
                    dirtyRef.current = true;
                    setForm((current) => ({ ...current, theme: theme.id }));
                  }}
                  aria-pressed={form.theme === theme.id}
                >
                  <span className="theme-swatch__disc" />
                  <span>{theme.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="editor__actions">
            <div className="editor__actions-secondary">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => save("draft")}
                disabled={saving}
              >
                {form.status === "published" ? "Move to drafts" : "Save draft"}
              </button>
            </div>
            <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
              {saving ? (
                "Saving…"
              ) : form.status === "published" ? (
                <>Update story <Icon name="check" size={17} /></>
              ) : (
                <>Publish story <Icon name="bolt" size={17} /></>
              )}
            </button>
          </div>
        </form>

        <aside className="editor__side">
          <div className="editor__preview">
            <div className="editor__preview-head">
              <span className="eyebrow">Live preview</span>
              <span className="editor__preview-hint">as readers will see it</span>
            </div>
            <div className="preview-card">
              <CoverArt theme={previewTheme} category={selectedCategory} />
              <div className="preview-card__body">
                <span className="preview-card__meta">
                  {selectedCategory?.name || "Uncategorised"} <span className="meta-dot" /> {minutes} min read
                </span>
                <h3>{form.title || "Your title appears here"}</h3>
                <p>{form.excerpt || "A short dek to pull readers in. Leave it blank and we'll make one for you."}</p>
                <div className="preview-card__byline">
                  <Avatar user={user} size={24} />
                  <span>{user.username}</span>
                  <span className="meta-dot" />
                  <span>Just now</span>
                </div>
              </div>
            </div>

            <div className="editor__tips">
              <span className="eyebrow">
                <Icon name="spark" size={14} /> Three small things
              </span>
              <ol>
                <li>Open with a line you would say out loud.</li>
                <li>Give every section a heading — depth needs floors.</li>
                <li>Read it once on your phone before publishing.</li>
              </ol>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
