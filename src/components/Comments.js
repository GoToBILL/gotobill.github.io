import React, { useEffect } from 'react'
import styled from 'styled-components'

const CommentsContainer = styled.div`
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
`;

const Comments = () => {
  useEffect(() => {
    const script = document.createElement('script')
    const anchor = document.getElementById('comments-anchor')
    
    script.setAttribute('src', 'https://giscus.app/client.js')
    script.setAttribute('data-repo', 'gotobill/gotobill.github.io')
    script.setAttribute('data-repo-id', 'YOUR_REPO_ID') // GitHub에서 설정 필요
    script.setAttribute('data-category', 'Announcements')
    script.setAttribute('data-category-id', 'YOUR_CATEGORY_ID') // GitHub에서 설정 필요
    script.setAttribute('data-mapping', 'pathname')
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-theme', 'preferred_color_scheme')
    script.setAttribute('data-lang', 'ko')
    script.setAttribute('data-loading', 'lazy')
    script.setAttribute('crossorigin', 'anonymous')
    script.async = true
    
    if (anchor) {
      anchor.appendChild(script)
    }
    
    return () => {
      if (anchor) {
        anchor.innerHTML = ''
      }
    }
  }, [])
  
  return (
    <CommentsContainer>
      <h2>댓글</h2>
      <div id="comments-anchor" />
    </CommentsContainer>
  )
}

export default Comments