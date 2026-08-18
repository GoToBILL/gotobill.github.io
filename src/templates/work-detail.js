import * as React from "react"
import { Link } from "gatsby"
import styled from "styled-components"
import Layout from "../components/layout"
import Seo from "../components/seo"
import ArchitectureDiagram from "../components/ArchitectureDiagram"
import { projects } from "../data/resume"

const Article = styled.article`
  width: min(100%, 1120px);
  margin: 0 auto;
`

const BackLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--ink-muted);
  text-decoration: none;
  font-size: 0.8rem;

  &:hover { color: var(--signal); }
`

const Header = styled.header`
  padding: clamp(2rem, 5vw, 3.5rem);
  background: linear-gradient(135deg, var(--dusk-soft), var(--paper-raised));
`

const Title = styled.h1`
  margin: 0;
  max-width: 24ch;
  font-size: clamp(1.9rem, 3.5vw, 2.7rem);
  line-height: 1.18;
  letter-spacing: -0.045em;
  text-wrap: balance;

  @media (max-width: 620px) {
    max-width: none;
    font-size: 1.3rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }
`

const Summary = styled.p`
  max-width: 64ch;
  margin: 1.25rem 0 0;
  color: var(--ink);
  font-size: 1rem;
`

const Headline = styled.p`
  max-width: 64ch;
  margin: 1rem 0 0;
  color: var(--ink-strong);
  font-size: clamp(1.05rem, 1.8vw, 1.25rem);
  font-weight: 700;
  line-height: 1.55;
  text-wrap: balance;
`

const Stack = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;

  li { margin: 0; padding: 0.3rem 0.6rem; border: 1px solid rgba(37, 99, 235, 0.28); border-radius: 999px; background: var(--signal-wash); color: var(--signal-deep); font-size: 0.72rem; font-weight: 650; }

  html[data-theme="dark"] & li { border-color: rgba(147, 197, 253, 0.35); background: rgba(37, 99, 235, 0.14); color: #bfdbfe; }
`

const ReadingLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 710px) 220px;
  justify-content: center;
  align-items: start;
  gap: clamp(3.5rem, 5vw, 4.5rem);
  padding-top: 0.8rem;

  @media (max-width: 1099px) {
    display: block;
    width: min(100%, 660px);
    margin: 0 auto;
  }
`

const Narrative = styled.div`
  min-width: 0;
  grid-column: 1;
  grid-row: 1;
`

const Opening = styled.div`
  padding: 2.4rem 0 1rem;

  p { max-width: 63ch; margin: 0 0 1.25rem; color: var(--ink); font-size: clamp(1.03rem, 1.4vw, 1.075rem); line-height: 1.85; }
  p:first-child { color: var(--ink-strong); }
  p:last-child { margin-bottom: 0; }
`

const TableOfContents = styled.nav`
  grid-column: 2;
  grid-row: 1;
  position: sticky;
  top: 6.5rem;
  margin-top: 2.4rem;
  padding-left: 0;

  h2 {
    margin: 0 0 0.85rem;
    color: var(--ink-strong);
    font-size: 0.84rem;
    letter-spacing: -0.01em;
  }

  ol { display: grid; gap: 0.85rem; margin: 0; padding: 0; list-style: none; }
  li { margin: 0; }
  a {
    position: relative;
    display: block;
    padding: 0;
    color: var(--ink-muted);
    font-size: 0.76rem;
    line-height: 1.45;
    text-decoration: none;
    transition: color 160ms ease;
  }
  a:hover, a:focus-visible, a[aria-current="location"] { color: var(--dusk-deep); }
  a[aria-current="location"] { font-weight: 700; text-decoration: underline; text-decoration-color: var(--dusk); text-decoration-thickness: 2px; text-underline-offset: 5px; }
  a:focus-visible { outline: 2px solid var(--dusk); outline-offset: 3px; border-radius: 2px; }

  @media (max-width: 1099px) {
    grid-column: auto;
    grid-row: auto;
    position: static;
    margin: 2rem 0 0;
    padding: 0;
    overflow-x: auto;
    border-left: 0;
    scrollbar-width: thin;

    h2 { margin-bottom: 0.65rem; }
    ol { display: flex; width: max-content; min-width: 100%; gap: 1.25rem; }
    a {
      display: flex;
      min-height: 44px;
      align-items: center;
      padding: 0.5rem 0;
      white-space: nowrap;
    }
  }
