# Plan for refactoring map-shell.tsx

_Exported on 9/19/2025 at 22:04:20 CDT from Cursor (1.6.27)_

---

**User**

Given how large @map-shell.tsx is, I want you to put together a plan to refactor it while maintaining all functionality. I want to pull out state management, and get rid of the prop drill hell we have, and make state more consistent and reliable.

I also want to make sure every part of the application references the same concepts in the same way, and we have single sources of truth for things like custom annotation colors, annotation types, etc.

The problem is, this is way too large of a refactor to be done in a single prompt, so I want you to come up with a plan that would let us prompt our way to this goal in bite sized pieces. Come up with that plan, and give me each prompt for each step.

If you need context, make a REFACTOR.md file at the root to reference with the full plan, so each step can follow the same guidelines but within the context of it's small specific piece.

---

**Cursor**

I'll analyze the `map-shell.tsx` file and create a comprehensive refactoring plan. Let me first examine the current structure and then create a detailed plan.

Now let me create a comprehensive refactoring plan. I'll create a REFACTOR.md file with the full plan and then provide the individual prompts.

Now I'll create the comprehensive refactoring plan:

Let me create the REFACTOR.md file with the comprehensive plan:

```markdown
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
```

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

```

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
```

Now let me provide the individual prompts for each step:

## Step 1: Extract Types and Constants

**Prompt:**

```
I'm starting a refactoring of the large map-shell.tsx file. As the first step, I need you to extract all types and constants into centralized files.

Please create the following files:

1. `lib/types/index.ts` - Export all types
2. `lib/types/annotations.ts` - All annotation-related types
3. `lib/types/map.ts` - Map-related types
4. `lib/types/settings.ts` - Settings and preferences types
5. `lib/constants/index.ts` - Export all constants
6. `lib/constants/annotations.ts` - Annotation palette, colors, types
7. `lib/constants/map.ts` - Map constants

From map-shell.tsx, extract:
- All type definitions (AnnotationItem, AnnotationType, AnnotationRecord, etc.)
- The annotationPalette array with all its items
- Any hardcoded colors, measurements, or other constants
- Map-related constants

Make sure to:
- Use consistent naming conventions
- Create proper TypeScript interfaces
- Group related types together
- Export everything from the index files
- Keep the original functionality intact

After creating these files, update the imports in map-shell.tsx to use the new centralized types and constants.
```

## Step 2: Create Store Structure

**Prompt:**

```
Now I need to set up the Zustand store architecture for centralized state management.

Please create:

1. `lib/store/index.ts` - Export all stores
2. `lib/store/map-store.ts` - Map state and actions (isMapReady, mapRef, search functionality)
3. `lib/store/annotation-store.ts` - Annotation management (annotations, counters, CRUD operations)
4. `lib/store/settings-store.ts` - Settings state (measurementUnit, safetyDistance, projectName)
5. `lib/store/ui-store.ts` - UI state (dialog states, form states)

For each store, create:
- State interface
- Actions interface
- Store implementation using Zustand
- Proper TypeScript types
- Selector functions for performance

Start with basic state structure - we'll add the actual logic in later steps. Focus on:
- Clean separation of concerns
- Consistent patterns across stores
- Proper TypeScript typing
- Performance-optimized selectors

Use the types from the previous step. Don't implement the full logic yet, just the store structure.
```

## Step 3: Extract Map Utilities

**Prompt:**

```
I need to extract all map-related utility functions from map-shell.tsx into dedicated utility files.

Please create:

1. `lib/utils/map-utils.ts` - Map utility functions
2. `lib/utils/annotation-utils.ts` - Annotation utility functions
3. `lib/utils/serialization.ts` - State serialization/deserialization

From map-shell.tsx, extract these functions:
- `createCircleFeature`
- `createRectangleFeature`
- `normalizeCorners`
- `formatDistanceWithSpace`
- `formatLengthNoSpace`
- `refreshAllMeasurementTexts`
- `encodeStateToHash`
- `decodeStateFromHash`
- `gzipCompress`
- `gzipDecompress`
- `base64UrlEncode`
- `base64UrlDecode`
- `restoreFromState`
- All annotation CRUD functions (add, remove, update)

Organize them logically:
- Map utilities for geometric calculations
- Annotation utilities for annotation management
- Serialization utilities for state persistence

Make sure to:
- Use proper TypeScript types
- Import types from the centralized type files
- Keep functions pure where possible
- Add proper JSDoc comments
- Export everything from the files

Update map-shell.tsx to import from these utility files.
```

