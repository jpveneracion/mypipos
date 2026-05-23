# Context Switcher - Quick Start Guide

## 🚀 Quick Integration

### Option 1: Use Header Component (Recommended)

```tsx
import Header from '@/components/Header';

export default function YourPage() {
  return (
    <div>
      <Header title="Your Title" subtitle="Your subtitle" />
      {/* Your content */}
    </div>
  );
}
```

### Option 2: Use Context Switcher Directly

```tsx
import ContextSwitcher from '@/components/ContextSwitcher';

export default function YourPage() {
  return (
    <header className="flex justify-between">
      <div>Your Logo</div>
      <ContextSwitcher />
    </header>
  );
}
```

## 📍 Where It's Used

- **Customer Page**: `src/app/customer/page.tsx`
- **Mode Selection**: `src/app/mode-selection/page.tsx`
- **Demo Page**: `src/app/demo/context-switcher/page.tsx`

## 🔑 How It Works

1. **Visibility**: Only shows if `authStore.merchantId` exists
2. **Switching**: Calls `authStore.setContext()` with new mode
3. **Redirecting**:
   - Merchant → `/mode-selection`
   - Customer → `/customer`

## 🎨 Design Tips

- **Purple Theme**: Uses `from-purple-600 to-indigo-600` gradient
- **Responsive**: Mobile dropdown, Desktop inline buttons
- **Icons**: Store (merchant) and User (customer)
- **Active State**: Highlighted with gradient background

## 📱 Responsive Breakpoints

- **Mobile** (< 768px): Animated dropdown
- **Desktop** (≥ 768px): Inline toggle buttons

## 🧪 Testing

Visit `/demo/context-switcher` to see:
- Current state display
- Usage instructions
- Responsive design test
- Integration examples

## 🔧 Troubleshooting

**Not showing?**
- Check `authStore.merchantId` exists
- Verify user is authenticated

**Not switching?**
- Check `authStore.setContext()` is working
- Verify routes exist (`/mode-selection`, `/customer`)

**Not redirecting?**
- Ensure Next.js router is working
- Check target routes exist

## 📚 Full Documentation

See `CONTEXT_SWITCHER.md` for complete documentation.

## ✅ Checklist

- [x] Component created
- [x] Header integration
- [x] Responsive design
- [x] Dark mode support
- [x] TypeScript types
- [x] Demo page
- [x] Documentation
- [x] No compilation errors