`

const Section = styled.section`
  scroll-margin-top: 6.5rem;
  padding: 2.3rem 0;
  border-bottom: ${props => props.$result ? "0" : "1px solid color-mix(in srgb, var(--line) 58%, transparent)"};
  ${props => props.$result && `
    margin: 1.2rem 0;
    padding: 1.8rem;
    border-left: 4px solid var(--dusk);
    background: var(--paper-raised);
  `}

  h2 { margin: 0 0 1.15rem; color: var(--ink-strong); font-size: clamp(1.45rem, 3vw, 1.8rem); letter-spacing: -0.035em; }
  p { max-width: 63ch; margin: 0 0 1.25rem; color: var(--ink); font-size: clamp(1.03rem, 1.4vw, 1.075rem); line-height: 1.85; }
  p:first-of-type { color: var(--ink-strong); }
  p:last-child { margin-bottom: 0; }
  strong { color: var(--ink-strong); font-weight: 750; }

  @media (max-width: 620px) { padding: 1.8rem 0; }
`

const renderInline = (text, emphasis = []) => {
  const escaped = emphasis
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(\\*\\*[^*]+\\*\\*${escaped.length ? `|${escaped.join("|")}` : ""})`, "g")

  return text.split(pattern).filter(Boolean).map((part, index) => {
    const markdownStrong = part.startsWith("**") && part.endsWith("**")
    const selectedStrong = emphasis.includes(part)
    return markdownStrong || selectedStrong
      ? <strong key={`${part}-${index}`}>{markdownStrong ? part.slice(2, -2) : part}</strong>
      : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
  })
}

const ResultTableWrap = styled.div`
  max-width: 100%;
  margin: 1.35rem 0 0;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);

  &:focus-visible { outline: 3px solid var(--dusk); outline-offset: 3px; }

  table { width: 100%; border-collapse: collapse; min-width: 620px; font-size: 0.84rem; }
  caption { padding: 0.85rem 1rem; color: var(--ink-strong); font-weight: 750; text-align: left; border-bottom: 1px solid var(--line); }
  th, td { padding: 0.75rem 0.85rem; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
  th { color: var(--ink-strong); background: var(--surface); }
  td { color: var(--ink); }
  tbody tr:last-child td { border-bottom: 0; }
`

const FooterNav = styled.nav`
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;

  a { min-height: 44px; display: inline-flex; align-items: center; color: var(--ink-muted); font-size: 0.8rem; }
`