## Step 4: Create Base Hooks

**Prompt:**

```
I need to create custom hooks that will replace the scattered state management in map-shell.tsx.

Please create:

1. `lib/hooks/use-map.ts` - Map-specific hooks
2. `lib/hooks/use-annotations.ts` - Annotation management hooks
3. `lib/hooks/use-settings.ts` - Settings management hooks

Create hooks for:
- Map initialization and lifecycle
- Search functionality
- Annotation CRUD operations
- Settings management
- Form handling
- Dialog state management

Each hook should:
- Use the Zustand stores from step 2
- Provide clean, focused APIs
- Handle side effects properly
- Be properly typed
- Follow React hooks best practices

Examples of hooks to create:
- `useMapInitialization()`
- `useSearch()`
- `useAnnotations()`
- `useSettings()`
- `useDialogs()`
- `useFormHandling()`

Focus on creating the hook interfaces and basic implementations. We'll integrate them with the stores in later steps.
```

## Step 5: Settings Store Implementation

**Prompt:**

```
Now I need to implement the settings store with full functionality from map-shell.tsx.

In `lib/store/settings-store.ts`, implement:

State:
- measurementUnit: "feet" | "meters"
- safetyDistance: 70 | 100
- projectName: string
- formProjectName: string
- formMeasurementUnit: "feet" | "meters"
- formSafetyDistance: 70 | 100
- hasFormChanges: boolean

Actions:
- setMeasurementUnit
- setSafetyDistance
- setProjectName
- setFormMeasurementUnit
- setFormSafetyDistance
- setFormProjectName
- setHasFormChanges
- handleFormChange
- handleSaveSettings
- handleCancelSettings
- resetForm

Include:
- Proper TypeScript interfaces
- Form validation logic
- Change detection
- State synchronization between form and actual values
- All the logic from the original handleSaveSettings and handleCancelSettings functions

Update the settings hook in `lib/hooks/use-settings.ts` to use this store.

Test that the settings functionality works the same as before.
```

## Step 6: UI Store Implementation

**Prompt:**

```
I need to implement the UI store to manage all dialog and UI state from map-shell.tsx.

In `lib/store/ui-store.ts`, implement:

State:
- shareOpen: boolean
- shareUrl: string
- copied: boolean
- disclaimerOpen: boolean
- helpOpen: boolean
- settingsOpen: boolean
- customAnnotationOpen: boolean
- editingCustomAnnotation: string | null
- customLabel: string
- customColor: string
- showHeight: boolean

Actions:
- setShareOpen
- setShareUrl
- setCopied
- setDisclaimerOpen
- setHelpOpen
- setSettingsOpen
- setCustomAnnotationOpen
- setEditingCustomAnnotation
- setCustomLabel
- setCustomColor
- setShowHeight
- openShareDialog
- closeAllDialogs
- resetCustomAnnotationForm

Include:
- Dialog state management
- Form state for custom annotations
- Share functionality state
- All the logic from the original dialog handlers

Update the UI hook in `lib/hooks/use-settings.ts` to include dialog management.

Ensure all dialog functionality works the same as before.
```

## Step 7: Annotation Store Implementation

**Prompt:**

