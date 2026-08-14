import * as React from "react"
import { Link } from "gatsby"
import styled from "styled-components"
import Layout from "../components/layout"
import Seo from "../components/seo"
import {
  activities,
  awards,
  career,
  companyProjects,
  oss,
  profile,
  selectedProjects,
  skillGroups,
} from "../data/resume"

const ResumeSheet = styled.div`
  width: min(100%, 1060px);
  margin: 0 auto;
`

const Profile = styled.header`
  position: relative;
  min-height: clamp(15.5rem, 24vw, 18.5rem);
  padding: 2rem clamp(12rem, 26vw, 18rem) 3.25rem 0;
  border-bottom: 1px solid var(--line-strong);
  overflow: hidden;

  @media (max-width: 720px) {
    min-height: 0;
    padding: 1.25rem 0 2.5rem;
  }
`

const ProfileVisual = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  width: clamp(10.75rem, 17vw, 14.25rem);
  height: 100%;
  display: flex;
  align-items: end;
  justify-content: end;
  pointer-events: none;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center bottom;
  }

  html[data-theme="dark"] & { display: none; }

  @media (max-width: 720px) { display: none; }
`

const Name = styled.h1`
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: -0.06em;
`

const ProfileMeta = styled.div`
  display: grid;
  gap: 0.25rem;
  margin-top: 1rem;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 650;
`

const ProfileLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1.15rem;

  a {
    min-height: 44px;
    padding: 0.5rem 0.8rem;
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--ink-strong);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 700;
  }
`

const Section = styled.section`
  padding: 3.25rem 0 0;
`

const Journey = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;

  li { --brand-color: var(--ink-strong); position: relative; padding: 1.2rem 1.4rem 1rem 0; border-top: 1px solid var(--dusk); }
  li[data-current="true"] { --brand-color: var(--dusk); border-top-color: var(--dusk); }
  li::before { content: ""; position: absolute; top: -5px; left: 0; width: 8px; height: 8px; border: 1px solid var(--dusk); border-radius: 50%; background: var(--paper); }
  li[data-current="true"]::before { top: -6px; width: 12px; height: 12px; border-color: var(--dusk); background: var(--dusk); box-shadow: 0 0 0 3px var(--paper), 0 0 0 5px var(--dusk); z-index: 2; }
  strong, span { display: block; }
  strong { color: var(--brand-color); font-size: 0.94rem; }
  .journey-role { margin-top: 0.18rem; color: var(--ink); font-size: 0.82rem; font-weight: 650; }
  time { display: block; margin-top: 0.35rem; color: var(--ink-muted); font: 600 0.75rem/1.5 "SFMono-Regular", Consolas, monospace; }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    padding-left: 1rem;
    border-left: 1px solid var(--dusk);
    li { padding: 0 0 1.6rem 1rem; border-top: 0; }
    li::before { top: 0.4rem; left: calc(-1rem - 5px); }
    li[data-current="true"] { border-top: 0; }
    li[data-current="true"]::before { top: 0.25rem; left: calc(-1rem - 7px); z-index: 1; }
  }
`

const CurrentSr = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const SectionHeading = styled.div`
  margin-bottom: 1rem;

  h2 { margin: 0; font-size: clamp(1.75rem, 2.3vw, 2rem); }
`

const OrganizationList = styled.ol`
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--line);
  list-style: none;
`

const Organization = styled.li`
  padding: 1.75rem 0;
  border-top: 1px solid var(--line);

  &:first-child { padding-top: 1rem; border-top: 0; }
`

const CurrentBadge = styled.span`
  display: inline-flex;
  width: fit-content;
  margin-bottom: 0.35rem;
  padding: 0.12rem 0.42rem;
  border-radius: 999px;
  background: var(--dusk-soft);
  color: var(--dusk-deep);
  font: 750 0.66rem/1.45 "SFMono-Regular", Consolas, monospace;
`

const OrganizationHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "identity meta";
  gap: 1.25rem 2rem;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    grid-template-areas: "identity" "meta";
    gap: 0.5rem;
  }
`

const OrganizationIdentity = styled.div`
  grid-area: identity;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.8rem 1.25rem;
  align-items: center;
`

const OrganizationLogo = styled.div`
  width: 92px;
  min-width: 92px;
  min-height: 54px;
  display: flex;
  align-items: center;

  img { width: auto; max-width: 92px; max-height: 52px; object-fit: contain; object-position: left center; border-radius: 0; box-sizing: border-box; }
  img.sejong { max-width: 54px; max-height: 54px; }
  img.sw-maestro { max-width: 92px; max-height: 52px; }
  img.likelion { max-width: 54px; max-height: 54px; }
  span { color: var(--ink-strong); font-size: 1.12rem; font-weight: 800; line-height: 1.25; }

  html[data-theme="dark"] & { padding: 0.35rem; border-radius: 4px; background: #fff; }

  @media (max-width: 720px) { width: 78px; min-width: 78px; }
`

