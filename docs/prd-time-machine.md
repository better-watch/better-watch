# PRD: Apple Better Watch Blog Timeline

## Overview
Build a Next.js application replicating the "Apple Better Watch"-inspired timeline view for displaying blog posts. The UI features a 3D stacked card layout where each card represents a blog post, with the most recent post in the foreground and older posts receding into the background with perspective, scaling, opacity, and blur effects. A vertical draggable timeline on the right side controls navigation. Supports light and dark modes.

## Goals
- Pixel-perfect recreation of the Apple Better Watch stacked card aesthetic
- Smooth 60fps animations for card transitions and timeline dragging
- Responsive design across desktop, tablet, and mobile breakpoints
- Full keyboard and screen reader accessibility
- Dark mode support matching macOS dark appearance

## Quality Gates

These commands must pass for every user story:
- `npm run build` - Next.js production build succeeds with no errors
- `npx tsc --noEmit` - TypeScript type checking passes

## User Stories

### US-001: Initialize Next.js Project with Dependencies
**Description:** Set up a Next.js 14+ project with App Router, TypeScript, Tailwind CSS, Framer Motion, @use-gesture/react, and lucide-react. Configure Tailwind with custom colors (primary orange #FF9500, background #FAFAFA, card #FFFFFF) and dark mode via class strategy. Create the base app layout and a `/timeline` route.

**Priority:** P1

**Acceptance Criteria:**
- [ ] Next.js 14+ project initialized with App Router and TypeScript
- [ ] Tailwind CSS configured with custom theme colors: primary (#FF9500), background (#FAFAFA), card surfaces, and text hierarchy (#333333, #666666, #999999)
- [ ] Dark mode configured via Tailwind `class` strategy with dark variants
- [ ] Dependencies installed: framer-motion, @use-gesture/react, lucide-react
- [ ] Root layout (app/layout.tsx) renders with Inter font and base styles
- [ ] Route app/timeline/page.tsx exists and renders a placeholder
- [ ] `npm run dev` starts without errors

### US-002: Create Post Data Types and Static Demo Dataset
**Description:** Define TypeScript types for blog posts and create a static dataset of 15 demo posts with realistic titles, subtitles, dates spanning 2023-2024, and Unsplash landscape placeholder image URLs. Sort posts by date descending (newest first).

**Priority:** P1
**Depends on:** US-001

**Acceptance Criteria:**
- [ ] Post type defined: `{ id: string, title: string, subtitle: string, date: string, imageUrl: string }`
- [ ] Static array of 15 posts in `lib/data.ts` with realistic blog content metadata
- [ ] Posts sorted by date descending (newest first, index 0)
- [ ] Image URLs use Unsplash source URLs with landscape dimensions (e.g., 800x480)
- [ ] Dates span from early 2023 to late 2024 in various formats (e.g., "November 12, 2024")

### US-003: Build PostCard Component
**Description:** Create a PostCard component that renders a single blog post preview card matching the screenshot aesthetic: landscape image on top (60% height, object-fit cover, rounded top corners 8px), white content area below (padding 24px, rounded bottom corners 8px) with title (24px bold #333), subtitle (16px #666), and date (14px #999). Apply a subtle box-shadow.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] PostCard component in `components/PostCard.tsx` accepts a Post object as prop
- [ ] Image area fills top 60% of card with `object-fit: cover` and 8px top border-radius
- [ ] Images use `next/image` with lazy loading and proper width/height or fill layout
- [ ] Content area has white background, 24px padding, 8px bottom border-radius
- [ ] Title renders at 24px bold sans-serif in #333333
- [ ] Subtitle renders at 16px regular weight in #666666
- [ ] Date renders at 14px in #999999 below subtitle
- [ ] Card has box-shadow: `0 4px 12px rgba(0,0,0,0.1)`

### US-004: Build StackViewer with 3D CSS Transforms
**Description:** Create a StackViewer component that renders 5-7 visible PostCards in a 3D stacked layout. The container uses CSS `perspective: 2000px`. The top card (currentIndex) is at full size/opacity. Each subsequent card applies increasing translateZ(-n*50px), scale(1-n*0.05), opacity(1-n*0.2), blur(n*1px), and translateY(n*20px). Cards beyond the visible stack are hidden.

**Priority:** P1
**Depends on:** US-003

**Acceptance Criteria:**
- [ ] StackViewer component in `components/StackViewer.tsx` accepts posts array and currentIndex
- [ ] Container div has `perspective: 2000px` and `perspective-origin: center`
- [ ] Top card (currentIndex) renders at scale(1), opacity(1), translateZ(0), no blur
- [ ] Each subsequent visible card applies: translateZ(-n*50px), scale(1-n*0.05), opacity(1-n*0.2), filter blur(n*1px), translateY(n*20px)
- [ ] Cards are stacked with correct z-index ordering (top card highest)
- [ ] Maximum 7 cards visible; older cards hidden with `display: none` or `visibility: hidden`
- [ ] `will-change: transform` applied to animated card wrappers

### US-005: Add Framer Motion Stack Animations
**Description:** Wrap stacked cards with Framer Motion to animate transitions when currentIndex changes. Cards should smoothly animate scale, opacity, translateY, and blur when entering, shifting, or exiting the visible stack. Use AnimatePresence for enter/exit and motion.div with variants for stack positions. Duration 0.5s, ease-in-out.

**Priority:** P1
**Depends on:** US-004

**Acceptance Criteria:**
- [ ] Each card wrapper is a `motion.div` with animated transform, opacity, and filter properties
- [ ] When currentIndex changes, all visible cards animate to their new stack positions
- [ ] Cards entering the stack from the front animate in from scale 1.05 and opacity 0
- [ ] Cards leaving the back of the stack animate out with opacity 0 and increased blur
- [ ] Transition duration is 0.5s with ease-in-out easing
- [ ] AnimatePresence used for mounting/unmounting cards at stack boundaries
- [ ] Animations maintain 60fps (no jank or dropped frames on modern hardware)

### US-006: Build Vertical Timeline Line and Date Markers
**Description:** Create a Timeline component that renders a thin vertical line (2px, #E0E0E0) spanning viewport height on the right side. Add horizontal tick marks (8px wide, #CCCCCC) at positions corresponding to each post's date. Display date labels (12px, #666) next to ticks. Highlight the current date's marker in orange (#FF9500). The "Now" label appears at the top for the most recent post.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] Timeline component in `components/Timeline.tsx` renders a vertical line (2px width, #E0E0E0)
- [ ] Timeline positioned at approximately 10% from the right edge of viewport
- [ ] Each post date has a horizontal tick mark (8px long, #CCCCCC) along the line
- [ ] Date labels (12px, #666666) display next to ticks (e.g., "Jan 24", "Nov 12")
- [ ] The most recent post shows "Now" label at the top of timeline
- [ ] The currently selected post's marker is highlighted in orange (#FF9500)
- [ ] Date markers are spaced proportionally to time gaps between posts

### US-007: Add Draggable Timeline Handle with Gesture Support
**Description:** Add a draggable handle (12px x 40px, orange #FF9500, rounded with grip lines) to the timeline that moves vertically. Use @use-gesture/react for drag detection. On drag, update currentIndex proportionally to handle position. Constrain drag to timeline bounds. On release, snap to the nearest date marker with a Framer Motion spring animation.

**Priority:** P1
**Depends on:** US-006

**Acceptance Criteria:**
- [ ] Draggable handle rendered as a rounded rectangle (12px x 40px, #FF9500 background)
- [ ] Handle has subtle grip lines or texture for affordance
- [ ] @use-gesture/react `useDrag` hook detects vertical drag on the handle
- [ ] Dragging updates currentIndex proportionally (top = newest post, bottom = oldest)
- [ ] Handle constrained to timeline vertical bounds (cannot drag outside)
- [ ] On drag release, handle snaps to nearest date marker position
- [ ] Snap uses Framer Motion spring animation (stiffness ~300, damping ~30)
- [ ] Cursor shows `grab` on hover, `grabbing` while dragging

### US-008: Add Scroll Wheel Navigation on Timeline
**Description:** Support mouse wheel scrolling over the timeline area to navigate between posts. Each scroll tick moves one post forward or backward. Debounce rapid scrolling. Update both the timeline handle position and the card stack when scrolling.

**Priority:** P2
**Depends on:** US-007

**Acceptance Criteria:**
- [ ] Mouse wheel events on the timeline area change currentIndex by 1 per tick
- [ ] Scroll up = newer post (decrease index), scroll down = older post (increase index)
- [ ] Rapid scrolling is debounced (minimum 150ms between index changes)
- [ ] Timeline handle position updates smoothly to match new currentIndex
- [ ] Card stack animates to reflect the new currentIndex
- [ ] Index clamped to valid range (0 to posts.length - 1)

### US-009: Build Main Page Layout with Toolbar and Instructions
**Description:** Create the main timeline page layout: full-screen light background (#FAFAFA), centered content area (~80% width on desktop). Top-right corner has two icon buttons (download and hamburger menu) with rounded light gray backgrounds (#F0F0F0) and hover effects. Bottom-left has italic instructional text "Scroll or drag timeline" in #A0A0A0 at 12px. Left 80% contains StackViewer, right 20% contains Timeline.

**Priority:** P2
**Depends on:** US-005, US-007

**Acceptance Criteria:**
- [ ] Page fills viewport with #FAFAFA background
- [ ] Content area centered at ~80% viewport width on desktop
- [ ] Top-right corner has two icon buttons using Lucide icons (Download + Menu)
- [ ] Icon buttons have rounded shape, #F0F0F0 background, hover: slight scale-up and shadow
- [ ] Bottom-left shows "Scroll or drag timeline" in italic, 12px, #A0A0A0, positioned 20px from edges
- [ ] Left ~80% of content area renders the StackViewer component
- [ ] Right ~20% of content area renders the Timeline component
- [ ] StackViewer and Timeline share currentIndex state via the page component

### US-010: Add Card Hover Effects and Click Interaction
**Description:** Add hover effects to PostCards: slight lift (translateZ 10px) and increased shadow on hover. Make the top card clickable - clicking it logs the post data to console and shows a placeholder "Post opened" overlay or toast. Show pointer cursor on the top card.

**Priority:** P2
**Depends on:** US-005

**Acceptance Criteria:**
- [ ] Hovering over any visible card in the stack triggers a slight lift animation (translateZ +10px)
- [ ] Hover also increases box-shadow intensity
- [ ] Hover animations use Framer Motion whileHover with 0.2s duration
- [ ] The top (foreground) card shows `cursor: pointer`
- [ ] Clicking the top card logs the post object to console
- [ ] Clicking shows a brief visual indicator (toast or overlay placeholder)
- [ ] Non-top cards do not trigger click actions (pointer-events disabled or ignored)

### US-011: Implement Dark Mode Toggle and Styles
**Description:** Add a dark mode toggle (sun/moon icon button in the top-right toolbar area) that toggles the `dark` class on the HTML element. In dark mode: background #1A1A1A, card backgrounds #2A2A2A, text white/#E0E0E0/#999, timeline line #333333 with lighter ticks, orange accents (#FF9500) remain. Store preference in localStorage.

**Priority:** P2
**Depends on:** US-009

**Acceptance Criteria:**
- [ ] Dark mode toggle button added to toolbar using Lucide Sun/Moon icons
- [ ] Clicking toggle adds/removes `dark` class on `<html>` element
- [ ] Dark mode preference persisted in localStorage, restored on page load
- [ ] Dark background: #1A1A1A applied to page
- [ ] Dark card surfaces: #2A2A2A with lighter text (#E0E0E0 title, #BBBBBB subtitle, #999999 date)
- [ ] Dark timeline: line #333333, ticks #555555, labels #999999
- [ ] Orange accent color (#FF9500) unchanged in dark mode
- [ ] Respects `prefers-color-scheme: dark` as initial default when no localStorage value

### US-012: Add Responsive Tablet Layout
**Description:** Add responsive breakpoints for tablet screens (768px-1024px). Reduce card width to 70% of container, shrink card dimensions proportionally, make timeline thinner. Adjust spacing and font sizes for medium screens.

**Priority:** P3
**Depends on:** US-009

**Acceptance Criteria:**
- [ ] At viewport width 768px-1024px, card width reduces to ~70% of original
- [ ] Card height scales proportionally to maintain aspect ratio
- [ ] Timeline track and handle sizes reduce slightly on tablet
- [ ] Font sizes remain readable (minimum 12px for smallest text)
- [ ] Layout maintains the two-column split (cards left, timeline right)
- [ ] No horizontal overflow or content clipping at tablet widths

### US-013: Add Responsive Mobile Layout
**Description:** For mobile screens (<768px), convert the 3D perspective stack to a simpler vertical card view (single card visible, swipe to navigate). Move the timeline from vertical right side to a horizontal slider at the bottom of the screen. Ensure touch-friendly drag targets (minimum 44px).

**Priority:** P3
**Depends on:** US-012

**Acceptance Criteria:**
- [ ] Below 768px, the 3D perspective stack is replaced with single-card view
- [ ] Cards fill ~90% of viewport width on mobile
- [ ] User can swipe left/right or tap arrows to navigate between posts
- [ ] Timeline repositions to bottom of screen as a horizontal slider
- [ ] Horizontal timeline handle is touch-friendly (minimum 44px touch target)
- [ ] Date markers display horizontally along the bottom timeline
- [ ] Toolbar icons remain accessible and properly sized on mobile

### US-014: Add Keyboard Navigation and ARIA Accessibility
**Description:** Add keyboard support: left/up arrow for newer posts, right/down arrow for older posts. Add ARIA labels to all interactive elements: timeline ("Drag to navigate posts"), cards (post title), buttons. Ensure proper focus management and tab order. Add skip-to-content link.

**Priority:** P2
**Depends on:** US-009

**Acceptance Criteria:**
- [ ] Left/Up arrow keys navigate to newer post (decrease currentIndex)
- [ ] Right/Down arrow keys navigate to older post (increase currentIndex)
- [ ] Timeline has `aria-label="Drag to navigate posts"` and `role="slider"`
- [ ] Timeline handle has `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`
- [ ] Each card has `aria-label` with the post title
- [ ] Toolbar buttons have descriptive `aria-label` attributes
- [ ] Tab order follows logical flow: toolbar, cards, timeline
- [ ] Focus indicators visible on all interactive elements

### US-015: Optimize Performance with Lazy Loading and Paint Hints
**Description:** Optimize rendering performance: use next/image with lazy loading and blur placeholders for all post images. Apply `will-change: transform, opacity, filter` on animated card wrappers. Ensure no visible scrollbars on the page. Hide scrollbars via CSS. Verify smooth 60fps animations.

**Priority:** P3
**Depends on:** US-005

**Acceptance Criteria:**
- [ ] All post images use next/image with `loading="lazy"` (except top card which uses `priority`)
- [ ] Images have blur placeholder or skeleton loading state
- [ ] `will-change: transform, opacity, filter` applied to animated card wrappers
- [ ] No visible scrollbars on the page (hidden via CSS `scrollbar-width: none` and webkit pseudo-element)
- [ ] Page body has `overflow: hidden` to prevent scroll
- [ ] Top card image uses `priority` prop for eager loading

### US-016: Add Page Load Animation and Final Polish
**Description:** Add a page load entrance animation: the card stack fades in from below (translateY 40px to 0, opacity 0 to 1) over 0.8s. The timeline fades in from the right. Add a subtle depth tint (blue-ish overlay) on background cards. Add optional keyboard shortcut (Cmd+Shift+T) to toggle the view. Ensure all visual details match the design spec.

**Priority:** P3
**Depends on:** US-005, US-006

**Acceptance Criteria:**
- [ ] On page load, card stack animates in from translateY(40px) and opacity(0) over 0.8s
- [ ] Timeline fades in from translateX(20px) and opacity(0) with slight delay (0.3s)
- [ ] Background cards have a subtle blue-tinted overlay increasing with depth
- [ ] Keyboard shortcut Cmd+Shift+T (or Ctrl+Shift+T) logs "Toggle Better Watch view" to console
- [ ] All transitions feel smooth and polished
- [ ] No visual glitches on initial render or during navigation

## Functional Requirements
- FR-1: The application must render a 3D stacked card layout with perspective transforms
- FR-2: The vertical timeline must accurately map post dates to vertical positions
- FR-3: Dragging the timeline handle must update the visible card stack in real-time
- FR-4: Mouse wheel scrolling over the timeline must navigate between posts
- FR-5: Keyboard arrow keys must navigate between posts
- FR-6: Dark mode must toggle without page reload and persist preference
- FR-7: The layout must adapt to desktop (>1024px), tablet (768-1024px), and mobile (<768px)
- FR-8: All images must lazy-load except the currently visible top card

## Non-Goals (Out of Scope)
- Backend API or database integration (static data only)
- Full blog post content pages or rich text rendering
- User authentication or content management
- Server-side rendering of animations (client-side only)
- Search or filtering functionality
- Comments, likes, or social features

## Technical Considerations
- Next.js 14+ App Router with client components for interactive elements
- Framer Motion v11+ for all animations and gesture integration
- @use-gesture/react v10+ for drag and scroll gesture handling
- Tailwind CSS v3+ with JIT mode and custom theme extension
- Unsplash source URLs for placeholder images (may rate-limit; consider local fallbacks)
- CSS `perspective` and `transform-style: preserve-3d` may have browser-specific rendering differences
- `will-change` should be used sparingly to avoid excessive GPU memory usage

## Success Metrics
- Build completes with zero TypeScript errors and zero warnings
- All 16 user stories pass acceptance criteria
- Lighthouse performance score >= 90 on desktop
- Animations maintain 60fps as measured by Chrome DevTools performance panel
- Layout renders correctly on Chrome, Firefox, and Safari latest versions

## Open Questions
- Should post images use remote Unsplash URLs or local placeholder images for reliability?
- What should the full post view look like when a card is clicked (modal, slide-in panel, or new page)?
- Should the keyboard shortcut toggle hide/show the entire Better Watch view or switch between views?
