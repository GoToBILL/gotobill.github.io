import * as React from "react"
import { useEffect, useState } from "react"
import { Link } from "gatsby"
import styled from "styled-components"
import GlobalStyle from "../styles/GlobalStyle"

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

const SkipLink = styled.a`
  position: fixed;
  top: 0.5rem;
  left: 0.75rem;
  z-index: 1000;
  padding: 0.7rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--ink-strong);
  color: var(--paper);
  transform: translateY(-160%);

  &:focus { transform: translateY(0); }
`

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  min-height: var(--header-height);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 76%, transparent);
  background: color-mix(in srgb, var(--paper) 88%, transparent);
  backdrop-filter: blur(18px) saturate(125%);
`

const HeaderContent = styled.div`
  width: min(calc(100% - 3rem), var(--max-width));
  min-height: var(--header-height);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;

  @media (max-width: 720px) { width: min(calc(100% - 2rem), var(--max-width)); }
`

const Brand = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--ink-strong);
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  white-space: nowrap;

  &::before {
    content: "";
    width: 10px;
    height: 10px;
    border: 0;
    border-radius: 2px 8px 2px 8px;
    background: var(--dusk);
    transform: rotate(-8deg);
  }
`

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.65rem;

  @media (max-width: 720px) { display: none; }
`

const NavLink = styled(Link)`
  min-height: 44px;
  position: relative;
  padding: 0 0.35rem;
  display: inline-flex;
  align-items: center;
  color: var(--ink-muted);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 650;

  &::after { content: ""; position: absolute; left: 0.35rem; right: 0.35rem; bottom: 5px; height: 2px; background: var(--dusk); transform: scaleX(0); transform-origin: left; transition: transform 160ms ease; }
  &:hover { color: var(--ink-strong); }
  &:hover::after, &[aria-current="page"]::after { transform: scaleX(1); }
  &[aria-current="page"] { color: var(--ink-strong); }
`

const ExternalNavLink = styled.a`
  min-height: 44px;
  padding: 0 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ink-muted);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 650;

  &:hover { color: var(--ink-strong); text-decoration-color: var(--dusk); }
`

const DesktopControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;

  @media (max-width: 720px) { display: none; }
`

const MobileControls = styled.div`
  display: none;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 720px) { display: flex; }
`

const MenuButton = styled.button`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--paper-raised);
  cursor: pointer;

  svg { width: 20px; height: 20px; }
`

const MobilePanel = styled.nav`
  display: none;

  @media (max-width: 720px) {
    display: ${props => props.$open ? "grid" : "none"};
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    width: min(calc(100% - 2rem), var(--max-width));
    margin: 0 auto 0.8rem;
    padding: 0.65rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--paper-raised);
    box-shadow: var(--shadow);

    ${NavLink}, ${ExternalNavLink} {
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
    }
  }
`

const Main = styled.main`
  flex: 1;
  width: min(calc(100% - 3rem), ${props => props.$wide ? "var(--max-width)" : "var(--prose-width)"});
  margin: 0 auto;
  padding: ${props => props.$compact ? "1.25rem" : "4.5rem"} 0 6rem;

  @media (max-width: 720px) {
    width: min(calc(100% - 2rem), ${props => props.$wide ? "var(--max-width)" : "var(--prose-width)"});
    padding-top: ${props => props.$compact ? "0" : "2.75rem"};
    padding-bottom: 4rem;
  }
`

const Footer = styled.footer`
  width: min(calc(100% - 3rem), var(--max-width));
  margin: 0 auto;
  padding: 2rem 0 2.5rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--line);
  color: var(--ink-muted);
  font-size: 0.82rem;

  p { margin: 0; }
  @media (max-width: 600px) { width: calc(100% - 2rem); flex-direction: column; }
`

const Layout = ({ location, title, children, variant = "prose", compact = false }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [location?.pathname])
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme")
    window.localStorage.removeItem("theme")
  }, [])

  const navItems = (
    <>
      <NavLink to="/" activeClassName="active">홈</NavLink>
      <NavLink to="/resume/" activeClassName="active">이력</NavLink>
      <NavLink to="/writing/" activeClassName="active">기록</NavLink>
      <ExternalNavLink href="https://github.com/gotobill" target="_blank" rel="noreferrer">
        GitHub <span aria-hidden="true">↗</span>
      </ExternalNavLink>
    </>
  )

  return (
    <>
      <GlobalStyle />
      <Wrapper>
        <SkipLink href="#main-content">본문으로 건너뛰기</SkipLink>
        <Header>
          <HeaderContent>
            <Brand to="/" aria-label={`${title} 홈`}>GoToBill</Brand>
            <DesktopControls>
              <DesktopNav aria-label="주요 탐색">{navItems}</DesktopNav>
            </DesktopControls>
            <MobileControls>
              <MenuButton
                type="button"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
                onClick={() => setMenuOpen(value => !value)}
              >
                {menuOpen ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                )}
              </MenuButton>
            </MobileControls>
          </HeaderContent>
          <MobilePanel id="mobile-navigation" aria-label="모바일 탐색" $open={menuOpen}>{navItems}</MobilePanel>
        </Header>
        <Main id="main-content" $wide={variant === "wide"} $compact={compact}>{children}</Main>
        <Footer>
          <p>© {new Date().getFullYear()} 주병주</p>
          <p>관찰하고, 기록하고, 더 단단하게 만듭니다.</p>
        </Footer>
      </Wrapper>
    </>
  )
}

export default Layout