const OrganizationDescriptor = styled.strong`
  color: var(--ink-strong);
  font-size: 1.08rem;
  line-height: 1.45;
  overflow-wrap: anywhere;

  @media (min-width: 721px) { white-space: nowrap; }
`

const RoleMeta = styled.div`
  grid-area: meta;
  min-width: 13rem;
  text-align: right;
  strong { display: block; color: var(--ink-strong); font-size: 1.03rem; }
  time { display: block; margin-top: 0.3rem; color: var(--ink); font: 650 0.875rem/1.5 "SFMono-Regular", Consolas, monospace; }

  @media (max-width: 720px) { min-width: 0; text-align: left; }
`

const GroupProjects = styled.div`
  display: grid;
  gap: 0.75rem;
  margin: 1.75rem 0 0 2rem;
  padding-left: 1.75rem;
  border-left: 2px solid var(--dusk-soft);

  @media (max-width: 720px) {
    margin-top: 1.5rem;
    margin-left: 0.5rem;
    padding-left: 1.25rem;
  }
`

const GroupProjectLink = styled(Link)`
  min-height: 60px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
  padding: 0.75rem 0;
  color: inherit;
  text-decoration: none;

  p { margin: 0; color: var(--ink); font-size: 0.94rem; line-height: 1.65; }
  > span { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--ink-muted); }

  &:hover { color: inherit; }
  &:hover > span { color: var(--signal); }
  &:hover > span { border-color: var(--signal); background: var(--signal-wash); }

  @media (max-width: 720px) {
    grid-template-columns: 1fr auto;
    gap: 0.8rem;
  }
`

const OrganizationRows = ({ items }) => (
  <OrganizationList>
    {items.map(organization => (
      <Organization key={organization.title} data-current={organization.current ? "true" : "false"}>
        <OrganizationHead>
          <OrganizationIdentity>
            <OrganizationLogo>
              {organization.logo && (
                <img
                  src={organization.logo}
                  alt={organization.logoAlt}
                  className={organization.logoClass}
                  onError={event => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false }}
                />
              )}
              <span hidden={Boolean(organization.logo)}>{organization.logoAlt}</span>
            </OrganizationLogo>
            {!organization.current && <OrganizationDescriptor>{organization.descriptor || organization.title}</OrganizationDescriptor>}
          </OrganizationIdentity>
          <RoleMeta>{organization.current && <CurrentBadge>현재</CurrentBadge>}<strong>{organization.role}</strong><time>{organization.current ? organization.period.replace("현재", "").trim() : organization.period}</time></RoleMeta>
        </OrganizationHead>
        {organization.projects.length > 0 && (
          <GroupProjects>
            {organization.projects.map(project => (
              <GroupProjectLink key={project.slug} to={`/work/${project.slug}/`} aria-label={`${project.title} 상세 보기`}>
                <p>{project.summary}</p><span aria-hidden="true">→</span>
              </GroupProjectLink>
            ))}
          </GroupProjects>
        )}
      </Organization>
    ))}
  </OrganizationList>
)

const CompactRows = styled.ul`
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--line);
  list-style: none;

  > li {
    min-height: 72px;
    display: grid;
    grid-template-columns: 5.3rem minmax(12rem, 0.42fr) minmax(0, 1fr);
    gap: 0.8rem;
    align-items: center;
    margin: 0;
    padding: 1rem 0;
    border-top: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
  }
  > li:first-child { border-top: 0; }

  time, small { color: var(--ink-muted); font: 600 0.875rem/1.5 "SFMono-Regular", Consolas, monospace; }
  strong { color: var(--ink-strong); font-size: 1rem; }
  span { color: var(--ink); font-size: 0.92rem; }
  a { color: var(--ink-strong); text-underline-offset: 0.2em; white-space: nowrap; }

  @media (max-width: 500px) {
    > li { grid-template-columns: minmax(0, 1fr); gap: 0.3rem; align-items: start; }
    time, small, strong, span { grid-column: 1; }
  }
`

const Skills = styled.dl`
  margin: 0;
  border-bottom: 1px solid var(--line);

  div { display: grid; grid-template-columns: 10rem 1fr; gap: 1.5rem; padding: 1rem 0; border-top: 1px solid var(--line); }
  div:first-child { border-top: 0; }
  dt { color: var(--dusk-deep); font-size: 0.97rem; font-weight: 800; }
  dd { margin: 0; color: var(--ink); font-size: 0.95rem; line-height: 1.65; }

  @media (max-width: 620px) { div { grid-template-columns: 1fr; gap: 0.15rem; } }
`

