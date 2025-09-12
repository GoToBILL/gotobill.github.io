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
  text-align: center;
  padding: 2rem 0;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #3182F6 0%, #0066FF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.25rem;
  color: var(--color-text-light);
  max-width: 600px;
  margin: 0 auto;
`;

const PostList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
          <HeroTitle
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            GoToBill
          </HeroTitle>
          <HeroDescription
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            기술과 개발에 대한 이야기를 나누는 공간입니다
          </HeroDescription>
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

export const Head = () => <Seo title="All posts" />

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