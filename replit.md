# Whispr - Campus Anonymous Social Platform

## Overview
Whispr is a campus-based anonymous social platform built with Expo (React Native) and Express. It features confession feeds, anonymous crush mechanics, and a multi-vendor marketplace. The app uses a dark-themed UI with the Outfit font family, hot coral (#FF4D6A) as primary color, and electric blue (#00D2FF) accents.

## Architecture
- **Frontend**: Expo React Native with file-based routing (expo-router)
- **Backend**: Express server (port 5000) serving landing page and APIs
- **Data Storage**: AsyncStorage (local-only, no backend data persistence)
- **State Management**: React Context (AppProvider) + local useState

## Key Features
- **Confession Feed**: 5 reaction types (fire, heart, laugh, shock, sad), categories (confession, hot-take, rant, wholesome, after-dark), sorting (trending/recent), filtering
- **Crush Corner**: Send anonymous crushes, reveal mutual matches, stats tracking
- **Marketplace**: Multi-category listings, condition tracking, mark sold, price validation
- **After Dark Mode**: Activates 10pm-5am with special UI treatment
- **Karma System**: Earn karma from posting (+5), reactions (+1, only on add), crushes (+3), marketplace listings (+3)
- **Profile**: Achievements, karma progress, regenerate alias

## Security & Anti-Abuse Measures
- **Input Sanitization**: All text inputs trimmed and length-limited (confessions: 500, crushes: 200, titles: 100, descriptions: 300)
- **Price Validation**: Must be finite, positive, max $99,999, rounded to 2 decimal places
- **Reaction Cooldown**: 500ms between reactions to prevent spam
- **Self-Reaction Prevention**: Users cannot react to their own posts
- **Karma Farming Fix**: Karma only awarded when adding a reaction, not removing
- **Stale Closure Fix**: All profile updates read fresh from storage instead of closure
- **Duplicate Crush Prevention**: Cannot send multiple crushes to same alias
- **Storage Limits**: 200 confessions, 100 crushes, 150 market items (auto-trimmed)
- **Delete Functionality**: Users can delete their own posts, crushes, and listings

## Project Structure
```
app/(tabs)/           - Tab screens (index, crush, market, profile)
app/_layout.tsx       - Root layout with providers
components/           - ConfessionCard, CrushCard, MarketCard, Avatar, KarmaBadge, ErrorBoundary
constants/colors.ts   - Color constants
lib/storage.ts        - AsyncStorage data layer with validation
lib/app-context.tsx   - React Context provider
lib/query-client.ts   - API client configuration
```

## Design System
- Background: #0A0A0F (navy)
- Primary: #FF4D6A (hot coral)
- Secondary: #6C5CE7 (purple)
- Accent: #00D2FF (electric blue)
- Font: Outfit (400 Regular, 600 SemiBold, 700 Bold)

## Recent Changes
- Added input validation and sanitization across all user inputs
- Fixed karma farming exploit (toggle reactions no longer gives infinite karma)
- Fixed stale closure race conditions in profile updates
- Added storage limits with auto-trimming
- Added delete functionality for confessions, crushes, and marketplace items
- Added profile alias regeneration
- Added price validation with user feedback
- Reaction cooldown (500ms) prevents spam clicking
