import * as React from "react"
import styled from "styled-components"

const Figure = styled.figure`
  width: 100%;
  min-width: 0;
  margin: 1.5rem 0 0;
  padding: clamp(1rem, 3vw, 1.5rem);
  border: 1px solid var(--line);
  background: var(--paper-raised);
`

const FigureHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`

const Caption = styled.figcaption`
  color: var(--ink-strong);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.5;
`

const Takeaway = styled.p`
  margin: 0.45rem 0 1.1rem;
  color: var(--ink-muted);
  font-size: 0.88rem;
  line-height: 1.6;
`

const ZoomControls = styled.div`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: 40px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper-raised);
  color: var(--ink-strong);

  button {
    min-width: 40px;
    height: 40px;
    padding: 0 0.7rem;
    border: 0;
    border-left: 1px solid var(--line);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
  }

  button:first-child { border-left: 0; }
  button:hover:not(:disabled), button:focus-visible { background: var(--signal-wash); }
  button:focus-visible { outline: 2px solid var(--signal); outline-offset: -2px; }
  button:disabled { color: var(--ink-faint); cursor: not-allowed; }

  @media (max-width: 480px) {
    width: 100%;
    button { flex: 1 1 auto; padding-inline: 0.45rem; }
  }
`

const ZoomValue = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 56px;
  height: 40px;
  padding: 0 0.45rem;
  border-left: 1px solid var(--line);
  color: var(--ink-muted);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
`

const Canvas = styled.div`
  width: 100%;
  min-width: 0;
  overflow: hidden;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  &[data-pannable="true"] {
    max-height: 500px;
    overflow: auto;
  }

  @media (max-width: 700px) {
    &[data-pannable="true"] { max-height: 750px; }
  }
`

const DiagramStage = styled.div`
  min-width: 1px;
  min-height: 1px;
  margin: 0 auto;

  svg {
    display: block;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    max-height: none !important;
  }

  .nodeLabel, .edgeLabel { font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }
`

const Fallback = styled.div`
  padding: 1rem 0;
  color: var(--ink-muted);
  font-size: 0.86rem;
  line-height: 1.65;
`

