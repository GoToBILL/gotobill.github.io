// custom typefaces
import "@fontsource-variable/montserrat"
import "@fontsource/merriweather"

// KaTeX styles for math formulas
import "katex/dist/katex.min.css"

// normalize CSS across browsers
import "./src/normalize.css"
// custom CSS styles
import "./src/style.css"

// Highlighting for code blocks - using Tomorrow Night theme
import "prismjs/themes/prism-tomorrow.css"
import "prismjs/plugins/line-numbers/prism-line-numbers.css"

// Add copy button to code blocks (React는 브라우저 환경에서 사용되지 않음)

// Google Tag Manager
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
}

export const wrapRootElement = ({ element }) => {
  return element
}

export const onRouteUpdate = () => {
  // Add copy buttons to all code blocks after page loads
  setTimeout(() => {
    const codeBlocks = document.querySelectorAll('pre')
    codeBlocks.forEach(block => {
      if (!block.parentElement.classList.contains('code-block-wrapper')) {
        const wrapper = document.createElement('div')
        wrapper.className = 'code-block-wrapper'
        wrapper.style.position = 'relative'
        wrapper.style.margin = '1.5rem 0'
        
        const button = document.createElement('button')
        button.textContent = '복사'
        button.className = 'copy-button'
        button.style.cssText = `
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: #9CA3AF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        `
        
        button.addEventListener('click', () => {
          const code = block.querySelector('code')
          const text = code ? code.textContent : block.textContent
          
          navigator.clipboard.writeText(text).then(() => {
            button.textContent = '복사됨!'
            button.style.background = '#3B82F6'
            button.style.color = 'white'
            button.style.borderColor = '#3B82F6'
            
            setTimeout(() => {
              button.textContent = '복사'
              button.style.background = 'rgba(255, 255, 255, 0.1)'
              button.style.color = '#9CA3AF'
              button.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }, 2000)
          })
        })
        
        block.parentNode.insertBefore(wrapper, block)
        wrapper.appendChild(block)
        wrapper.appendChild(button)
      }
    })
  }, 100)
}
