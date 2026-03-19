# Parse Design System for Figma

This folder contains everything you need to recreate the Parse design system in Figma.

## Files

| File | Purpose |
|------|---------|
| `figma-tokens.json` | Import into Tokens Studio for Figma plugin |
| `components.json` | Component specifications with all properties |
| `parse-design-system.css` | CSS reference for all styles |

---

## Quick Start: Import to Figma

### Method 1: Tokens Studio Plugin (Recommended)

1. Install **Tokens Studio for Figma** plugin from Figma Community
2. Open the plugin in your Figma file
3. Click the settings icon → **Import** → Select `figma-tokens.json`
4. Your colors, typography, and spacing will be available as tokens

### Method 2: Manual Setup

Create these styles manually in Figma:

#### Color Styles
| Name | Hex |
|------|-----|
| Primary | `#6366F1` |
| Primary Hover | `#5558E3` |
| Accent Teal | `#2DD4BF` |
| Accent Purple | `#A855F7` |
| Background | `#0A0A0F` |
| Background Secondary | `#12121A` |
| Background Tertiary | `#1A1A24` |
| Card | `#16161F` |
| Border | `#2A2A3C` |
| Text Primary | `#FAFAFA` |
| Text Secondary | `#A1A1AA` |
| Text Tertiary | `#71717A` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |

#### Text Styles
| Name | Size | Weight | Line Height |
|------|------|--------|-------------|
| Heading 1 | 30px | Bold | 1.25 |
| Heading 2 | 24px | Semibold | 1.25 |
| Heading 3 | 20px | Semibold | 1.25 |
| Heading 4 | 18px | Semibold | 1.25 |
| Body | 16px | Regular | 1.5 |
| Body Small | 14px | Regular | 1.5 |
| Caption | 12px | Regular | 1.5 |
| Label | 14px | Medium | 1.5 |

---

## Component Specifications

### Button
- **Height**: 40px (md), 32px (sm), 48px (lg)
- **Border Radius**: 8px
- **Font**: 14px Medium
- **Padding**: 10px 16px

**Variants:**
- Primary: `#6366F1` bg, white text
- Secondary: `#1A1A24` bg, white text
- Outline: transparent bg, `#2A2A3C` border
- Ghost: transparent bg, no border
- Danger: `rgba(239,68,68,0.1)` bg, red text

### Input
- **Height**: 40px
- **Border Radius**: 8px
- **Background**: `#12121A`
- **Border**: 1px solid `#2A2A3C`
- **Focus Border**: `#6366F1`
- **Font**: 14px Regular
- **Padding**: 10px 12px

### Card
- **Border Radius**: 12px
- **Background**: `#16161F`
- **Border**: 1px solid `#2A2A3C`
- **Padding**: 16px

### Avatar
- **Sizes**: 32px (sm), 40px (md), 64px (lg)
- **Shape**: Circle
- **Background**: Gradient `#6366F1` → `#A855F7`
- **Text**: White, centered

### Modal
- **Border Radius**: 16px
- **Background**: `#16161F`
- **Border**: 1px solid `#2A2A3C`
- **Padding**: 24px
- **Max Width**: 480px
- **Overlay**: `rgba(0,0,0,0.8)` with 4px blur

### Sidebar
- **Width**: 280px
- **Background**: `#12121A`
- **Border Right**: 1px solid `#2A2A3C`
- **Item Height**: ~40px
- **Item Border Radius**: 8px
- **Active Item**: `rgba(99,102,241,0.1)` bg, `#6366F1` text

---

## Icon Set

Parse uses **Lucide Icons**. Download from: https://lucide.dev

Common icons used:
- `FileText` - Documents
- `BarChart3` - Charts/Analytics
- `MessageSquare` - Chat
- `Settings` - Settings
- `Users` - Team
- `Upload` - Upload
- `Folder` - Repositories
- `Search` - Search
- `Plus` - Add
- `Trash2` - Delete
- `Edit3` - Edit
- `Check` - Success
- `X` - Close
- `ChevronDown` - Dropdown

---

## Page Templates

### Dashboard
- Sidebar (280px) + Main content
- Quick action cards in grid (2-3 columns)
- Recent items lists

### Chat/Analysis
- Sidebar with document list
- Main chat area
- Message bubbles (user right-aligned, AI left-aligned)
- Input bar at bottom

### Settings
- Tabs navigation
- Form sections in cards
- Avatar + profile info

---

## Chart Colors

Use these colors for data visualization:
1. `#6366F1` - Indigo
2. `#2DD4BF` - Teal
3. `#A855F7` - Purple
4. `#FB923C` - Orange
5. `#F43F5E` - Pink
6. `#22C55E` - Green

---

## Font

**Inter** - Download from Google Fonts
https://fonts.google.com/specimen/Inter

Weights used: 400, 500, 600, 700
