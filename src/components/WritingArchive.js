import React, { useMemo, useState } from "react"
import styled from "styled-components"
import AnimatedPostCard from "./AnimatedPostCard"

const CATEGORIES = ["전체", "개발", "일상"]
const POSTS_PER_PAGE = 10

const TAG_GROUPS = {
  DB: ["MySQL", "Database", "InnoDB", "Optimizer", "Index", "Lock", "Histogram", "Statistics", "Cost Model", "Execution Plan"],
  Spring: ["Spring", "Spring Boot", "Spring Data Jpa", "JPA", "@Async"],
  Tomcat: ["Tomcat", "Servlet", "Tuning", "Monitoring", "JMX", "Connection Pool"],
  Cache: ["Memcached", "캐시", "Cache", "일관성"],
  Async: ["NIO", "Netty", "Reactive", "WebFlux", "WebClient", "Non-Blocking", "Blocking", "Event Loop", "비동기", "비동기처리"],
  분산시스템: ["분산시스템", "분산 시스템", "CAP이론", "복제", "CDC", "RabbitMQ", "메시지큐", "Debezium", "트랜잭션아웃박스"],
  Java: ["Java", "JVM", "Thread", "가상 스레드"],
  Network: ["Network", "네트워크", "TCP", "HTTP", "HTTPS", "OSI", "CORS", "gRPC", "REST", "SSL", "TLS"],
}

const ControlPanel = styled.section`
  margin: 2.5rem 0 1.5rem;
  padding: clamp(1.1rem, 3vw, 1.6rem);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--paper-raised) 94%, transparent);
  box-shadow: var(--shadow);
`

const SearchLabel = styled.label`
  display: block;
  margin-bottom: 0.55rem;
  color: var(--ink-strong);
  font-size: 0.76rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const SearchInput = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--paper);
  color: var(--ink-strong);

  &::placeholder { color: var(--ink-muted); }
  &:focus { border-color: var(--signal); }
`

const Filters = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
`

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`

const FilterButton = styled.button`
  min-height: 44px;
  padding: 0.45rem 0.85rem;
  border: 1px solid ${props => props.$active ? "var(--signal)" : "var(--line)"};
  border-radius: 999px;
  background: ${props => props.$active ? "var(--signal)" : "var(--paper-soft)"};
  color: ${props => props.$active ? "#fff" : "var(--ink-muted)"};
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;

  &:hover { border-color: var(--signal); color: ${props => props.$active ? "#fff" : "var(--signal)"}; }
`

const Count = styled.p`
  margin: 1.25rem 0 0;
  color: var(--ink-muted);
  font: 500 0.77rem/1.5 "SFMono-Regular", Consolas, monospace;
`

const Results = styled.section`
  border-bottom: 1px solid var(--line);
`

const Empty = styled.p`
  margin: 0;
  padding: 4rem 1rem;
  border-top: 1px solid var(--line);
  text-align: center;
  color: var(--ink-muted);
`

const Pagination = styled.nav`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 2rem;
`

const PageButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.$active ? "var(--signal)" : "var(--line)"};
  border-radius: var(--radius-sm);
  background: ${props => props.$active ? "var(--signal)" : "var(--paper-raised)"};
  color: ${props => props.$active ? "#fff" : "var(--ink)"};
  cursor: pointer;

  &:disabled { opacity: 0.42; cursor: not-allowed; }
`

const WritingArchive = ({ posts }) => {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("전체")
  const [selectedTags, setSelectedTags] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  const categoryPosts = useMemo(() => activeCategory === "전체"
    ? posts
    : posts.filter(post => post.frontmatter.category === activeCategory), [posts, activeCategory])

  const availableGroups = useMemo(() => {
    const tags = new Set(categoryPosts.flatMap(post => post.frontmatter.tags || []))
    return Object.keys(TAG_GROUPS).filter(group => TAG_GROUPS[group].some(tag => tags.has(tag)))
  }, [categoryPosts])

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko")
    const expandedTags = selectedTags.flatMap(group => TAG_GROUPS[group] || [group])

    return categoryPosts.filter(post => {
      const matchesTags = expandedTags.length === 0 || expandedTags.some(tag => post.frontmatter.tags?.includes(tag))
      if (!matchesTags) return false
      if (!normalizedQuery) return true
      const searchable = [post.frontmatter.title, post.frontmatter.description, post.excerpt, ...(post.frontmatter.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ko")
      return searchable.includes(normalizedQuery)
    })
  }, [categoryPosts, query, selectedTags])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedPosts = filteredPosts.slice((safePage - 1) * POSTS_PER_PAGE, safePage * POSTS_PER_PAGE)

  const changeCategory = category => {
    setActiveCategory(category)
    setSelectedTags([])
    setCurrentPage(1)
  }

  const toggleTag = tag => {
    setSelectedTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])
    setCurrentPage(1)
  }

  const changePage = page => {
    setCurrentPage(page)
    document.getElementById("archive-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <ControlPanel aria-labelledby="archive-controls-title">
        <SearchLabel id="archive-controls-title" htmlFor="writing-search">기록 검색</SearchLabel>
        <SearchInput
          id="writing-search"
          type="search"
          value={query}
          placeholder="제목, 설명, 태그로 검색"
          onChange={event => { setQuery(event.target.value); setCurrentPage(1) }}
        />
        <Filters>
          <ButtonRow role="group" aria-label="카테고리 필터">
            {CATEGORIES.map(category => (
              <FilterButton key={category} type="button" $active={activeCategory === category} aria-pressed={activeCategory === category} onClick={() => changeCategory(category)}>
                {category}
              </FilterButton>
            ))}
          </ButtonRow>
          {availableGroups.length > 0 && (
            <ButtonRow role="group" aria-label="주제 필터">
              {availableGroups.map(group => (
                <FilterButton key={group} type="button" $active={selectedTags.includes(group)} aria-pressed={selectedTags.includes(group)} onClick={() => toggleTag(group)}>
                  {group}
                </FilterButton>
              ))}
            </ButtonRow>
          )}
        </Filters>
        <Count aria-live="polite">검색 결과 {filteredPosts.length}개 · 전체 {posts.length}개</Count>
      </ControlPanel>

      <Results id="archive-results" aria-label="글 목록">
        {paginatedPosts.length > 0
          ? paginatedPosts.map((post, index) => <AnimatedPostCard key={post.fields.slug} post={post} index={(safePage - 1) * POSTS_PER_PAGE + index} />)
          : <Empty>조건에 맞는 기록이 없습니다.</Empty>}
      </Results>

      {totalPages > 1 && (
        <Pagination aria-label="글 페이지">
          <PageButton type="button" onClick={() => changePage(safePage - 1)} disabled={safePage === 1}>이전</PageButton>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
            <PageButton key={page} type="button" $active={safePage === page} aria-current={safePage === page ? "page" : undefined} onClick={() => changePage(page)}>{page}</PageButton>
          ))}
          <PageButton type="button" onClick={() => changePage(safePage + 1)} disabled={safePage === totalPages}>다음</PageButton>
        </Pagination>
      )}
    </>
  )
}

export default WritingArchive
