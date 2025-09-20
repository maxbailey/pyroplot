# Map Shell Refactoring Plan

## Overview

The `map-shell.tsx` file has grown to 2912 lines and contains multiple concerns that need to be separated. The main issues are:

1. **Massive prop drilling** - 50+ props passed to Sidebar component
2. **Mixed state management** - useState, useRef, and custom hooks scattered throughout
3. **Inconsistent data structures** - Multiple similar interfaces for different annotation types
4. **No single source of truth** - Colors, types, and constants duplicated across files
5. **Tightly coupled concerns** - Map logic, state management, UI, and business logic all mixed

## Goals

- Extract state management into a centralized store (Zustand)
- Create consistent data structures and single sources of truth
- Eliminate prop drilling with context providers
- Separate concerns into focused modules
- Maintain all existing functionality
- Improve type safety and consistency

## Architecture Overview

### New Structure

lib/
├── store/
│ ├── index.ts # Store exports
│ ├── map-store.ts # Map state and actions
│ ├── annotation-store.ts # Annotation management
│ ├── settings-store.ts # Settings and preferences
│ └── ui-store.ts # Dialog and UI state
├── types/
│ ├── index.ts # Type exports
│ ├── annotations.ts # Annotation-related types
│ ├── map.ts # Map-related types
│ └── settings.ts # Settings types
├── constants/
│ ├── index.ts # Constant exports
│ ├── annotations.ts # Annotation palette, colors, types
│ └── map.ts # Map constants
├── hooks/
│ ├── use-map.ts # Map-specific hooks
│ ├── use-annotations.ts # Annotation hooks
│ └── use-settings.ts # Settings hooks
└── utils/
├── map-utils.ts # Map utility functions
├── annotation-utils.ts # Annotation utilities
└── serialization.ts # State serialization/deserialization

## Refactoring Steps

### Phase 1: Foundation (Steps 1-4)

1. **Extract Types and Constants** - Create centralized type definitions and constants
2. **Create Store Structure** - Set up Zustand store architecture
3. **Extract Map Utilities** - Move map-related utility functions
4. **Create Base Hooks** - Extract reusable hooks

### Phase 2: State Management (Steps 5-8)

5. **Settings Store** - Extract settings state and actions
6. **UI Store** - Extract dialog and UI state
7. **Annotation Store** - Extract annotation management
8. **Map Store** - Extract map state and actions

### Phase 3: Component Refactoring (Steps 9-12)

9. **Context Providers** - Create context providers to eliminate prop drilling
10. **Sidebar Refactoring** - Refactor Sidebar to use stores and context
11. **Map Component Refactoring** - Refactor Map component
12. **Main Component Cleanup** - Clean up MapShell component

### Phase 4: Final Integration (Steps 13-15)

13. **Hook Integration** - Integrate all custom hooks
14. **Type Safety** - Ensure full type safety across all components
15. **Testing and Validation** - Test all functionality and fix any issues

## Key Principles

### Single Source of Truth

- All annotation types, colors, and constants defined once
- State managed centrally through Zustand stores
- Types defined once and imported everywhere

### Consistent Data Structures

- Unified annotation interface with discriminated unions
- Consistent naming conventions
- Proper TypeScript types throughout

### Separation of Concerns

- Map logic separated from UI logic
- State management separated from components
- Utility functions in dedicated modules

### Performance Considerations

- Minimize re-renders with proper store selectors
- Use React.memo where appropriate
- Optimize context providers to prevent unnecessary updates

## Migration Strategy

Each step will be implemented incrementally, ensuring the application remains functional at each stage. We'll use feature flags or gradual migration patterns where necessary.

## Success Criteria

- [ ] MapShell component under 200 lines
- [ ] No prop drilling (max 5 props per component)
- [ ] All annotation types use consistent interfaces
- [ ] Single source of truth for all constants
- [ ] Full TypeScript type safety
- [ ] All existing functionality preserved
- [ ] Improved performance and maintainability
