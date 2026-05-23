# Context Switcher Component

## Overview

The Context Switcher is a React component that allows merchant users to seamlessly switch between "Merchant Mode" and "Customer Mode" within the myPiPOS application. This component is essential for users who have both merchant and customer capabilities.

## Features

- **Automatic Display**: Only shows for users who have a `merchantId` in the auth store
- **Responsive Design**:
  - Mobile: Dropdown menu with animated toggle
  - Desktop: Inline toggle buttons with smooth transitions
- **Visual Indication**: Current mode is clearly highlighted with purple gradient
- **Context-Aware Redirects**:
  - Switching to Merchant Mode → Redirects to `/mode-selection` or `/dashboard`
  - Switching to Customer Mode → Redirects to `/customer`
- **Dark Mode Support**: Full theming support for light and dark modes
- **Accessible**: ARIA labels and keyboard navigation support

## Component Location

```
src/components/ContextSwitcher.tsx
```

## Integration

### 1. Using with Header Component (Recommended)

The easiest way to integrate the Context Switcher is to use the included Header component:

```tsx
import Header from '@/components/Header';

export default function YourPage() {
  return (
    <div>
      <Header
        title="Your Page Title"
        subtitle="Optional subtitle"
      />
      {/* Your page content */}
    </div>
  );
}
```

### 2. Using Context Switcher Directly

You can also use the Context Switcher component directly:

```tsx
import ContextSwitcher from '@/components/ContextSwitcher';

export default function YourPage() {
  return (
    <header>
      <div className="flex items-center justify-between">
        <h1>Your Logo</h1>
        <ContextSwitcher />
      </div>
    </header>
  );
}
```

## Props

### ContextSwitcher

```tsx
interface ContextSwitcherProps {
  className?: string; // Optional: Additional CSS classes
}
```

### Header

```tsx
interface HeaderProps {
  title?: string;    // Optional: Page title (default: "myPiPOS")
  subtitle?: string; // Optional: Page subtitle
}
```

## Auth Store Integration

The Context Switcher integrates with the auth store (`src/lib/store.ts`):

```typescript
interface AuthStore {
  merchantId: string | null;      // Required for switcher to appear
  currentContext: 'merchant' | 'customer';
  setContext: (context: 'merchant' | 'customer') => void;
  user: User | null;
  isAuthenticated: boolean;
}
```

## User Flow

### Merchant User Experience

1. **Login**: User authenticates with Pi Network
2. **Detection**: System detects `merchantId` in user profile
3. **Mode Selection**: User sees mode selection page or is directed based on current context
4. **Context Switching**: User can toggle between modes using the switcher in the header
5. **Navigation**: Each mode has its own dedicated dashboard and features

### Non-Merchant User Experience

1. **Login**: User authenticates with Pi Network
2. **Direct Access**: No `merchantId` detected, goes directly to customer portal
3. **No Switcher**: Context switcher is not displayed in header

## Design Specifications

### Colors

- **Primary Gradient**: Purple to Indigo (`from-purple-600 to-indigo-600`)
- **Active State**: Purple gradient background with white text
- **Inactive State**: Gray text with hover effects
- **Border**: Purple-200 (light) / purple-700 (dark)

### Icons

- **Merchant Mode**: Building/Store icon
- **Customer Mode**: User/Person icon
- **Expand/Collapse**: Chevron indicator (mobile only)

### Spacing

- **Padding**: 4px (mobile) to 8px (desktop)
- **Gap**: 8px to 16px between elements
- **Border Radius**: 8px to 12px for smooth appearance

## Examples

### Customer Page Integration

```tsx
// src/app/customer/page.tsx
import Header from '@/components/Header';

export default function CustomerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header
        title="myPiPOS Customer"
        subtitle={`Welcome, ${user?.piUsername}`}
      />
      <main>
        {/* Customer content */}
      </main>
    </div>
  );
}
```

### Merchant Page Integration

```tsx
// src/app/dashboard/page.tsx
import Header from '@/components/Header';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Merchant Dashboard"
        subtitle="Manage your business"
      />
      <main>
        {/* Merchant content */}
      </main>
    </div>
  );
}
```

## Technical Details

### State Management

- Uses Zustand store (`useAuthStore`) for state management
- No local state required for context switching
- Dropdown toggle state is local component state

### Performance

- Minimal re-renders due to Zustand's efficient state management
- CSS transitions for smooth animations (200ms duration)
- Lazy rendering of dropdown content

### Accessibility

- ARIA labels for screen readers
- Keyboard navigation support
- Focus management on dropdown toggle
- Sufficient color contrast for both light and dark modes

## Responsive Behavior

### Mobile (Breakpoint < 768px)

- Dropdown button with full width
- Chevron icon to indicate expandable menu
- Animated dropdown with mode descriptions
- Subtitle showing current mode state

### Desktop (Breakpoint ≥ 768px)

- Inline toggle buttons
- No dropdown required
- Immediate visual feedback on hover
- Compact horizontal layout

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript for interactive features

## Future Enhancements

Potential improvements for future versions:

1. **Custom Redirects**: Allow custom redirect paths per mode
2. **Mode Persistence**: Remember last used mode per device
3. **Animation Variants**: Different animation options for transitions
4. **Badge Notifications**: Show notification badges for each mode
5. **Quick Actions**: Add quick action buttons in dropdown

## Troubleshooting

### Context Switcher Not Showing

**Issue**: The component doesn't appear in the header

**Solution**: Ensure the user has a `merchantId` in the auth store:

```typescript
// Check if merchantId exists
const { merchantId } = useAuthStore();
console.log('Merchant ID:', merchantId); // Should not be null
```

### Context Not Switching

**Issue**: Clicking the toggle doesn't change modes

**Solution**: Verify the `setContext` function is working:

```typescript
const { setContext, currentContext } = useAuthStore();

// Test the function
setContext('merchant');
console.log('Current context:', currentContext); // Should be 'merchant'
```

### Redirects Not Working

**Issue**: Mode switch doesn't navigate to expected page

**Solution**: Check that the routes exist:

```bash
# Verify these routes exist in your app
- /mode-selection
- /customer
- /dashboard
```

## License

This component is part of the myPiPOS project and follows the same license terms.
