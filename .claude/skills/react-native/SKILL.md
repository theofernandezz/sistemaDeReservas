---
name: React Native Engineering
description: |
  Production patterns for React Native apps using Expo/CLI, navigation, platform APIs, and mobile performance.
  Trigger: Activated when building or editing React Native or Expo screens, components, and app infrastructure.
license: MIT
metadata:
  author: ai-library
  version: "1.0"
  scope: [root, ui]
  auto_invoke:
    - "Building React Native apps"
    - "Working with Expo"
    - "Creating React Native screens"
    - "Configuring React Navigation"
    - "Using native device APIs"
    - "React Native performance optimization"
  patterns:
    - "**/*.native.ts"
    - "**/*.native.tsx"
    - "app.json"
    - "app.config.ts"
    - "expo/**/*.ts"
    - "expo/**/*.tsx"
---

# React Native Engineering

> **Core Principle:** Mobile UX is constrained by battery, memory, and device diversity. Prefer predictable, platform-aware code paths over web assumptions.

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Use Web-Only APIs in Native UI

```typescript
// ❌ FORBIDDEN - DOM APIs do not exist in React Native
document.querySelector("#root");
window.localStorage.setItem("token", token);

// ✅ CORRECT - Native-first APIs
import AsyncStorage from "@react-native-async-storage/async-storage";

await AsyncStorage.setItem("token", token);
```

### 2. Never Fetch in `useEffect` for Screen Data by Default

```typescript
// ❌ FORBIDDEN - Inconsistent loading and no cache policy
useEffect(() => {
  fetch("/api/feed")
    .then((r) => r.json())
    .then(setFeed);
}, []);

// ✅ CORRECT - Use a query layer (TanStack Query)
const { data: feed, isLoading } = useQuery({
  queryKey: ["feed"],
  queryFn: fetchFeed,
});
```

### 3. Never Inline Large Dynamic Style Objects in Render Loops

```typescript
// ❌ FORBIDDEN - Recreates style objects each render
return <View style={{ padding: 16, backgroundColor: isActive ? '#111' : '#fff' }} />

// ✅ CORRECT - StyleSheet + small conditional arrays
const styles = StyleSheet.create({
  container: { padding: 16 },
  active: { backgroundColor: '#111' },
  inactive: { backgroundColor: '#fff' },
})

return <View style={[styles.container, isActive ? styles.active : styles.inactive]} />
```

### 4. Never Ignore Platform Differences

```typescript
// ❌ FORBIDDEN - Assumes one platform behavior
const shadow = { boxShadow: "0 2px 8px rgba(0,0,0,0.2)" };

// ✅ CORRECT - Platform-aware styles
const cardStyle = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 4 },
  default: {},
});
```

---

## ✅ REQUIRED PATTERNS

### 1. Explicit Navigation Param Types

```typescript
const ROOT_STACK_ROUTES = {
  Home: "Home",
  Profile: "Profile",
} as const;

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
};
```

### 2. Screen-by-Screen Folder Structure

```text
features/
  profile/
    screens/
      profile-screen.tsx
    components/
      profile-header.tsx
    hooks/
      use-profile-query.ts
    types/
      profile-types.ts
```

### 3. Native Accessibility Defaults

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Open settings"
  accessibilityHint="Navigates to the settings screen"
  onPress={onOpenSettings}
>
  <Text>Settings</Text>
</Pressable>
```

### 4. Performance-Safe Lists

```tsx
<FlatList
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={renderMessageItem}
  initialNumToRender={12}
  windowSize={7}
  removeClippedSubviews
/>
```

### 5. Runtime Validation at Native Boundaries

```typescript
const locationPayloadSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const parsedLocation = locationPayloadSchema.parse(nativeLocationPayload);
```

---

## 📋 Checklist Before Commit

- [ ] Navigation params are explicitly typed
- [ ] No web-only APIs in native screens/components
- [ ] Lists use `FlatList`/`SectionList` with performance props
- [ ] Accessibility labels/roles are present for interactive UI
- [ ] Platform-specific behavior is handled via `Platform.select` when needed
- [ ] Inputs and native payloads are validated with Zod at boundaries

## Sources

- React Native versions: https://reactnative.dev/versions
- Expo changelog: https://expo.dev/changelog

## Verification Metadata

- Last verified: 2026-03-23
- Verification cadence: 7 days
- Owner: @mobile

Skill Version: 1.0.0 | Compatible with React Native 0.84+ and Expo SDK 55+
