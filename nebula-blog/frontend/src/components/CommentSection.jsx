import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { timeAgo } from "../lib/format";
import { useToast } from "../lib/useToast";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { Skeleton } from "./Skeletons";

function CommentBody({ comment, replying, onReply, onCancelReply, replyBody, setReplyBody, onSubmit, busy, onDelete }) {
  return (
    <div className="comment">
      <Avatar user={comment.author} size={38} />
      <div className="comment__main">
        <div className="comment__head">
          <Link to={`/profile/${comment.author.username}`} className="comment__author">
            {comment.author.username}
          </Link>
          <span className="meta-dot" />
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {comment.author.headline && <span className="comment__headline">{comment.author.headline}</span>}
        </div>
        <p className="comment__text">{comment.body}</p>
        <div className="comment__actions">
          <button type="button" className="text-btn" onClick={onReply}>
            <Icon name="comment" size={14} /> Reply
          </button>
          {comment.is_owner && (
            <button type="button" className="text-btn text-btn--danger" onClick={onDelete}>
              <Icon name="trash" size={14} /> Delete
            </button>
          )}
        </div>

        {replying && (
          <form className="comment-form comment-form--inline" onSubmit={onSubmit}>
            <textarea
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder={`Reply to ${comment.author.username}…`}
              maxLength={2000}
              rows={3}
              autoFocus
            />
            <div className="comment-form__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={onCancelReply}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !replyBody.trim()}>
                {busy ? "Sending…" : "Reply"}
              </button>
            </div>
          </form>
        )}

        {comment.replies?.length > 0 && (
          <div className="comment__replies">
            {comment.replies.map((reply) => (
              <div className="comment comment--reply" key={reply.id}>
                <Avatar user={reply.author} size={30} />
                <div className="comment__main">
                  <div className="comment__head">
                    <Link to={`/profile/${reply.author.username}`} className="comment__author">
                      {reply.author.username}
                    </Link>
                    <span className="meta-dot" />
                    <time dateTime={reply.createdAt}>{timeAgo(reply.createdAt)}</time>
                  </div>
                  <p className="comment__text">{reply.body}</p>
                  {reply.is_owner && (
                    <div className="comment__actions">
                      <button
                        type="button"
                        className="text-btn text-btn--danger"
                        onClick={() => onDelete(reply.id)}
                      >
                        <Icon name="trash" size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ slug, initialCount = 0 }) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await api(`/posts/${slug}/comments/`);
      if (alive.current) setComments(data);
    } catch {
      if (alive.current) setComments([]);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const total = comments.reduce((sum, item) => sum + 1 + (item.replies?.length || 0), 0);
  const displayCount = loading ? initialCount : total;

  const submit = async (event, parentId = null) => {
    event.preventDefault();
    const text = (parentId ? replyBody : body).trim();
    if (!text) return;
    setBusy(true);
    try {
      await api(`/posts/${slug}/comments/`, {
        method: "POST",
        body: { body: text, ...(parentId ? { parent: parentId } : {}) },
      });
      if (parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setBody("");
      }
      await load();
      toast.push(parentId ? "Reply posted." : "Comment posted.", "success");
    } catch (error) {
      toast.push(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api(`/comments/${id}/`, { method: "DELETE" });
      await load();
      toast.push("Comment deleted.", "info");
    } catch (error) {
      toast.push(error.message, "error");
    }
  };

  return (
    <section className="comments" aria-labelledby="comments-title">
      <div className="comments__head">
        <h2 id="comments-title">Conversation</h2>
        <span className="comments__count">{displayCount}</span>
      </div>

      {user ? (
        <form className="comment-form" onSubmit={(event) => submit(event)}>
          <Avatar user={user} size={40} />
          <div className="comment-form__field">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add to the conversation…"
              maxLength={2000}
              rows={3}
              aria-label="Write a comment"
            />
            <div className="comment-form__actions">
              <span className="comment-form__hint">{body.length}/2000</span>
              <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !body.trim()}>
                {busy ? "Posting…" : "Post comment"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="comments__gate">
          <p>
            Sign in to join the conversation. Your thoughts deserve a little gravity.
          </p>
          <div>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="btn btn--primary btn--sm"
            >
              Sign in
            </Link>
            <Link to="/register" className="btn btn--ghost btn--sm">
              Create account
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="comments__loading">
          {[0, 1].map((index) => (
            <div className="comment" key={index}>
              <Skeleton className="skeleton--avatar" />
              <div className="comment__main">
                <Skeleton className="skeleton--line skeleton--w30" />
                <Skeleton className="skeleton--line skeleton--w90" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="comments__empty">No comments yet. Be the first to orbit this story.</p>
      ) : (
        <div className="comments__list">
          {comments.map((comment) => (
            <CommentBody
              key={comment.id}
              comment={comment}
              replying={replyTo === comment.id}
              onReply={() => {
                setReplyTo(comment.id);
                setReplyBody("");
              }}
              onCancelReply={() => setReplyTo(null)}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              onSubmit={(event) => submit(event, comment.id)}
              busy={busy}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
