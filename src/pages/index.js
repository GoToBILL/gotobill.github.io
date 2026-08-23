import * as React from "react"
import { graphql, Link } from "gatsby"
import styled from "styled-components"
import Layout from "../components/layout"
import Seo from "../components/seo"
import AnimatedPostCard from "../components/AnimatedPostCard"

const Intro = styled.header`
  position: relative;
  height: clamp(500px, 59vh, 590px);
  display: flex;
  align-items: flex-start;
  overflow: hidden;
  border-radius: 2px;
  isolation: isolate;
  background: #ffffff;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(90deg, #ffffff 0%, #ffffff 50%, rgba(255, 255, 255, 0.92) 58%, rgba(255, 255, 255, 0.78) 66%, rgba(255, 255, 255, 0.6) 74%, rgba(255, 255, 255, 0.42) 82%, rgba(255, 255, 255, 0.25) 89%, rgba(255, 255, 255, 0.1) 95%, rgba(255, 255, 255, 0) 100%);
  }

  html[data-theme="dark"] &::after {
    background:
      linear-gradient(90deg, #0b0d0f 0%, #0b0d0f 50%, rgba(11, 13, 15, 0.92) 58%, rgba(11, 13, 15, 0.78) 66%, rgba(11, 13, 15, 0.6) 74%, rgba(11, 13, 15, 0.42) 82%, rgba(11, 13, 15, 0.25) 89%, rgba(11, 13, 15, 0.1) 95%, rgba(11, 13, 15, 0) 100%);
  }

  @media (max-width: 960px) {
    height: auto;
    min-height: 0;
    display: grid;
    background: transparent;
    overflow: visible;
    &::after { display: none; }
    html[data-theme="dark"] &::after { display: none; }
  }
`

const HeroMedia = styled.picture`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 52%;
  z-index: -2;
  overflow: hidden;

  img { width: 124%; max-width: none; height: 100%; object-fit: cover; object-position: 50% 58%; }

  @media (max-width: 960px) {
    position: relative;
    inset: auto;
    z-index: 0;
    display: block;
    width: 100%;
    max-width: 620px;
    height: clamp(350px, 58vw, 460px);
    margin: 2rem auto 0;
    overflow: hidden;
    img { position: absolute; inset: 0; width: 100%; max-width: 100%; object-position: 50% 64%; }
  }
`

const HeroCopy = styled.div`
  position: relative;
  z-index: 1;
  width: 72%;
  max-width: 900px;
  padding: clamp(2rem, 3.3vw, 3rem) 0;

  @media (max-width: 960px) { width: 100%; padding: 2.5rem 0 0; }
`

const Title = styled.h1`
  max-width: 15ch;
  margin: 0;
  color: #111318;
  font-size: clamp(2.7rem, 4.1vw, 4.6rem);
  line-height: 1.05;
  letter-spacing: -0.06em;

  span { display: block; }
  @media (min-width: 961px) { span { display: block; white-space: nowrap; } }

  @media (max-width: 960px) { color: var(--ink-strong); font-size: clamp(2.35rem, 12vw, 3.5rem); }
  html[data-theme="dark"] & { color: #f6f7f8; }
`

const Description = styled.div`
  max-width: 50rem;
  margin: 1rem 0 0;
  color: #2e3338;
  font-size: clamp(1rem, 1.2vw, 1.05rem);
  line-height: 1.7;

  p {
    margin: 0;
    word-break: keep-all;
    overflow-wrap: break-word;
    text-wrap: pretty;
  }
  p + p { margin-top: 1rem; }

  @media (max-width: 960px) { max-width: 62ch; color: var(--ink); }
  html[data-theme="dark"] & { color: #d7dadd; }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 1.25rem;
`

const ActionLink = styled(Link)`
  min-height: 46px;
  padding: 0.65rem 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  color: #111318;
  text-decoration: none;
  font-weight: 700;

  &:first-child { background: #111318; color: #ffffff; }
  &:last-child { min-height: 40px; padding-inline: 0.2rem; text-decoration: underline; text-decoration-color: var(--dusk); text-underline-offset: 0.35em; }
  &:hover { color: var(--dusk-deep); }
  &:first-child:hover { background: #2e3338; color: #ffffff; }

  @media (max-width: 960px) {
    color: var(--ink-strong);
    &:first-child { background: var(--ink-strong); color: var(--paper-raised); }
  }

  html[data-theme="dark"] & { color: #f6f7f8; }
  html[data-theme="dark"] &:first-child { border: 1px solid rgba(255, 255, 255, 0.28); background: #111318; color: #ffffff; }
`

const Recent = styled.section`
  padding: 4.25rem 0 1rem;
`

const SectionHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  margin-bottom: 1.4rem;

  h2 { margin: 0; font-size: clamp(1.65rem, 3vw, 2.4rem); }
  a { min-height: 44px; display: inline-flex; align-items: center; color: var(--ink-muted); font-size: 0.84rem; }
`

const HomePage = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata?.title || "GoToBill"
  const featuredPosts = data.allMarkdownRemark.nodes.slice(0, 3)

  return (
    <Layout location={location} title={siteTitle} variant="wide" compact>
      <Intro>
        <HeroCopy>
          <Title><span>최고의 기술보다</span><span>최적의 기술을 고민합니다.</span></Title>
          <Description>
            <p>무조건 최신 기술을 도입하는 것이 능사는 아니라고 생각합니다. 비용과 운영 리소스를 고려해 Redis 같은 고비용 해법보다 기존 RDB 구조 개선이 더 합리적이라면, 비용 효율적인 아키텍처를 선택합니다.</p>
            <p>기술적 화려함보다 주어진 환경에서 최소한의 리소스로 최대의 성능을 이끌어 내는 현실적인 판단을 중요하게 생각합니다.</p>
          </Description>
          <Actions>
            <ActionLink to="/resume/">이력 보기 <span aria-hidden="true">→</span></ActionLink>
            <ActionLink to="/writing/">기록</ActionLink>
          </Actions>
        </HeroCopy>
        <HeroMedia>
          <source media="(max-width: 960px)" srcSet="/images/ju-portrait-900.webp" type="image/webp" />
          <source srcSet="/images/ju-portrait-2200.webp" type="image/webp" />
          <img src="/images/ju-portrait-1800.jpg" alt="해질녘 광안대교 앞 바닷가에 선 주병주" width="1350" height="1800" fetchPriority="high" />
        </HeroMedia>
      </Intro>

      <Recent aria-labelledby="recent-title">
        <SectionHead>
          <h2 id="recent-title">최근 기록</h2>
          <Link to="/writing/">전체 기록 보기 <span aria-hidden="true">→</span></Link>
        </SectionHead>
        {featuredPosts.map((post, index) => <AnimatedPostCard key={post.fields.slug} post={post} index={index} />)}
      </Recent>
    </Layout>
  )
}

export default HomePage

export const Head = () => (
  <Seo
    title="주병주 · 백엔드 개발자"
    description="복잡한 비즈니스 규칙과 데이터 흐름을 명확한 구조로 바꾸고 실패를 가정해 검증하는 백엔드 개발자 주병주의 포트폴리오입니다."
    pathname="/"
  />
)

export const pageQuery = graphql`
  {
    site { siteMetadata { title } }
    allMarkdownRemark(sort: [{ frontmatter: { date: DESC } }, { frontmatter: { title: ASC } }]) {
      nodes {
        excerpt(pruneLength: 140)
        fields { slug }
        frontmatter {
          date(formatString: "YYYY.MM.DD")
          title
          description
          category
          tags
        }
        wordCount { words }
      }
    }
  }
`
