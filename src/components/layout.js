import * as React from "react"
import { Link } from "gatsby"
import styled from "styled-components"
import GlobalStyle from "../styles/GlobalStyle"
import DarkModeToggle from "./DarkModeToggle"

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  padding: 2rem 0;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const SiteTitle = styled.h1`
  font-size: ${props => props.isRoot ? '2.5rem' : '1.5rem'};
  margin: 0;
  
  a {
    color: var(--color-text);
    text-decoration: none;
    font-weight: 900;
    background: linear-gradient(135deg, #3182F6 0%, #0066FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    &:hover {
      opacity: 0.8;
    }
  }
`;

const Main = styled.main`
  flex: 1;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 3rem 1.5rem;
  width: 100%;
`;

const Footer = styled.footer`
  padding: 2rem 0;
  text-align: center;
  color: var(--color-text-light);
  font-size: 0.875rem;
  border-top: 1px solid var(--color-border);
  
  a {
    color: var(--color-text-light);
    &:hover {
      color: var(--color-primary);
    }
  }
`;

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  const isRootPath = location.pathname === rootPath

  return (
    <>
      <GlobalStyle />
      <Wrapper>
        <Header>
          <HeaderContent>
            <SiteTitle isRoot={isRootPath}>
              <Link to="/">{title}</Link>
            </SiteTitle>
          </HeaderContent>
        </Header>
        <Main>{children}</Main>
        <Footer>
          © {new Date().getFullYear()} {title}. Built with
          {` `}
          <a href="https://www.gatsbyjs.com">Gatsby</a>
        </Footer>
        <DarkModeToggle />
      </Wrapper>
    </>
  )
}

export default Layout