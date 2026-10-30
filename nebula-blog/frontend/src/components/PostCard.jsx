import { Link } from "react-router-dom";

import { formatNumber, timeAgo } from "../lib/format";
import { useTilt } from "../lib/useTilt";
import { Avatar } from "./Avatar";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icons";

export function PostCard({ post, featured = false }) {
  const { ref, tiltProps } = useTilt({ max: featured ? 4 : 6, lift: 10 });

  return (
    <article
      ref={ref}
      className={`post-card tilt ${featured ? "post-card--featured" : ""}`}
      {...tiltProps}
    >
      <div className="post-card__glare" aria-hidden="true" />
      <div className="post-card__cover">
        <CoverArt theme={post.theme} category={post.category} />
        <span className="post-card__depth">
          {post.category?.name || "Story"}
        </span>
        {post.status === "draft" && <span className="badge badge--draft">Draft</span>}
      </div>

      <div className="post-card__body">
        <div className="post-card__meta">
          <span>{timeAgo(post.publishedAt || post.createdAt)}</span>
          <span className="meta-dot" />
          <span>{post.reading_time} min read</span>
          {featured && (
            <>
              <span className="meta-dot" />
              <span className="post-card__featured-label">Editor&apos;s pick</span>
            </>
          )}
        </div>

        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__excerpt">{post.excerpt}</p>

        <div className="post-card__footer">
          <div className="post-card__author">
            <Avatar user={post.author} size={28} />
            <span>{post.author.username}</span>
          </div>
          <div className="post-card__stats">
            <span className={post.is_liked ? "is-liked" : ""}>
              <Icon name="heart" size={15} />
              {formatNumber(post.likes_count)}
            </span>
            <span>
              <Icon name="comment" size={15} />
              {formatNumber(post.comments_count)}
            </span>
          </div>
        </div>
      </div>

      <Link
        to={`/post/${post.slug}`}
        className="post-card__link"
        aria-label={`Read ${post.title}`}
      />
    </article>
  );
}
