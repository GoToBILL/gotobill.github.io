/**
 * Bio component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/how-to/querying-data/use-static-query/
 */

import * as React from "react"
import { useStaticQuery, graphql } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"

const Bio = () => {
  const data = useStaticQuery(graphql`
    query BioQuery {
      site {
        siteMetadata {
          author {
            name
            summary
          }
          social {
            twitter
          }
        }
      }
    }
  `)

  // Set these values by editing "siteMetadata" in gatsby-config.js
  const author = data.site.siteMetadata?.author
  const social = data.site.siteMetadata?.social

  return (
    <div className="bio">
      <StaticImage
        className="bio-avatar"
        layout="fixed"
        formats={["auto", "webp", "avif"]}
        src="../images/ju.jpg"
        width={50}
        height={50}
        quality={95}
        alt="Profile picture"
      />
      {author?.name && (
        <div>
          <p>
            Written by <strong>{author.name}</strong>
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
            JVM, Java, 성능 최적화 등 개발 이야기를 다루는 기술 블로그
          </p>
          {social?.github && (
            <a 
              href={`https://github.com/${social.github}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: '0.5rem', display: 'inline-block' }}
            >
              GitHub @{social.github}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default Bio