```
I need to implement the annotation store to manage all annotation state and operations from map-shell.tsx.

In `lib/store/annotation-store.ts`, implement:

State:
- annotations: Record<string, AnnotationRecord>
- audienceAreas: Record<string, AudienceRecord>
- measurements: Record<string, MeasurementRecord>
- restrictedAreas: Record<string, RestrictedRecord>
- annotationMarkers: mapboxgl.Marker[]
- fireworkCounter: number
- audienceCounter: number
- measurementCounter: number
- restrictedCounter: number

Actions:
- addFireworkAnnotation
- addCustomAnnotation
- addAudienceArea
- addMeasurement
- addRestrictedArea
- removeFireworkAnnotation
- removeCustomAnnotation
- removeAudienceArea
- removeMeasurement
- removeRestrictedArea
- updateAnnotation
- clearAllAnnotations
- renumberAnnotations
- getNextAnnotationNumber

Include:
- All CRUD operations for each annotation type
- Counter management
- Marker management
- Renumbering logic
- All the complex logic from the original functions

Update the annotation hook in `lib/hooks/use-annotations.ts` to use this store.

Ensure all annotation functionality works the same as before.
```

## Step 8: Map Store Implementation

**Prompt:**

```
I need to implement the map store to manage map state and search functionality from map-shell.tsx.

In `lib/store/map-store.ts`, implement:

State:
- isMapReady: boolean
- mapRef: mapboxgl.Map | null
- searchQuery: string
- suggestions: Array<{ id: string; text: string; center?: [number, number] }>
- activeIndex: number
- sessionToken: string | null

Actions:
- setMapReady
- setMapRef
- setSearchQuery
- setSuggestions
- setActiveIndex
- setSessionToken
- handleSearch
- handleSubmitOrSelect
- flyToLocation
- initializeMap

Include:
- Search functionality with Mapbox API
- Suggestion management
- Map initialization logic
- Location flying logic
- All the complex search and geocoding logic

Update the map hook in `lib/hooks/use-map.ts` to use this store.

Ensure all map and search functionality works the same as before.
```

## Step 9: Context Providers

**Prompt:**

```
I need to create context providers to eliminate prop drilling between components.

Please create:

1. `lib/contexts/MapContext.tsx` - Map-related context
2. `lib/contexts/AnnotationContext.tsx` - Annotation-related context
3. `lib/contexts/SettingsContext.tsx` - Settings-related context
4. `lib/contexts/UIContext.tsx` - UI-related context

Each context should:
- Provide access to the corresponding Zustand store
- Use the custom hooks from previous steps
- Include proper TypeScript types
- Optimize re-renders with useMemo and useCallback
- Provide clean, focused APIs

Create a main `AppProvider` component that wraps all contexts.

Update the context providers to:
- Use the stores and hooks from previous steps
- Provide only the necessary data to components
- Prevent unnecessary re-renders
- Maintain the same functionality as before

The goal is to eliminate the 50+ props being passed to the Sidebar component.
```

## Step 10: Sidebar Refactoring

**Prompt:**

```
I need to refactor the Sidebar component to use the new context providers instead of prop drilling.

In `components/map-shell/Sidebar.tsx`:

1. Remove all the prop drilling (50+ props)
2. Use the context providers from step 9
3. Use the custom hooks from previous steps
4. Maintain all existing functionality
5. Improve component organization

Changes needed:
- Replace all props with context usage
- Use hooks for state management
- Simplify the component interface
- Maintain all existing functionality
- Improve readability and maintainability

The SidebarProps interface should be much simpler, only including:
- mapRef (still needed for some operations)
- Any other essential props that can't be provided via context

Update the component to:
- Use contexts instead of props
- Use hooks for state management
- Maintain the same UI and functionality
- Be more maintainable and readable

Test that all sidebar functionality works the same as before.
```

## Step 11: Map Component Refactoring

**Prompt:**

```
I need to refactor the Map component to use the new context providers and hooks.

In `components/map-shell/Map.tsx`:

1. Remove prop drilling
2. Use context providers from step 9
3. Use custom hooks from previous steps
4. Maintain all existing functionality
5. Improve component organization

Changes needed:
- Replace props with context usage
- Use hooks for state management
- Simplify the component interface
- Maintain all existing functionality
- Improve readability and maintainability

The Map component should:
- Use contexts instead of props
- Use hooks for state management
- Maintain the same map functionality
- Be more maintainable and readable

Update the component to:
- Use contexts instead of props
- Use hooks for state management
- Maintain the same map functionality
- Be more maintainable and readable

Test that all map functionality works the same as before.
```

## Step 12: Main Component Cleanup

