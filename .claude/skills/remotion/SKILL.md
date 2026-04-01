---
name: Remotion - Video Creation in React
description: |
  Best practices for creating videos programmatically with Remotion.
  Trigger: Activated when working with Remotion, creating videos, or video compositions.
license: MIT
metadata:
  author: ai-library (based on remotion-dev/skills)
  version: "1.0"
  scope: [root, ui]
  auto_invoke:
    - "Creating videos with Remotion"
    - "Working with video compositions"
    - "Animating video content"
    - "Adding audio to videos"
    - "Creating video thumbnails"
  patterns:
    - "remotion/**/*"
    - "src/remotion/**/*"
    - "**/Root.tsx"
    - "**/*.composition.tsx"
---

# Remotion - Video Creation in React

> **Core Principle:** Videos are React components. Animations are driven by frames, not time. Everything must be deterministic and reproducible.

---

## 🆕 What's New

> **Instruction for Claude:** When this skill is loaded, check this table and mention any entry relevant to what the developer is working on — before writing code.

| Version | Change | Affects |
|---------|--------|---------|
| — | No tracked changes yet | — |

---

## 🎬 What is Remotion?

Remotion lets you create videos programmatically using React. Each frame is a React component rendered at a specific point in time.

```
Frame 0    Frame 30   Frame 60   Frame 90
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ React│  │ React│  │ React│  │ React│
│ Comp │  │ Comp │  │ Comp │  │ Comp │
└──────┘  └──────┘  └──────┘  └──────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
 PNG/Frame → Encoded → Final Video (MP4/WebM)
```

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Use CSS Animations or Transitions

CSS animations are non-deterministic and will NOT render correctly in videos.

```tsx
// ❌ FORBIDDEN - CSS transitions don't work in Remotion
<div className="transition-opacity duration-500 hover:opacity-100">

// ❌ FORBIDDEN - CSS animations don't render
<div className="animate-bounce">

// ❌ FORBIDDEN - Tailwind animation classes
<div className="animate-pulse animate-spin">

// ✅ CORRECT - Frame-based animation
import { useCurrentFrame, interpolate } from 'remotion'

export const MyComponent = () => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 30], [0, 1])

  return <div style={{ opacity }}>Content</div>
}
```

### 2. Never Use setTimeout/setInterval

Timing must be frame-based, not time-based.

```tsx
// ❌ FORBIDDEN - Time-based delays
useEffect(() => {
  setTimeout(() => setVisible(true), 1000)
}, [])

// ✅ CORRECT - Frame-based timing
const frame = useCurrentFrame()
const { fps } = useVideoConfig()
const visible = frame >= fps * 1 // 1 second = fps frames
```

### 3. Never Use State for Animation Values

Animation values must be derived from the current frame.

```tsx
// ❌ FORBIDDEN - State-driven animations
const [position, setPosition] = useState(0)
useEffect(() => {
  setPosition(prev => prev + 1)
}, [frame])

// ✅ CORRECT - Derived from frame
const frame = useCurrentFrame()
const position = interpolate(frame, [0, 60], [0, 100])
```

### 4. Never Hardcode Durations in Frames

Always calculate from seconds using fps.

```tsx
// ❌ FORBIDDEN - Magic numbers
const opacity = interpolate(frame, [0, 30], [0, 1])

// ✅ CORRECT - Seconds-based calculation
const { fps } = useVideoConfig()
const opacity = interpolate(frame, [0, fps * 1], [0, 1]) // 1 second fade
```

---

## ✅ REQUIRED PATTERNS

### 1. Basic Animation with interpolate()

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'

export const FadeIn: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Fade in over 0.5 seconds
  const opacity = interpolate(
    frame,
    [0, fps * 0.5],
    [0, 1],
    { extrapolateRight: 'clamp' }
  )

  // Slide up 50px over 0.5 seconds
  const translateY = interpolate(
    frame,
    [0, fps * 0.5],
    [50, 0],
    { extrapolateRight: 'clamp' }
  )

  return (
    <div style={{
      opacity,
      transform: `translateY(${translateY}px)`
    }}>
      Hello World
    </div>
  )
}
```

### 2. Composition Setup

```tsx
// src/Root.tsx
import { Composition, Folder } from 'remotion'
import { MyVideo } from './MyVideo'
import { Thumbnail } from './Thumbnail'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="main">
        <Composition
          id="MyVideo"
          component={MyVideo}
          durationInFrames={30 * 10} // 10 seconds at 30fps
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            title: 'My Video',
          }}
        />
      </Folder>

      <Folder name="thumbnails">
        <Still
          id="Thumbnail"
          component={Thumbnail}
          width={1280}
          height={720}
        />
      </Folder>
    </>
  )
}
```

### 3. Using Assets (Images, Videos, Audio)

```tsx
import { Img, Video, Audio, staticFile } from 'remotion'

