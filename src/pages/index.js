import * as React from "react"
import { useState, useMemo } from "react"
import { graphql } from "gatsby"
import styled from "styled-components"
import { motion, AnimatePresence } from "framer-motion"

import Layout from "../components/layout"
import Seo from "../components/seo"
import AnimatedPostCard from "../components/AnimatedPostCard"
import Search from "../components/Search"

const CATEGORIES = ["전체", "개발", "일상"]

const TAG_GROUPS = {
  "DB": ["MySQL", "Database", "InnoDB", "Optimizer", "Index", "Lock", "Histogram", "Statistics", "Cost Model", "Execution Plan", "Redis"],
  "Spring": ["Spring", "Spring Boot", "Spring Data Jpa", "JPA", "@Async"],
  "Tomcat": ["Tomcat", "Servlet", "Tuning", "Monitoring", "JMX", "Connection Pool"],
  "Cache": ["Memcached", "캐시", "Cache", "일관성"],
  "Async": ["NIO", "Netty", "Reactive", "WebFlux", "WebClient", "Non-Blocking", "Blocking", "Event Loop", "비동기", "비동기처리"],
  "분산시스템": ["분산시스템", "분산 시스템", "CAP이론", "복제", "CDC", "Kafka", "RabbitMQ", "메시지큐", "Debezium", "트랜잭션아웃박스"],
  "Java": ["Java", "JVM", "Thread", "Concurrency", "가상 스레드"],
}

const HeroSection = styled(motion.section)`
  margin-bottom: 0.5rem;
  margin-top: -3.0rem;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 10;
  padding: 0.5rem 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const HeroTextWrapper = styled.div`
  margin-bottom: 1.5rem;
  width: 100%;
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
  gap: 0.1 rem;
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
  
  &:hover {
    border-color: #3182F6;
    box-shadow: 0 4px 12px rgba(49, 130, 246, 0.15);
    transform: translateY(-2px);
  }
  
  svg {
    width: 16px;
    height: 16px;
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

const FilterSection = styled.div`
  margin-bottom: 1.5rem;
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const CategoryTab = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? '#3182F6' : 'var(--color-background-secondary)'};
  color: ${props => props.$active ? '#ffffff' : 'var(--color-text-light)'};

  &:hover {
    background: ${props => props.$active ? '#3182F6' : 'var(--color-border)'};
  }
`;

const TagFilterWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TagChip = styled.button`
  padding: 0.35rem 0.75rem;
  border: 1px solid ${props => props.$active ? '#3182F6' : 'var(--color-border)'};
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? 'rgba(49, 130, 246, 0.1)' : 'transparent'};
  color: ${props => props.$active ? '#3182F6' : 'var(--color-text-light)'};

  &:hover {
    border-color: #3182F6;
    color: #3182F6;
  }
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

  const [activeCategory, setActiveCategory] = useState("전체")
  const [selectedTags, setSelectedTags] = useState([])

  const categoryFilteredPosts = useMemo(() => {
    if (activeCategory === "전체") return posts
    return posts.filter(post => post.frontmatter.category === activeCategory)
  }, [posts, activeCategory])

  const availableGroups = useMemo(() => {
    const allTags = new Set()
    categoryFilteredPosts.forEach(post => {
      post.frontmatter.tags?.forEach(tag => allTags.add(tag))
    })

    return Object.keys(TAG_GROUPS).filter(group =>
      TAG_GROUPS[group].some(tag => allTags.has(tag))
    )
  }, [categoryFilteredPosts])

  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return categoryFilteredPosts

    const expandedTags = selectedTags.flatMap(group => TAG_GROUPS[group] || [group])
    return categoryFilteredPosts.filter(post =>
      expandedTags.some(tag => post.frontmatter.tags?.includes(tag))
    )
  }, [categoryFilteredPosts, selectedTags])

  const handleCategoryChange = (category) => {
    setActiveCategory(category)
    setSelectedTags([])
  }

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

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
              개발하며 배운 것들을 정리하고 공유하는 기술 블로그
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
        총 <strong>{filteredPosts.length}개</strong>의 포스트가 있습니다
      </PostCount>

      <FilterSection>
        <CategoryTabs>
          {CATEGORIES.map(category => (
            <CategoryTab
              key={category}
              $active={activeCategory === category}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </CategoryTab>
          ))}
        </CategoryTabs>
        {availableGroups.length > 0 && (
          <TagFilterWrapper>
            {availableGroups.map(group => (
              <TagChip
                key={group}
                $active={selectedTags.includes(group)}
                onClick={() => handleTagToggle(group)}
              >
                {group}
              </TagChip>
            ))}
          </TagFilterWrapper>
        )}
      </FilterSection>

      <Search posts={filteredPosts} />

      <AnimatePresence>
        <PostList
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={`${activeCategory}-${selectedTags.join(',')}`}
        >
          {filteredPosts.map((post, index) => (
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
          category
          tags
        }
        wordCount {
          words
        }
      }
    }
  }
`