**Prompt:**

```
I need to clean up the main MapShell component by removing the extracted functionality and using the new architecture.

In `app/components/map-shell.tsx`:

1. Remove all the state management that's now in stores
2. Remove all the utility functions that are now in separate files
3. Remove all the prop drilling
4. Use context providers and hooks
5. Simplify the component to focus on composition

The component should:
- Be much smaller (target: under 200 lines)
- Use contexts and hooks instead of local state
- Focus on component composition
- Maintain all existing functionality
- Be more maintainable and readable

Changes needed:
- Remove useState and useRef for store-managed state
- Remove utility functions
- Remove prop drilling
- Use context providers
- Use custom hooks
- Simplify the component structure

The final MapShell should be a clean composition of:
- Context providers
- Map component
- Sidebar component
- Any necessary event handlers

Test that all functionality works the same as before.
```

## Step 13: Hook Integration

**Prompt:**

```
I need to integrate all the custom hooks and ensure they work together properly.

Update all hooks in `lib/hooks/` to:

1. Use the Zustand stores properly
2. Handle side effects correctly
3. Provide clean APIs
4. Work together seamlessly
5. Maintain performance

Focus on:
- Proper store integration
- Side effect management
- Performance optimization
- Error handling
- Type safety

Update the hooks to:
- Use stores correctly
- Handle side effects properly
- Provide clean APIs
- Work together seamlessly
- Maintain performance

Test that all hooks work together properly and maintain the same functionality.
```

## Step 14: Type Safety

\*\*Prompt:`

```
I need to ensure full type safety across all components and stores.

Update all files to:

1. Use proper TypeScript types throughout
2. Ensure type safety across all components
3. Fix any type errors
4. Improve type definitions where needed
5. Add proper JSDoc comments

Focus on:
- Type safety across all components
- Proper TypeScript usage
- Type definitions
- JSDoc comments
- Error handling types

Update all files to:
- Use proper TypeScript types
- Ensure type safety
- Fix type errors
- Improve type definitions
- Add JSDoc comments

Test that there are no TypeScript errors and all types are properly defined.
```

## Step 15: Testing and Validation

\*\*Prompt:`

```
I need to test all functionality and ensure the refactoring is complete and working properly.

Please:

1. Test all existing functionality
2. Fix any issues found
3. Ensure performance is maintained or improved
4. Verify all features work as before
5. Clean up any remaining issues

Focus on:
- Functionality testing
- Performance verification
- Bug fixes
- Code cleanup
- Documentation

Test and verify:
- All annotation functionality
- All map functionality
- All settings functionality
- All UI functionality
- Performance
- Type safety

Fix any issues found and ensure the refactoring is complete and working properly.

The final result should be:
- MapShell component under 200 lines
- No prop drilling
- Centralized state management
- Consistent data structures
- Single source of truth for constants
- Full TypeScript type safety
- All existing functionality preserved
- Improved performance and maintainability
```

This refactoring plan breaks down the massive refactoring into manageable, incremental steps that can be executed one at a time while maintaining functionality throughout the process. Each step builds on the previous ones and moves toward the goal of a clean, maintainable architecture.

```markdown
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
```

```plaintext

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
```

```plaintext
I'm starting a refactoring of the large map-shell.tsx file. As the first step, I need you to extract all types and constants into centralized files.

Please create the following files:

1. `lib/types/index.ts` - Export all types
2. `lib/types/annotations.ts` - All annotation-related types
3. `lib/types/map.ts` - Map-related types
4. `lib/types/settings.ts` - Settings and preferences types
5. `lib/constants/index.ts` - Export all constants
6. `lib/constants/annotations.ts` - Annotation palette, colors, types
7. `lib/constants/map.ts` - Map constants

From map-shell.tsx, extract:
- All type definitions (AnnotationItem, AnnotationType, AnnotationRecord, etc.)
- The annotationPalette array with all its items
- Any hardcoded colors, measurements, or other constants
- Map-related constants

Make sure to:
- Use consistent naming conventions
- Create proper TypeScript interfaces
- Group related types together
- Export everything from the index files
- Keep the original functionality intact

After creating these files, update the imports in map-shell.tsx to use the new centralized types and constants.
```

