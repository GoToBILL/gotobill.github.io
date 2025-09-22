import React, { useEffect, useState, memo } from 'react'
import styled from 'styled-components'

const TOCWrapper = styled.div`
  position: fixed;
  left: calc(50% + 440px); /* 중앙 + 본문 절반(400px) + 간격(40px) */
  top: 12vh;
  width: 200px;
  height: 70vh;
  max-height: 600px;
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: 1300px) {
    display: none;
  }
`;

const ProgressBar = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: ${props => (props.$progress || 0)}%;
  max-height: 100%;
  background: linear-gradient(to bottom, #3b82f6, #1e40af);
  border-radius: 12px 0 0 12px;
  transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1001;
  pointer-events: none;
  overflow: hidden;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

const TOCContainer = styled.nav`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  background: linear-gradient(135deg,
    var(--color-background, #ffffff) 0%,
    var(--color-background-secondary, #fafafa) 100%
  );
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  box-shadow: var(--shadow-lg, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
  z-index: 1000;

  /* Hide scrollbar but allow scrolling */
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1150px) {
    display: none;
  }
`;


const TOCList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const TOCItem = styled.li`
  margin: 0.1rem -0.5rem;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  background: ${props => props.$isActive
    ? 'rgba(59, 130, 246, 0.1)'
    : 'transparent'};
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.$isActive
      ? 'rgba(59, 130, 246, 0.15)'
      : 'rgba(156, 163, 175, 0.1)'};
  }

  /* 다크 모드 */
  [data-theme="dark"] & {
    background: ${props => props.$isActive
      ? 'rgba(96, 165, 250, 0.15)'
      : 'transparent'};

    &:hover {
      background: ${props => props.$isActive
        ? 'rgba(96, 165, 250, 0.2)'
        : 'rgba(156, 163, 175, 0.15)'};
    }
  }
`;

const TOCLink = styled.a`
  display: block;
  padding-left: ${props => (props.$depth - 2) * 1}rem;
  color: ${props => {
    if (props.$isActive) return 'var(--color-primary, #3b82f6)';
    if (props.$isH2) return 'var(--color-text, #1e293b)';
    return 'var(--color-text-light, #64748b)';
  }};
  font-size: ${props => props.$isH2 ? '0.85rem' : '0.8rem'};
  text-decoration: none;
  font-weight: ${props => {
    if (props.$isActive) return '600';  /* 활성 항목은 조금 덜 굵게 */
    if (props.$isH2) return '500';  /* H2도 중간 굵기 */
    return '400';
  }};
  line-height: 1.4;
  transition: all 0.15s ease;
  /* position: relative; */

  /* Text wrapping for long titles */
  word-break: keep-all;
  overflow-wrap: break-word;
  white-space: normal;
  hyphens: auto;

  /* Dot indicator for sub-items */
  /* &::before {
    content: ${props => props.$depth > 2 ? '"•"' : '""'};
    position: absolute;
    left: ${props => 0.75 + (props.$depth - 3) * 0.75}rem;
    color: ${props => props.$isActive ? '#4338ca' : '#cbd5e1'};
    font-size: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
  } */

  &:hover {
    color: ${props => props.$isActive
      ? 'var(--color-primary-dark, #2563eb)'
      : 'var(--color-text, #1e293b)'};
    transform: translateX(2px);
  }
`;

// Store progress outside React to prevent resets
let globalScrollProgress = 0

const TableOfContents = memo(() => {
  const [headings, setHeadings] = useState([])
  const [activeId, setActiveId] = useState('')
  const [scrollProgress, setScrollProgress] = useState(globalScrollProgress)
  const tocRef = React.useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const contentElement = document.querySelector('.blog-post-content')
      if (!contentElement) return

      const headingElements = contentElement.querySelectorAll('h2, h3, h4')
      const collected = []

      headingElements.forEach((heading) => {
        const text = heading.textContent
        const depth = parseInt(heading.tagName[1])

        if (!heading.id) {
          heading.id = text
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]+/g, '-')
            .replace(/(^-|-$)/g, '')
        }

        collected.push({
          id: heading.id,
          text,
          depth
        })
      })

      setHeadings(collected)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Separate effect for page scroll progress
  useEffect(() => {
    let animationFrame = null

    const handleScrollProgress = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }

      animationFrame = requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const docHeight = document.documentElement.scrollHeight
        const winHeight = window.innerHeight
        const scrollableHeight = docHeight - winHeight

        if (scrollableHeight > 0) {
          const progress = Math.min((scrollTop / scrollableHeight) * 100, 100)
          globalScrollProgress = progress
          setScrollProgress(progress)

        }
      })
    }

    window.addEventListener('scroll', handleScrollProgress, { passive: true })
    handleScrollProgress() // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScrollProgress)
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [])

  // Separate effect for active heading tracking
  useEffect(() => {
    if (headings.length === 0) return

    const handleScroll = () => {
      const headingElements = headings
        .map(({ id }) => document.getElementById(id))
        .filter(Boolean)

      if (headingElements.length === 0) return

      let currentActiveId = headings[0].id

      // Find the heading currently in viewport
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const rect = headingElements[i].getBoundingClientRect()
        if (rect.top <= 150) {
          currentActiveId = headingElements[i].id
          break
        }
      }

      setActiveId(currentActiveId)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [headings])

  // Separate effect for auto-scrolling TOC with debounce
  useEffect(() => {
    if (!activeId || !tocRef.current) return

    const timeoutId = setTimeout(() => {
      const activeElement = tocRef.current?.querySelector(`[href="#${activeId}"]`)
      if (activeElement && tocRef.current) {
        const container = tocRef.current
        const elementTop = activeElement.offsetTop
        const elementHeight = activeElement.offsetHeight
        const containerHeight = container.clientHeight
        const containerScrollTop = container.scrollTop

        // Calculate if element is outside visible area
        const elementBottom = elementTop + elementHeight
        const visibleTop = containerScrollTop + 20  // Add buffer
        const visibleBottom = containerScrollTop + containerHeight - 20  // Add buffer

        // Scroll to center the active element
        if (elementTop < visibleTop || elementBottom > visibleBottom) {
          const scrollTarget = Math.max(0, elementTop - (containerHeight / 2) + (elementHeight / 2))
          container.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
          })
        }
      }
    }, 300) // Increase delay to reduce interference

    return () => clearTimeout(timeoutId)
  }, [activeId])

  const scrollToHeading = (e, id) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const top = element.offsetTop - 100
      window.scrollTo({
        top,
        behavior: 'smooth'
      })
    }
  }

  if (headings.length === 0) {
    return null
  }

  return (
    <TOCWrapper>
      <ProgressBar $progress={scrollProgress} />
      <TOCContainer ref={tocRef}>
        <TOCList>
          {headings.map((heading) => (
            <TOCItem
              key={heading.id}
              $depth={heading.depth}
              $isActive={activeId === heading.id}
            >
              <TOCLink
                href={`#${heading.id}`}
                onClick={(e) => scrollToHeading(e, heading.id)}
                $isActive={activeId === heading.id}
                $isH2={heading.depth === 2}
                $depth={heading.depth}
              >
                {heading.text}
              </TOCLink>
            </TOCItem>
          ))}
        </TOCList>
      </TOCContainer>
    </TOCWrapper>
  )
})

export default TableOfContents