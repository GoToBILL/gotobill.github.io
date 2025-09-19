import React from 'react'
import { Link } from 'gatsby'
import styled from 'styled-components'

const CardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
`;

const Card = styled.article`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: #3182F6;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  transition: color 0.3s ease;

  ${Card}:hover & {
    color: var(--color-primary);
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  color: var(--color-text-light);
  font-size: 0.875rem;
`;

const Date = styled.time`
  font-weight: 500;
`;

const ReadTime = styled.span`
  &::before {
    content: "•";
    margin-right: 0.5rem;
  }
`;

const Description = styled.p`
  color: var(--color-text);
  line-height: 1.7;
  margin: 0;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Tag = styled.span`
  background: #E8F2FF;
  color: #3182F6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  ${Card}:hover & {
    background: #3182F6;
    color: white;
  }
`;

const PostCard = ({ post }) => {
  const title = post.frontmatter.title || post.fields.slug
  const readTime = Math.ceil(post.wordCount?.words / 200) || 5

  return (
    <CardLink to={post.fields.slug}>
      <Card>
        <header>
          <Title>{title}</Title>
          <Meta>
            <Date>{post.frontmatter.date}</Date>
            <ReadTime>{readTime} min read</ReadTime>
          </Meta>
        </header>
        <Description
          dangerouslySetInnerHTML={{
            __html: post.frontmatter.description || post.excerpt,
          }}
        />
        {post.frontmatter.tags && (
          <Tags>
            {post.frontmatter.tags.map(tag => (
              <Tag key={tag}>#{tag}</Tag>
            ))}
          </Tags>
        )}
      </Card>
    </CardLink>
  )
}

export default PostCard