```plaintext
Now I need to set up the Zustand store architecture for centralized state management.

Please create:

1. `lib/store/index.ts` - Export all stores
2. `lib/store/map-store.ts` - Map state and actions (isMapReady, mapRef, search functionality)
3. `lib/store/annotation-store.ts` - Annotation management (annotations, counters, CRUD operations)
4. `lib/store/settings-store.ts` - Settings state (measurementUnit, safetyDistance, projectName)
5. `lib/store/ui-store.ts` - UI state (dialog states, form states)

For each store, create:
- State interface
- Actions interface
- Store implementation using Zustand
- Proper TypeScript types
- Selector functions for performance

Start with basic state structure - we'll add the actual logic in later steps. Focus on:
- Clean separation of concerns
- Consistent patterns across stores
- Proper TypeScript typing
- Performance-optimized selectors

Use the types from the previous step. Don't implement the full logic yet, just the store structure.
```

```plaintext
I need to extract all map-related utility functions from map-shell.tsx into dedicated utility files.

Please create:

1. `lib/utils/map-utils.ts` - Map utility functions
2. `lib/utils/annotation-utils.ts` - Annotation utility functions
3. `lib/utils/serialization.ts` - State serialization/deserialization

From map-shell.tsx, extract these functions:
- `createCircleFeature`
- `createRectangleFeature`
- `normalizeCorners`
- `formatDistanceWithSpace`
- `formatLengthNoSpace`
- `refreshAllMeasurementTexts`
- `encodeStateToHash`
- `decodeStateFromHash`
- `gzipCompress`
- `gzipDecompress`
- `base64UrlEncode`
- `base64UrlDecode`
- `restoreFromState`
- All annotation CRUD functions (add, remove, update)

Organize them logically:
- Map utilities for geometric calculations
- Annotation utilities for annotation management
- Serialization utilities for state persistence

Make sure to:
- Use proper TypeScript types
- Import types from the centralized type files
- Keep functions pure where possible
- Add proper JSDoc comments
- Export everything from the files

Update map-shell.tsx to import from these utility files.
```

```plaintext
I need to create custom hooks that will replace the scattered state management in map-shell.tsx.

Please create:

1. `lib/hooks/use-map.ts` - Map-specific hooks
2. `lib/hooks/use-annotations.ts` - Annotation management hooks
3. `lib/hooks/use-settings.ts` - Settings management hooks

Create hooks for:
- Map initialization and lifecycle
- Search functionality
- Annotation CRUD operations
- Settings management
- Form handling
- Dialog state management

Each hook should:
- Use the Zustand stores from step 2
- Provide clean, focused APIs
- Handle side effects properly
- Be properly typed
- Follow React hooks best practices

Examples of hooks to create:
- `useMapInitialization()`
- `useSearch()`
- `useAnnotations()`
- `useSettings()`
- `useDialogs()`
- `useFormHandling()`

Focus on creating the hook interfaces and basic implementations. We'll integrate them with the stores in later steps.
```

```plaintext
Now I need to implement the settings store with full functionality from map-shell.tsx.

In `lib/store/settings-store.ts`, implement:

State:
- measurementUnit: "feet" | "meters"
- safetyDistance: 70 | 100
- projectName: string
- formProjectName: string
- formMeasurementUnit: "feet" | "meters"
- formSafetyDistance: 70 | 100
- hasFormChanges: boolean

Actions:
- setMeasurementUnit
- setSafetyDistance
- setProjectName
- setFormMeasurementUnit
- setFormSafetyDistance
- setFormProjectName
- setHasFormChanges
- handleFormChange
- handleSaveSettings
- handleCancelSettings
- resetForm

Include:
- Proper TypeScript interfaces
- Form validation logic
- Change detection
- State synchronization between form and actual values
- All the logic from the original handleSaveSettings and handleCancelSettings functions

Update the settings hook in `lib/hooks/use-settings.ts` to use this store.

Test that the settings functionality works the same as before.
```