const ScreenReaderOnly = styled.p`
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

const hash = value => Array.from(value).reduce((result, character) => ((result << 5) - result + character.charCodeAt(0)) | 0, 0).toString(36).replace("-", "n")

const stylesForTheme = dark => dark ? `
classDef current fill:#18252c,stroke:#8fb1c3,color:#f6f7f8,stroke-width:1.5px;
classDef trusted fill:#18252c,stroke:#b8cfda,color:#f6f7f8,stroke-width:2px;
classDef store fill:#181c20,stroke:#9ca3aa,color:#f6f7f8;
classDef risk fill:#202a30,stroke:#8fb1c3,color:#f6f7f8;
classDef neutral fill:#121519,stroke:#697078,color:#f6f7f8;
` : `
classDef current fill:#eaf0f3,stroke:#416b82,color:#111318,stroke-width:1.5px;
classDef trusted fill:#eaf0f3,stroke:#244f68,color:#111318,stroke-width:2px;
classDef store fill:#f1f3f5,stroke:#697078,color:#111318;
classDef risk fill:#eef2f4,stroke:#416b82,color:#111318;
classDef neutral fill:#f7f8fa,stroke:#9aa0a6,color:#111318;
`

const legacySource = diagram => {
  const primary = [...(diagram.inputs || []), ...(diagram.nodes || [])]
  const secondary = diagram.secondary || []
  const lines = ["flowchart LR"]
  primary.forEach((node, index) => {
    lines.push(`P${index}["${typeof node === "string" ? node : node.label}"]`)
    if (index) lines.push(`P${index - 1} --> P${index}`)
  })
  secondary.forEach((node, index) => {
    lines.push(`S${index}["${typeof node === "string" ? node : node.label}"]`)
    lines.push(index ? `S${index - 1} --> S${index}` : `P${Math.max(primary.length - 2, 0)} --> S0`)
  })
  return lines.join("\n")
}

const ArchitectureDiagram = ({ diagram }) => {
  const [svg, setSvg] = React.useState("")
  const [intrinsicSize, setIntrinsicSize] = React.useState({ width: 900, height: 500 })
  const [fitScale, setFitScale] = React.useState(1)
  const [zoom, setZoom] = React.useState(1)
  const [zoomMode, setZoomMode] = React.useState("fit")
  const [failed, setFailed] = React.useState(false)
  const [darkTheme, setDarkTheme] = React.useState(false)
  const canvasRef = React.useRef(null)
  const source = diagram.mermaid || legacySource(diagram)
  const diagramId = React.useMemo(() => `architecture-${hash(`${diagram.title}-${source}`)}`, [diagram.title, source])

  React.useEffect(() => {
    const root = document.documentElement
    const updateTheme = () => setDarkTheme(root.dataset.theme === "dark")
    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] })
    updateTheme()
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!svg || !canvasRef.current || typeof ResizeObserver === "undefined") return undefined

    const updateFit = () => {
      const availableWidth = canvasRef.current?.clientWidth || 0
      if (!availableWidth) return
      const maxHeight = window.matchMedia("(max-width: 700px)").matches ? 750 : 500
      const nextFit = Math.min(1, availableWidth / intrinsicSize.width, maxHeight / intrinsicSize.height)
      const safeFit = Math.max(0.05, Number.isFinite(nextFit) ? nextFit : 1)
      setFitScale(safeFit)
      if (zoomMode === "fit") setZoom(safeFit)
    }

    const observer = new ResizeObserver(updateFit)
    observer.observe(canvasRef.current)
    updateFit()
    return () => observer.disconnect()
  }, [svg, intrinsicSize, zoomMode])

  React.useEffect(() => {
    let active = true
    setSvg("")
    setFailed(false)
    setFitScale(1)
    setZoom(1)
    setZoomMode("fit")
    const render = async () => {
      try {
        const { default: mermaid } = await import("mermaid")
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          htmlLabels: false,
          suppressErrorRendering: true,
          flowchart: { htmlLabels: false, useMaxWidth: true, curve: "basis", nodeSpacing: 32, rankSpacing: 38, padding: 10 },
          state: { useMaxWidth: true, nodeSpacing: 24, rankSpacing: 28, padding: 8, fontSize: 16 },
          themeVariables: {
            background: "transparent",
            primaryColor: darkTheme ? "#121519" : "#f7f8fa",
            primaryTextColor: darkTheme ? "#f6f7f8" : "#111318",
            primaryBorderColor: darkTheme ? "#697078" : "#9aa0a6",
            lineColor: darkTheme ? "#8fb1c3" : "#416b82",
            fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          },
        })
        const directionSource = source
        const isFlowchart = /^\s*(flowchart|graph)\s/m.test(directionSource)
        const renderSource = isFlowchart ? `${directionSource}\n${stylesForTheme(darkTheme)}` : directionSource
        await mermaid.parse(renderSource)
        const result = await mermaid.render(diagramId, renderSource)
        const viewBox = result.svg.match(/viewBox=["']([^"']+)["']/i)?.[1]?.trim().split(/\s+/).map(Number)
        const intrinsicWidth = viewBox?.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : 900
        const intrinsicHeight = viewBox?.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : 500
        if (active) {
          setIntrinsicSize({ width: Math.max(intrinsicWidth, 1), height: Math.max(intrinsicHeight, 1) })
          setSvg(result.svg)
        }
      } catch (error) {
        if (active) setFailed(true)
      }
    }
    render()
    return () => { active = false }
  }, [diagramId, source, darkTheme])

  const minScale = Math.min(0.5, fitScale)
  const maxScale = 2
  const pannable = zoom > fitScale + 0.001
  const changeZoom = delta => {
    setZoomMode("manual")
    setZoom(current => Math.min(maxScale, Math.max(minScale, Math.round((current + delta) * 100) / 100)))
  }
  const resetZoom = () => {
    setZoomMode("fit")
    setZoom(fitScale)
    if (canvasRef.current) canvasRef.current.scrollTo({ left: 0, top: 0 })
  }
  const renderedWidth = Math.max(1, intrinsicSize.width * zoom)
  const renderedHeight = Math.max(1, intrinsicSize.height * zoom)
  const zoomPercent = Math.round(zoom * 100)

  return (
    <Figure aria-labelledby={`${diagramId}-caption`}>
      <FigureHeader>
        <Caption id={`${diagramId}-caption`}>{diagram.title}</Caption>
        {svg && !failed && (
          <ZoomControls role="group" aria-label="다이어그램 확대 및 축소">
            <button type="button" aria-label="축소" onClick={() => changeZoom(-0.1)} disabled={zoom <= minScale + 0.001}>−</button>
            <ZoomValue role="status" aria-live="polite" aria-label={`현재 배율 ${zoomPercent}%`}>{zoomPercent}%</ZoomValue>
            <button type="button" aria-label="확대" onClick={() => changeZoom(0.1)} disabled={zoom >= maxScale - 0.001}>+</button>
            <button type="button" aria-label="화면에 맞추기" onClick={resetZoom} disabled={zoomMode === "fit"}>화면 맞춤</button>
          </ZoomControls>
        )}
      </FigureHeader>
      {diagram.takeaway && <Takeaway>{diagram.takeaway}</Takeaway>}
      {failed ? <Fallback role="img" aria-label={diagram.alt || diagram.title}>구조도를 불러오지 못했습니다. {diagram.alt || diagram.title}</Fallback> : (
        <Canvas ref={canvasRef} data-pannable={pannable ? "true" : "false"} aria-hidden="true">
          {svg && <DiagramStage style={{ width: `${renderedWidth}px`, height: `${renderedHeight}px` }} dangerouslySetInnerHTML={{ __html: svg }} />}
        </Canvas>
      )}
      <ScreenReaderOnly>{diagram.alt || diagram.title}</ScreenReaderOnly>
    </Figure>
  )
}

export default ArchitectureDiagram