export const MyScene: React.FC = () => {
  return (
    <div>
      {/* Local assets from public/ folder */}
      <Img src={staticFile('logo.png')} />
      <Video src={staticFile('background.mp4')} />
      <Audio src={staticFile('music.mp3')} />

      {/* Remote assets (no staticFile needed) */}
      <Img src="https://example.com/image.png" />
    </div>
  )
}
```

### 4. Sequencing Content

```tsx
import { Sequence, useVideoConfig } from 'remotion'

export const MyVideo: React.FC = () => {
  const { fps } = useVideoConfig()

  return (
    <>
      {/* Intro: 0-3 seconds */}
      <Sequence from={0} durationInFrames={fps * 3}>
        <Intro />
      </Sequence>

      {/* Main content: 3-8 seconds */}
      <Sequence from={fps * 3} durationInFrames={fps * 5}>
        <MainContent />
      </Sequence>

      {/* Outro: 8-10 seconds */}
      <Sequence from={fps * 8}>
        <Outro />
      </Sequence>
    </>
  )
}
```

### 5. Spring Animations

```tsx
import { useCurrentFrame, useVideoConfig, spring } from 'remotion'

export const BouncyElement: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 10,
      stiffness: 100,
      mass: 0.5,
    },
  })

  return (
    <div style={{ transform: `scale(${scale})` }}>
      Bouncy!
    </div>
  )
}
```

### 6. Loading Fonts

```tsx
import { useEffect, useState } from 'react'
import { staticFile, continueRender, delayRender } from 'remotion'

export const useFont = (fontFamily: string, src: string) => {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const handle = delayRender()

    const font = new FontFace(fontFamily, `url(${staticFile(src)})`)
    font.load().then(() => {
      document.fonts.add(font)
      setLoaded(true)
      continueRender(handle)
    })
  }, [fontFamily, src])

  return loaded
}

// Usage
export const MyText: React.FC = () => {
  const fontLoaded = useFont('CustomFont', 'fonts/custom.woff2')

  if (!fontLoaded) return null

  return <h1 style={{ fontFamily: 'CustomFont' }}>Hello</h1>
}
```

### 7. Dynamic Metadata (calculateMetadata)

```tsx
import { Composition } from 'remotion'

type Props = {
  data: { items: string[] }
}

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DynamicVideo"
      component={DynamicVideo}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ data: { items: [] } }}
      calculateMetadata={async ({ props }) => {
        // Fetch data or calculate duration dynamically
        const response = await fetch('https://api.example.com/items')
        const data = await response.json()

        return {
          props: { data },
          durationInFrames: data.items.length * 30 * 3, // 3 sec per item
        }
      }}
    />
  )
}
```

---

## 🎨 Common Animation Patterns

### Staggered List Animation

```tsx
export const StaggeredList: React.FC<{ items: string[] }> = ({ items }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <div>
      {items.map((item, index) => {
        const delay = index * fps * 0.1 // 0.1s stagger
        const opacity = interpolate(
          frame - delay,
          [0, fps * 0.3],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
        const translateX = interpolate(
          frame - delay,
          [0, fps * 0.3],
          [-20, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )

        return (
          <div
            key={index}
            style={{
              opacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}
```

### Text Reveal Character by Character

```tsx
export const TextReveal: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const characters = text.split('')
  const charsPerSecond = 20

  return (
    <span>
      {characters.map((char, index) => {
        const shouldShow = frame >= (index / charsPerSecond) * fps
        return (
          <span key={index} style={{ opacity: shouldShow ? 1 : 0 }}>
            {char}
          </span>
        )
      })}
    </span>
  )
}
```

---

## 📁 Project Structure

```
remotion-project/
├── public/                    # Static assets
│   ├── fonts/
│   ├── images/
│   └── audio/
├── src/
│   ├── Root.tsx              # Composition definitions
│   ├── components/           # Reusable components
│   │   ├── animations/
│   │   └── ui/
│   ├── compositions/         # Video compositions
│   │   ├── intro.tsx
│   │   ├── main.tsx
│   │   └── outro.tsx
│   └── utils/
│       └── animations.ts     # Animation helpers
├── remotion.config.ts
└── package.json
```

---

## 🔧 Useful Interpolation Options

```tsx
// Clamp to prevent values outside range
interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
})

// Easing functions
import { Easing } from 'remotion'

interpolate(frame, [0, 30], [0, 100], {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1), // ease
  easing: Easing.inOut(Easing.ease),
  easing: Easing.bounce,
})
```

---

## 📋 Checklist Before Render

- [ ] No CSS animations or transitions used
- [ ] All animations driven by `useCurrentFrame()`
- [ ] Durations calculated from `fps`, not hardcoded frames
- [ ] All assets use `staticFile()` for local files
- [ ] Fonts loaded with `delayRender()`/`continueRender()`
- [ ] `extrapolateRight: 'clamp'` on animations that shouldn't continue
- [ ] Video tested in Remotion Studio before final render

---

*Skill Version: 1.0.0 | Based on remotion-dev/skills | Compatible with Remotion 4.x*