```plaintext
I need to implement the UI store to manage all dialog and UI state from map-shell.tsx.

In `lib/store/ui-store.ts`, implement:

State:
- shareOpen: boolean
- shareUrl: string
- copied: boolean
- disclaimerOpen: boolean
- helpOpen: boolean
- settingsOpen: boolean
- customAnnotationOpen: boolean
- editingCustomAnnotation: string | null
- customLabel: string
- customColor: string
- showHeight: boolean

Actions:
- setShareOpen
- setShareUrl
- setCopied
- setDisclaimerOpen
- setHelpOpen
- setSettingsOpen
- setCustomAnnotationOpen
- setEditingCustomAnnotation
- setCustomLabel
- setCustomColor
- setShowHeight
- openShareDialog
- closeAllDialogs
- resetCustomAnnotationForm

Include:
- Dialog state management
- Form state for custom annotations
- Share functionality state
- All the logic from the original dialog handlers

Update the UI hook in `lib/hooks/use-settings.ts` to include dialog management.

Ensure all dialog functionality works the same as before.
```

```plaintext
I need to implement the annotation store to manage all annotation state and operations from map-shell.tsx.

In `lib/store/annotation-store.ts`, implement:

State:
- annotations: Record<string, AnnotationRecord>
- audienceAreas: Record<string, AudienceRecord>
- measurements: Record<string, MeasurementRecord>
- restrictedAreas: Record<string, RestrictedRecord>
- annotationMarkers: mapboxgl.Marker[]
- fireworkCounter: number
- audienceCounter: number
- measurementCounter: number
- restrictedCounter: number

Actions:
- addFireworkAnnotation
- addCustomAnnotation
- addAudienceArea
- addMeasurement
- addRestrictedArea
- removeFireworkAnnotation
- removeCustomAnnotation
- removeAudienceArea
- removeMeasurement
- removeRestrictedArea
- updateAnnotation
- clearAllAnnotations
- renumberAnnotations
- getNextAnnotationNumber

Include:
- All CRUD operations for each annotation type
- Counter management
- Marker management
- Renumbering logic
- All the complex logic from the original functions

Update the annotation hook in `lib/hooks/use-annotations.ts` to use this store.

Ensure all annotation functionality works the same as before.
```

```plaintext
I need to implement the map store to manage map state and search functionality from map-shell.tsx.

In `lib/store/map-store.ts`, implement:

State:
- isMapReady: boolean
- mapRef: mapboxgl.Map | null
- searchQuery: string
- suggestions: Array<{ id: string; text: string; center?: [number, number] }>
- activeIndex: number
- sessionToken: string | null

Actions:
- setMapReady
- setMapRef
- setSearchQuery
- setSuggestions
- setActiveIndex
- setSessionToken
- handleSearch
- handleSubmitOrSelect
- flyToLocation
- initializeMap

Include:
- Search functionality with Mapbox API
- Suggestion management
- Map initialization logic
- Location flying logic
- All the complex search and geocoding logic

Update the map hook in `lib/hooks/use-map.ts` to use this store.

Ensure all map and search functionality works the same as before.
```

```plaintext
I need to create context providers to eliminate prop drilling between components.

Please create:

1. `lib/contexts/MapContext.tsx` - Map-related context
2. `lib/contexts/AnnotationContext.tsx` - Annotation-related context
3. `lib/contexts/SettingsContext.tsx` - Settings-related context
4. `lib/contexts/UIContext.tsx` - UI-related context

Each context should:
- Provide access to the corresponding Zustand store
- Use the custom hooks from previous steps
- Include proper TypeScript types
- Optimize re-renders with useMemo and useCallback
- Provide clean, focused APIs

Create a main `AppProvider` component that wraps all contexts.

Update the context providers to:
- Use the stores and hooks from previous steps
- Provide only the necessary data to components
- Prevent unnecessary re-renders
- Maintain the same functionality as before

The goal is to eliminate the 50+ props being passed to the Sidebar component.
```

