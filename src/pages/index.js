import * as React from "react"
import { graphql } from "gatsby"
import styled from "styled-components"
import { motion, AnimatePresence } from "framer-motion"

import Layout from "../components/layout"
import Seo from "../components/seo"
import AnimatedPostCard from "../components/AnimatedPostCard"
import Search from "../components/Search"

const HeroSection = styled(motion.section)`
  margin-bottom: 3rem;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 10;
  text-align: left;
  padding: 2rem 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const HeroTextWrapper = styled.div`
  flex: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: var(--color-text);
  font-weight: 700;
  line-height: 1.4;
  
  .highlight {
    color: #3182F6;
  }
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem;
  color: var(--color-text-light);
  margin: 0;
`;

const PostList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const GitHubLink = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text);
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  align-self: center;
  
  &:hover {
    border-color: #3182F6;
    box-shadow: 0 4px 12px rgba(49, 130, 246, 0.15);
    transform: translateY(-2px);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
  
  @media (max-width: 768px) {
    margin-top: 1.5rem;
  }
`;

const PostCount = styled.div`
  padding: 1rem 1.5rem;
  background: var(--color-background-secondary);
  border-radius: 12px;
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 0.95rem;
  color: var(--color-text-light);
  
  strong {
    color: var(--color-primary);
    font-weight: 600;
  }
`;

const EmptyMessage = styled.p`
  text-align: center;
  color: var(--color-text-light);
  padding: 3rem 0;
  font-size: 1.125rem;
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
}

const BlogIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const posts = data.allMarkdownRemark.nodes

  if (posts.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <EmptyMessage>
          아직 작성된 포스트가 없습니다. 첫 번째 포스트를 작성해보세요!
        </EmptyMessage>
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      <HeroSection
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <HeroContent>
          <HeroTextWrapper>
            <HeroTitle
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="highlight">끊임없이 노력</span>하고 <span className="highlight">성장</span>하는 개발자, <span className="highlight">주병주</span>입니다.
            </HeroTitle>
            <HeroDescription
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              기술에 대한 이야기를 정리하는 블로그입니다.
            </HeroDescription>
          </HeroTextWrapper>
          <GitHubLink
            href="https://github.com/gotobill"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </GitHubLink>
        </HeroContent>
      </HeroSection>
      
      <PostCount>
        총 <strong>{posts.length}개</strong>의 포스트가 있습니다
      </PostCount>
      
      <Search posts={posts} />
      
      <AnimatePresence>
        <PostList
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {posts.map((post, index) => (
            <AnimatedPostCard 
              key={post.fields.slug} 
              post={post} 
              index={index}
            />
          ))}
        </PostList>
      </AnimatePresence>
    </Layout>
  )
}

export default BlogIndex

export const Head = () => <Seo title="GoToBill" />

export const pageQuery = graphql`
  {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        excerpt
        fields {
          slug
        }
        frontmatter {
          date(formatString: "YYYY년 M월 D일")
          title
          description
          tags
        }
        wordCount {
          words
        }
      }
    }
  }
`