import * as React from "react"
import { graphql } from "gatsby"
import styled from "styled-components"
import Layout from "../components/layout"
import Seo from "../components/seo"
import WritingArchive from "../components/WritingArchive"

const Header = styled.header`
  padding: 1.25rem 0 2.35rem;
  border-bottom: 1px solid var(--line);

  @media (max-width: 720px) { padding: 0.75rem 0 1.85rem; }
`

const Heading = styled.div`
  h1 { margin: 0; font-size: clamp(2.15rem, 4vw, 3.65rem); line-height: 1.05; letter-spacing: -0.06em; }
  p { max-width: 58ch; margin: 0.85rem 0 0; color: var(--ink-muted); font-size: 0.98rem; line-height: 1.65; }
`

const WritingPage = ({ data, location }) => {
  const title = data.site.siteMetadata?.title || "GoToBill"
  const posts = data.allMarkdownRemark.nodes

  return (
    <Layout location={location} title={title} variant="wide">
      <Header>
        <Heading>
          <h1>기록 보관소</h1>
          <p>Java, 데이터베이스, 네트워크와 운영 환경에서 배운 내용을 정리합니다.</p>
        </Heading>
      </Header>
      <WritingArchive posts={posts} />
    </Layout>
  )
}

export default WritingPage

export const Head = () => (
  <Seo
    title="기술 기록"
    description="Java, 데이터베이스, 네트워크와 백엔드 운영 경험을 정리한 주병주의 기술 아카이브입니다."
    pathname="/writing/"
  />
)

export const pageQuery = graphql`
  {
    site { siteMetadata { title } }
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        excerpt(pruneLength: 150)
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
