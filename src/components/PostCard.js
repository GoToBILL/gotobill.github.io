import React from 'react'
import { Link } from 'gatsby'
import styled from 'styled-components'

const Card = styled.article`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary);
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  
  a {
    color: var(--color-text);
    text-decoration: none;
    
    &:hover {
      color: var(--color-primary);
    }
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
  background: var(--color-background-secondary);
  color: var(--color-text-light);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-primary);
    color: white;
  }
`;

const PostCard = ({ post }) => {
  const title = post.frontmatter.title || post.fields.slug
  const readTime = Math.ceil(post.wordCount?.words / 200) || 5
  
  return (
    <Card>
      <header>
        <Title>
          <Link to={post.fields.slug}>{title}</Link>
        </Title>
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
  )
}

export default PostCard