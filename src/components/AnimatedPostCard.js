import React from 'react'
import { Link } from 'gatsby'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const Card = styled(motion.article)`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.75rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3182F6 0%, #6366f1 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(49, 130, 246, 0.3);
    box-shadow: 0 12px 24px -8px rgba(49, 130, 246, 0.15);

    &::before {
      opacity: 1;
    }
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

const Tags = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Tag = styled(motion.span)`
  background: rgba(49, 130, 246, 0.08);
  color: #3182F6;
  padding: 0.3rem 0.8rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;

  ${Card}:hover & {
    background: linear-gradient(135deg, rgba(49, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
  }

  &:hover {
    background: linear-gradient(135deg, #3182F6 0%, #6366f1 100%);
    color: white;
  }
`;

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 50 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  hover: {
    y: -8,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
}

const tagVariants = {
  hover: {
    scale: 1.1,
    transition: {
      duration: 0.2
    }
  }
}

const AnimatedPostCard = ({ post, index }) => {
  const title = post.frontmatter.title || post.fields.slug
  const readTime = Math.ceil(post.wordCount?.words / 200) || 5

  return (
    <Link to={post.fields.slug} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Card
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        custom={index}
        transition={{ delay: index * 0.1 }}
      >
        <header>
          <Title>
            <span>{title}</span>
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
            {post.frontmatter.tags.map((tag, i) => (
              <Tag
                key={tag}
                variants={tagVariants}
                whileHover="hover"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { delay: 0.3 + i * 0.05 }
                }}
              >
                #{tag}
              </Tag>
            ))}
          </Tags>
        )}
      </Card>
    </Link>
  )
}

export default AnimatedPostCard