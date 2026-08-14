import React from "react"
import { Link } from "gatsby"
import styled from "styled-components"
import { motion, useReducedMotion } from "framer-motion"

const CardLink = styled(Link)`
  display: block;
  color: inherit;
  text-decoration: none;
`

const Card = styled(motion.article)`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.4rem;
  align-items: start;
  padding: 1.55rem 0;
  border-top: 1px solid var(--line);

  &::after {
    content: "↗";
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: 50%;
    color: var(--ink-muted);
    transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
  }

  ${CardLink}:hover &::after {
    color: var(--signal);
    border-color: var(--signal);
    background: var(--signal-wash);
  }

  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.7rem 1rem;
  }
`

const Content = styled.div``

const Title = styled.h2`
  margin: 0 0 0.45rem;
  color: var(--ink-strong);
  font-size: clamp(1.15rem, 2.2vw, 1.45rem);
  line-height: 1.35;
  transition: color 160ms ease;

  ${CardLink}:hover & { color: var(--signal); }
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.85rem;
  margin-bottom: 0.75rem;
  color: var(--ink-muted);
  font-size: 0.78rem;
`

const Description = styled.p`
  max-width: 60ch;
  margin: 0;
  color: var(--ink);
  font-size: 0.94rem;
  line-height: 1.65;
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.85rem;
`

const Tag = styled.span`
  padding: 0.18rem 0.5rem;
  border: 0;
  border-radius: 999px;
  background: var(--paper-soft);
  color: var(--ink-muted);
  font-size: 0.7rem;
`

const AnimatedPostCard = ({ post, index }) => {
  const reduceMotion = useReducedMotion()
  const title = post.frontmatter.title || post.fields.slug
  const readTime = Math.ceil(post.wordCount?.words / 200) || 5

  return (
    <CardLink to={post.fields.slug} aria-label={`${title} 읽기`}>
      <Card
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.2) }}
      >
        <Content>
          <Title>{title}</Title>
          <Meta>
            <time>{post.frontmatter.date}</time>
            <span aria-hidden="true">·</span>
            <span>{readTime}분 읽기</span>
          </Meta>
          <Description dangerouslySetInnerHTML={{ __html: post.frontmatter.description || post.excerpt }} />
          {post.frontmatter.tags?.length > 0 && (
            <Tags aria-label="태그">
              {post.frontmatter.tags.slice(0, 4).map(tag => <Tag key={tag}>#{tag}</Tag>)}
            </Tags>
          )}
        </Content>
      </Card>
    </CardLink>
  )
}

export default AnimatedPostCard
