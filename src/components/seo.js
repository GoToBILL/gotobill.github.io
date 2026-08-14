import * as React from "react"
import { graphql, useStaticQuery } from "gatsby"

const Seo = ({ description, title, image, article = false, pathname = "/", structuredData, children }) => {
  const { site } = useStaticQuery(graphql`
    query SeoMetadata {
      site {
        siteMetadata {
          title
          description
          siteUrl
          author { name summary }
          social { github }
        }
      }
    }
  `)

  const metadata = site.siteMetadata
  const metaDescription = description || metadata.description
  const defaultTitle = metadata.title
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  const canonicalUrl = `${metadata.siteUrl}${normalizedPath}`
  const ogImage = image
    ? (image.startsWith("http") ? image : `${metadata.siteUrl}${image.startsWith("/") ? image : `/${image}`}`)
    : `${metadata.siteUrl}/icons/icon-512x512.png`
  const pageTitle = defaultTitle && title !== defaultTitle ? `${title} | ${defaultTitle}` : title
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": article ? "BlogPosting" : "WebSite",
    headline: title,
    name: title,
    description: metaDescription,
    author: { "@type": "Person", name: metadata.author?.name },
    publisher: { "@type": "Person", name: metadata.author?.name },
    url: canonicalUrl,
  }
  const schemas = structuredData || defaultStructuredData

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="author" content={metadata.author?.name} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={article ? "article" : "website"} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={defaultTitle} />
      <meta property="og:locale" content="ko_KR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="canonical" href={canonicalUrl} />
      {(Array.isArray(schemas) ? schemas : [schemas]).map((schema, index) => (
        <script type="application/ld+json" key={`structured-data-${index}`}>{JSON.stringify(schema)}</script>
      ))}
      {children}
    </>
  )
}

export default Seo
