# SSGMS Phase 2: Polish & Code Quality

This guide outlines three low-risk, high-reward improvements to make the application code cleaner and the user experience smoother.

## 1. Centralize Utility Functions

**Goal:** Move `formatCurrency` and `formatDate` logic to a single file to avoid code duplication and ensure consistency.

### Step 1: Create the Utility File

Create a new file: `src/lib/utils.ts`.
```typescript
// src/lib/utils.ts

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateLong = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
```

### Step 2: Refactor Components

Go through `Dashboard.tsx`, `Grants.tsx`, and `Disbursements.tsx`.

1. **Delete** the local `formatCurrency` and `formatDate` functions inside the component.
2. **Import** them from the new utility file instead.
```tsx
import { formatCurrency, formatDate } from '../lib/utils';
```