import * as React from "react"
import { Link, graphql } from "gatsby"
import styled from 'styled-components'

import Bio from "../components/bio"
import Layout from "../components/layout"
import Seo from "../components/seo"
import TableOfContents from "../components/TableOfContents"
import "../styles/blog-post-v2.css"

const PageWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const PostContainer = styled.div`
  width: 100%;
`;

const TOCWrapper = styled.aside``;

const PostHeader = styled.header`
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #E8F2FF;
`;

const PostTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #667eea 0%, #3182F6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #64748b;
  font-size: 0.95rem;
`;

const PostDate = styled.time`
  font-weight: 500;
`;

const ReadingTime = styled.span`
  &::before {
    content: "•";
    margin-right: 0.5rem;
  }
`;

const PostContent = styled.section`
  font-size: 1.125rem;
  line-height: 1.8;
  color: #334155;

  h1, h2, h3, h4, h5, h6 {
    scroll-margin-top: 100px;
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-weight: 700;
    line-height: 1.3;
  }

  h2 {
    font-size: 1.75rem;
    color: #1e293b;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    font-size: 1.375rem;
    color: #334155;
  }

  p {
    margin: 1.5rem 0;
  }

  a {
    color: #3182F6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-bottom 0.2s ease;

    &:hover {
      border-bottom: 1px solid #3182F6;
    }
  }

  ul, ol {
    margin: 1.5rem 0;
    padding-left: 2rem;
  }

  li {
    margin: 0.5rem 0;
  }

  code {
    background: #f1f5f9;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
    color: #e11d48;
  }

  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 2rem 0;

    code {
      background: none;
      color: inherit;
      padding: 0;
    }
  }

  /* blockquote 스타일은 blog-post-v2.css에서 처리 */

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 2rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
    }
  }
`;

const NavSection = styled.nav`
  margin-top: -4rem;
  padding-top: 2rem;
  border-top: 2px solid #E8F2FF;
`;

const NavList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 2rem;
`;

const NavItem = styled.li`
  flex: 1;
`;

const NavLink = styled(Link)`
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #3182F6;
    background: #ffffff;
  }
`;

const NavLabel = styled.span`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
`;

const NavTitle = styled.span`
  font-size: 1.125rem;
  color: #1e293b;
  font-weight: 600;
`;

const BlogPostTemplate = ({
  data: { previous, next, site, markdownRemark: post },
  location,
}) => {
  const siteTitle = site.siteMetadata?.title || `Title`
  const readingTime = Math.ceil(post.wordCount?.words / 200) || 5

  return (
    <Layout location={location} title={siteTitle}>
      <PageWrapper>
        <PostContainer>
          <article
            className="blog-post"
            itemScope
            itemType="http://schema.org/Article"
          >
            <PostHeader>
              <PostTitle itemProp="headline">{post.frontmatter.title}</PostTitle>
              <PostMeta>
                <PostDate>{post.frontmatter.date}</PostDate>
                <ReadingTime>{readingTime} min read</ReadingTime>
              </PostMeta>
            </PostHeader>
            <PostContent
              className="blog-post-content"
              dangerouslySetInnerHTML={{ __html: post.html }}
              itemProp="articleBody"
            />
            <hr style={{ marginTop: '2rem', marginBottom: '0rem', border: '0', borderTop: '1px solid #E8F2FF' }} />
            <footer>
              <Bio />
            </footer>
          </article>
          <NavSection className="blog-post-nav">
            <NavList>
              {previous && (
                <NavItem>
                  <NavLink to={previous.fields.slug} rel="prev">
                    <NavLabel>← 이전 글</NavLabel>
                    <NavTitle>{previous.frontmatter.title}</NavTitle>
                  </NavLink>
                </NavItem>
              )}
              {next && (
                <NavItem>
                  <NavLink to={next.fields.slug} rel="next">
                    <NavLabel>다음 글 →</NavLabel>
                    <NavTitle>{next.frontmatter.title}</NavTitle>
                  </NavLink>
                </NavItem>
              )}
            </NavList>
          </NavSection>
        </PostContainer>
      </PageWrapper>
      <TOCWrapper>
        <TableOfContents />
      </TOCWrapper>
    </Layout>
  )
}

export const Head = ({ data: { markdownRemark: post } }) => {
  return (
    <Seo
      title={post.frontmatter.title}
      description={post.frontmatter.description || post.excerpt}
    />
  )
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug(
    $id: String!
    $previousPostId: String
    $nextPostId: String
  ) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(id: { eq: $id }) {
      id
      excerpt(pruneLength: 160)
      html
      wordCount {
        words
      }
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        description
      }
    }
    previous: markdownRemark(id: { eq: $previousPostId }) {
      fields {
        slug
      }
      frontmatter {
        title
      }
    }
    next: markdownRemark(id: { eq: $nextPostId }) {
      fields {
        slug
      }
      frontmatter {
        title
      }
    }
  }
`