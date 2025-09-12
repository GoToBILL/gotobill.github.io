import React, { useState, useMemo } from 'react'
import { Link } from 'gatsby'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const SearchContainer = styled.div`
  margin-bottom: 2rem;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 3rem 1rem 1rem;
  font-size: 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background);
  color: var(--color-text);
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: var(--color-text-light);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-light);
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const ResultsContainer = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
`;

const ResultItem = styled(motion.div)`
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--color-background-secondary);
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--color-text);
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-light);
  }
  
  .highlight {
    background: rgba(59, 130, 246, 0.2);
    color: var(--color-primary-dark);
    padding: 0 2px;
    border-radius: 2px;
  }
`;

const NoResults = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--color-text-light);
`;

const Search = ({ posts }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const searchResults = useMemo(() => {
    if (!query) return []
    
    const searchQuery = query.toLowerCase()
    return posts.filter(post => {
      const title = post.frontmatter.title.toLowerCase()
      const description = (post.frontmatter.description || '').toLowerCase()
      const tags = (post.frontmatter.tags || []).join(' ').toLowerCase()
      
      return title.includes(searchQuery) || 
             description.includes(searchQuery) || 
             tags.includes(searchQuery)
    }).slice(0, 5) // 최대 5개 결과만 표시
  }, [query, posts])
  
  const highlightText = (text, highlight) => {
    if (!highlight) return text
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <span key={index} className="highlight">{part}</span>
        : part
    )
  }
  
  return (
    <SearchContainer>
      <SearchInput
        type="text"
        placeholder="포스트 검색..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(e.target.value.length > 0)
        }}
        onFocus={() => setIsOpen(query.length > 0)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      <SearchIcon>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </SearchIcon>
      
      <AnimatePresence>
        {isOpen && (
          <ResultsContainer
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {searchResults.length > 0 ? (
              searchResults.map(post => (
                <Link to={post.fields.slug} key={post.fields.slug}>
                  <ResultItem
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3>{highlightText(post.frontmatter.title, query)}</h3>
                    <p>{highlightText(post.frontmatter.description || post.excerpt, query)}</p>
                  </ResultItem>
                </Link>
              ))
            ) : (
              <NoResults>검색 결과가 없습니다</NoResults>
            )}
          </ResultsContainer>
        )}
      </AnimatePresence>
    </SearchContainer>
  )
}

export default Search