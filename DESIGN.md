---
name: ResumeX
colors:
  background: '#0B0D13'
  surface: '#121622'
  surface-dim: '#0e111a'
  surface-bright: '#1d2334'
  surface-container-lowest: '#07080c'
  surface-container-low: '#0e111a'
  surface-container: '#121622'
  surface-container-high: '#181e2e'
  surface-container-highest: '#20283c'
  on-background: '#F0F2F5'
  on-surface: '#F0F2F5'
  on-surface-variant: '#98A2B3'
  outline: '#344054'
  outline-variant: '#1e2535'
  primary: '#3E5CFF'
  on-primary: '#FFFFFF'
  primary-container: '#1E2D7D'
  on-primary-container: '#D0D5DD'
  secondary: '#8F3BFF'
  on-secondary: '#FFFFFF'
  secondary-container: '#411C7D'
  on-secondary-container: '#E9D7FE'
  tertiary: '#00E5A3'
  on-tertiary: '#07080c'
  tertiary-container: '#005C41'
  on-tertiary-container: '#CCFBEF'
  error: '#FDA29B'
  on-error: '#4F110F'
  error-container: '#912018'
  on-error-container: '#FEE4E2'
  warning: '#FEC84B'
  warning-container: '#7A2710'
  on-warning-container: '#FEF0C7'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.12em
rounded:
  sm: 0.375rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
ResumeX is a premium, state-of-the-art talent analysis and resume scoring platform. The visual style avoids clunky, artificial "AI generated" aesthetics (such as glowing neon cyber grids or bright robotic vectors) and instead leans into a sophisticated, organic dark aesthetic reminiscent of luxury creative suites or professional analytics dashboards. 

Key attributes:
- **Interactive Cursor-Reactive Background:** The landing page features a fluid, abstract canvas background that deforms, shines, or emits particles reacting dynamically to the movements and velocity of the user's cursor.
- **Organic Dark Theme:** A deep, rich obsidian backdrop paired with dark indigo-grey container cards, offering a high-end luxury feel.
- **Premium Fluid Gradients:** Smooth, animated linear and radial gradients (e.g. deep indigo blending into dark violet) that transition softly behind surfaces.
- **Micro-Animations & Transitions:** Hover effects utilize scale transitions, soft glow increases, and cursor-following magnetism rather than simple color flips.

## Navigation & Structure
- **Role Selection Landing Page:** The landing page includes a prominent central gateway prompting users to choose between two main tracks:
  1. **"I am a Candidate"** (Apply to roles, upload resumes, track applications)
  2. **"I am a Recruiter"** (Create job postings, review applications, inspect rankings)
- **Persistent Header Switcher:** A clean, tactile selector switch is placed at the top right of the navigation header at all times, letting users toggle between Recruiter and Candidate views.

## Component Specifications

### 1. Resume Rankings & Scores
- **Dynamic Score-Based Card Gradients:** Resumes in the listing/rankings view have subtle gradient backgrounds that dynamically reflect their match percentage:
  - **High match (81-100%):** Emerald-green subtle gradient borders and soft, deep-forest green card backdrops.
  - **Medium match (50-80%):** Golden-amber/warm bronze gradient borders and deep orange/gold card highlights.
  - **Low match (<50%):** Crimson/rust-red borders and soft, deep-burgundy backdrops.
- **Interactive Hover States:** Cards dynamically shift their gradient vectors and lift upward slightly when hovered by the cursor.

### 2. Resume Analysis & Evaluation
- **Circular Speedometer Gauge (1-100):** The overall candidate score is presented as a high-fidelity analog speedometer meter, ranging from 1 to 100. It features a sweeping indicator arm/needle or a dynamically filling gauge wheel that spins smoothly to the score percentage when loaded.
- **Reactive Section Cards:** Sections of the resume analysis (e.g., experience, skills, education) are represented by cards that react to the cursor by expanding, changing border colors, and revealing nested details with fluid layout animations.
- **Section Score Badges:** Each section card has its own custom mini-speedometer or score radial to signify the score visually.