const WorkDetailTemplate = ({ pageContext, location }) => {
  const project = projects.find(item => item.slug === pageContext.slug)
  const story = project?.story || (project ? [
    { title: "문제의 시작", paragraphs: [project.problem] },
    { title: "설계 선택", paragraphs: [project.decision] },
    { title: "실패를 막는 장치", paragraphs: [project.reliability] },
    { title: "검증", paragraphs: [project.validation] },
    { title: "결과와 배운 점", paragraphs: [project.outcome] },
  ] : [])
  const opening = project?.opening || (project ? [project.context] : [])
  const sectionIds = story.map((_, index) => `section-${index + 1}`)
  const [activeSection, setActiveSection] = React.useState(sectionIds[0])

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined
    const elements = sectionIds.map(id => document.getElementById(id)).filter(Boolean)
    let frame = null
    const calculateActiveSection = () => {
      frame = null
      if (!elements.length) return
      const activationLine = window.innerHeight * 0.5
      let current = elements[0].id
      elements.forEach(element => {
        if (element.getBoundingClientRect().top <= activationLine) current = element.id
      })
      setActiveSection(current)
    }
    const scheduleActiveSection = () => {
      if (frame === null) frame = window.requestAnimationFrame(calculateActiveSection)
    }
    scheduleActiveSection()
    window.addEventListener("scroll", scheduleActiveSection, { passive: true })
    window.addEventListener("resize", scheduleActiveSection)
    window.addEventListener("hashchange", scheduleActiveSection)
    return () => {
      window.removeEventListener("scroll", scheduleActiveSection)
      window.removeEventListener("resize", scheduleActiveSection)
      window.removeEventListener("hashchange", scheduleActiveSection)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [project?.slug])

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined
    const initialId = decodeURIComponent(window.location.hash.replace(/^#/, ""))
    if (!sectionIds.includes(initialId)) return undefined
    const target = document.getElementById(initialId)
    const narrative = target?.parentElement
    if (!target || !narrative) return undefined

    let active = true
    let frame = null
    const alignTarget = () => {
      frame = null
      if (!active || window.location.hash !== `#${initialId}`) return
      const root = document.documentElement
      const previousBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = "auto"
      window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top - 112)
      root.style.scrollBehavior = previousBehavior
      setActiveSection(initialId)
    }
    const scheduleAlignment = () => {
      if (active && frame === null) frame = window.requestAnimationFrame(alignTarget)
    }
    const cancelAlignment = () => { active = false }
    const cancelOnKey = event => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelAlignment()
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleAlignment)
    observer?.observe(narrative)
    window.addEventListener("load", scheduleAlignment)
    window.addEventListener("wheel", cancelAlignment, { passive: true })
    window.addEventListener("touchstart", cancelAlignment, { passive: true })
    window.addEventListener("pointerdown", cancelAlignment, { passive: true })
    window.addEventListener("keydown", cancelOnKey)
    document.fonts?.ready.then(scheduleAlignment)
    scheduleAlignment()
    const timeout = window.setTimeout(() => {
      scheduleAlignment()
      window.requestAnimationFrame(() => { active = false })
    }, 5000)

    return () => {
      active = false
      observer?.disconnect()
      window.clearTimeout(timeout)
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener("load", scheduleAlignment)
      window.removeEventListener("wheel", cancelAlignment)
      window.removeEventListener("touchstart", cancelAlignment)
      window.removeEventListener("pointerdown", cancelAlignment)
      window.removeEventListener("keydown", cancelOnKey)
    }
  }, [project?.slug])

  const handleTocClick = id => {
    setActiveSection(id)
  }

  if (!project) return null

  return (
    <Layout location={location} title="GoToBill" variant="wide">
      <Article>
        <BackLink to="/resume/"><span aria-hidden="true">←</span> 이력으로 돌아가기</BackLink>
        <Header>
          <Title>{project.title}</Title>
          {project.headline && <Headline>{project.headline}</Headline>}
          <Summary>{project.summary}</Summary>
          <Stack aria-label="기술 스택">{project.stack.map(item => <li key={item}>{item}</li>)}</Stack>
        </Header>
        <ReadingLayout>
          <TableOfContents aria-label="이 글의 흐름">
            <h2>목차</h2>
            <ol>{story.map((section, index) => (
              <li key={section.title}>
                <a href={`#${sectionIds[index]}`} onClick={() => handleTocClick(sectionIds[index])} aria-current={activeSection === sectionIds[index] ? "location" : undefined}>
                  {section.title}
                </a>
              </li>
            ))}</ol>
          </TableOfContents>
          <Narrative>
            <Opening>{opening.map(paragraph => <p key={paragraph}>{renderInline(paragraph)}</p>)}</Opening>
            {story.map((section, sectionIndex) => {
            const diagrams = section.diagrams || (section.title === "설계 선택" && project.diagram ? [project.diagram] : [])
            const isResult = /결과/.test(section.title)
            return (
              <Section id={sectionIds[sectionIndex]} key={section.title} $result={isResult}>
                <h2>{section.title}</h2>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{renderInline(paragraph)}</p>)}
                {section.table && (
                  <ResultTableWrap tabIndex="0" role="region" aria-label={`${section.table.caption}, 좌우로 스크롤 가능`}>
                    <table>
                      <caption>{section.table.caption}</caption>
                      <thead><tr>{section.table.headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
                      <tbody>{section.table.rows.map((row, rowIndex) => <tr key={`${section.title}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
                    </table>
                  </ResultTableWrap>
                )}
                {diagrams.map(diagram => <ArchitectureDiagram key={diagram.title} diagram={diagram} />)}
              </Section>
            )
            })}
          </Narrative>
        </ReadingLayout>
        <FooterNav aria-label="작업 상세 탐색">
          <Link to="/resume/">← 이력</Link>
          <Link to="/writing/">기록 →</Link>
        </FooterNav>
      </Article>
    </Layout>
  )
}

export default WorkDetailTemplate

export const Head = ({ pageContext }) => {
  const project = projects.find(item => item.slug === pageContext.slug)
  if (!project) return null
  return <Seo title={project.title} description={project.summary} pathname={`/work/${project.slug}/`} />
}