const ResumePage = ({ location }) => {
  const currentOrganization = career.find(item => item.title === "NHN Cloud")
  const work = [{ ...currentOrganization, projects: companyProjects }]
  const education = [{ ...career.find(item => item.title === "세종대학교"), projects: [] }]
  const activityGroups = [
    { ...career.find(item => item.title === "소프트웨어 마에스트로 16기"), projects: selectedProjects.filter(project => project.title === "Chefriend") },
    { ...activities.find(item => item.title === "Prography 10기"), projects: selectedProjects.filter(project => project.title === "Cherrydan") },
    { ...activities.find(item => item.title === "멋쟁이사자처럼 12기"), projects: selectedProjects.filter(project => project.title === "Runtale") },
    { ...activities.find(item => item.title === "42 Seoul"), projects: [] },
  ]

  return (
  <Layout location={location} title="GoToBill" variant="wide">
    <ResumeSheet>
      <Profile>
        <Name>{profile.name}</Name>
        <ProfileMeta aria-label="기본 정보">
          <span>{profile.role}</span>
          <span>{profile.birth}</span>
          <span>{profile.education}</span>
        </ProfileMeta>
        <ProfileLinks>
          <a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="https://www.linkedin.com/in/gotobill" target="_blank" rel="noreferrer">LinkedIn ↗</a>
          <Link to="/writing/">기록</Link>
        </ProfileLinks>
        <ProfileVisual aria-hidden="true">
          <img src="/images/resume-caricature-cutout.png" alt="" width="1086" height="1448" />
        </ProfileVisual>
      </Profile>

      <Section aria-labelledby="journey-title">
        <SectionHeading><h2 id="journey-title">Journey</h2></SectionHeading>
        <Journey>
          {career.map(item => (
            <li key={item.title} data-current={item.current ? "true" : "false"}>
              {item.current && <CurrentSr>현재 재직 중</CurrentSr>}
              <strong>{item.title}</strong>
              <span className="journey-role">{item.role}</span>
              <time>{item.current ? "2026.03.09 —" : item.period}</time>
            </li>
          ))}
        </Journey>
      </Section>

      <Section aria-labelledby="work-title">
        <SectionHeading><h2 id="work-title">Work</h2></SectionHeading>
        <OrganizationRows items={work} />
      </Section>

      <Section aria-labelledby="education-title">
        <SectionHeading><h2 id="education-title">Education</h2></SectionHeading>
        <OrganizationRows items={education} />
      </Section>

      <Section aria-labelledby="activities-title">
        <SectionHeading><h2 id="activities-title">Activities</h2></SectionHeading>
        <OrganizationRows items={activityGroups} />
      </Section>

      <Section aria-labelledby="oss-title">
        <SectionHeading><h2 id="oss-title">오픈소스</h2></SectionHeading>
        <CompactRows>
          {oss.map(item => (
            <li key={item.description}>
              <time>{item.date}</time>
              <strong>
                {item.href
                  ? <a href={item.href} target="_blank" rel="noreferrer">{item.title} ↗</a>
                  : item.title}
              </strong>
              <span>{item.description}</span>
            </li>
          ))}
        </CompactRows>
      </Section>

      <Section aria-labelledby="awards-title">
        <SectionHeading><h2 id="awards-title">수상</h2></SectionHeading>
        <CompactRows>
          {awards.map(item => <li key={item.date + item.title}><time>{item.date}</time><strong>{item.title}</strong><span>{item.event}</span></li>)}
        </CompactRows>
      </Section>

      <Section aria-labelledby="skills-title">
        <SectionHeading><h2 id="skills-title">기술</h2></SectionHeading>
        <Skills>
          {skillGroups.map(group => <div key={group.title}><dt>{group.title}</dt><dd>{group.items.join(" · ")}</dd></div>)}
        </Skills>
      </Section>
    </ResumeSheet>
  </Layout>
  )
}

export default ResumePage

const resumeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role,
    url: "https://gotobill.github.io/resume/",
    sameAs: [profile.github],
    knowsAbout: skillGroups.flatMap(group => group.items),
  },
  {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${profile.name} · ${profile.role}`,
    url: "https://gotobill.github.io/resume/",
    mainEntity: { "@type": "Person", name: profile.name, jobTitle: profile.role, sameAs: [profile.github] },
  },
]

export const Head = () => (
  <Seo title={`${profile.name} · ${profile.role}`} description={profile.summary} pathname="/resume/" structuredData={resumeStructuredData} />
)