```plaintext
I need to refactor the Sidebar component to use the new context providers instead of prop drilling.

In `components/map-shell/Sidebar.tsx`:

1. Remove all the prop drilling (50+ props)
2. Use the context providers from step 9
3. Use the custom hooks from previous steps
4. Maintain all existing functionality
5. Improve component organization

Changes needed:
- Replace all props with context usage
- Use hooks for state management
- Simplify the component interface
- Maintain all existing functionality
- Improve readability and maintainability

The SidebarProps interface should be much simpler, only including:
- mapRef (still needed for some operations)
- Any other essential props that can't be provided via context

Update the component to:
- Use contexts instead of props
- Use hooks for state management
- Maintain the same UI and functionality
- Be more maintainable and readable

Test that all sidebar functionality works the same as before.
```

```plaintext
I need to refactor the Map component to use the new context providers and hooks.

In `components/map-shell/Map.tsx`:

1. Remove prop drilling
2. Use context providers from step 9
3. Use custom hooks from previous steps
4. Maintain all existing functionality
5. Improve component organization

Changes needed:
- Replace props with context usage
- Use hooks for state management
- Simplify the component interface
- Maintain all existing functionality
- Improve readability and maintainability

The Map component should:
- Use contexts instead of props
- Use hooks for state management
- Maintain the same map functionality
- Be more maintainable and readable

Update the component to:
- Use contexts instead of props
- Use hooks for state management
- Maintain the same map functionality
- Be more maintainable and readable

Test that all map functionality works the same as before.
```

```plaintext
I need to clean up the main MapShell component by removing the extracted functionality and using the new architecture.

In `app/components/map-shell.tsx`:

1. Remove all the state management that's now in stores
2. Remove all the utility functions that are now in separate files
3. Remove all the prop drilling
4. Use context providers and hooks
5. Simplify the component to focus on composition

The component should:
- Be much smaller (target: under 200 lines)
- Use contexts and hooks instead of local state
- Focus on component composition
- Maintain all existing functionality
- Be more maintainable and readable

Changes needed:
- Remove useState and useRef for store-managed state
- Remove utility functions
- Remove prop drilling
- Use context providers
- Use custom hooks
- Simplify the component structure

The final MapShell should be a clean composition of:
- Context providers
- Map component
- Sidebar component
- Any necessary event handlers

Test that all functionality works the same as before.
```

```plaintext
I need to integrate all the custom hooks and ensure they work together properly.

Update all hooks in `lib/hooks/` to:

1. Use the Zustand stores properly
2. Handle side effects correctly
3. Provide clean APIs
4. Work together seamlessly
5. Maintain performance

Focus on:
- Proper store integration
- Side effect management
- Performance optimization
- Error handling
- Type safety

Update the hooks to:
- Use stores correctly
- Handle side effects properly
- Provide clean APIs
- Work together seamlessly
- Maintain performance

Test that all hooks work together properly and maintain the same functionality.
```

```plaintext
I need to ensure full type safety across all components and stores.

Update all files to:

1. Use proper TypeScript types throughout
2. Ensure type safety across all components
3. Fix any type errors
4. Improve type definitions where needed
5. Add proper JSDoc comments

Focus on:
- Type safety across all components
- Proper TypeScript usage
- Type definitions
- JSDoc comments
- Error handling types

Update all files to:
- Use proper TypeScript types
- Ensure type safety
- Fix type errors
- Improve type definitions
- Add JSDoc comments

Test that there are no TypeScript errors and all types are properly defined.
```

```plaintext
I need to test all functionality and ensure the refactoring is complete and working properly.

Please:

1. Test all existing functionality
2. Fix any issues found
3. Ensure performance is maintained or improved
4. Verify all features work as before
5. Clean up any remaining issues

Focus on:
- Functionality testing
- Performance verification
- Bug fixes
- Code cleanup
- Documentation

Test and verify:
- All annotation functionality
- All map functionality
- All settings functionality
- All UI functionality
- Performance
- Type safety

Fix any issues found and ensure the refactoring is complete and working properly.

The final result should be:
- MapShell component under 200 lines
- No prop drilling
- Centralized state management
- Consistent data structures
- Single source of truth for constants
- Full TypeScript type safety
- All existing functionality preserved
- Improved performance and maintainability
```
