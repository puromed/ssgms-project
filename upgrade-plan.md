# SSGMS Upgrade Plan: Polish & Professionalism

This guide outlines two specific improvements to elevate the quality of the State Grant Management System (SSGMS) prototype for the local demo.

## 1. UX Upgrade: Toast Notifications

**Goal:** Replace native browser alerts (`alert()`) with professional toast notifications using `react-hot-toast`.

### Step 1: Install Package

Run this command in your terminal:
```bash
npm install react-hot-toast
```

### Step 2: Add Toaster to App Shell

Open `src/App.tsx`.

1. Import the Toaster.
2. Place `<Toaster />` inside the `BrowserRouter` but outside `AuthProvider`.
```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <--- Import this
import { AuthProvider } from './contexts/AuthContext';
// ... other imports

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" /> {/* <--- Add this line */}
      <AuthProvider>
        <Routes>
          {/* ... existing routes ... */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
```

### Step 3: Update `Grants.tsx`

Open `src/pages/Grants.tsx`.

1. Import `toast`.
2. Replace `alert()` calls.
```tsx
// src/pages/Grants.tsx
import toast from 'react-hot-toast'; // <--- Import

// ... inside your component ...

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this grant?')) return;

  try {
    const { error } = await supabase.from('grants').delete().eq('id', id);
    if (error) throw error;
    setGrants(grants.filter((grant) => grant.id !== id));
    toast.success('Grant deleted successfully'); // <--- New
  } catch (error) {
    console.error('Error deleting grant:', error);
    toast.error('Failed to delete grant'); // <--- New
  }
};
```

### Step 4: Update Modals

Repeat the logic in `src/components/NewGrantModal.tsx` and `src/components/NewDisbursementModal.tsx`.

* Change `alert('Failed to...')` to `toast.error('Failed to...')`.
* Add `toast.success('Grant created!')` right before `onSuccess()` is called.

## 2. "Audit Lite": Last Updated Column

**Goal:** Show users when data was last modified to meet the "traceability" requirement.

### Step 1: Update Helper Function

Open `src/pages/Grants.tsx`. Ensure you have a date formatter that handles short dates.
```tsx
const formatDateShort = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
```

### Step 2: Add Table Header

Find the `<thead>` section in `src/pages/Grants.tsx`. Add a new header before "Actions".
```tsx
<th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
  Last Updated
</th>
```

### Step 3: Add Table Data

Find the `<tbody>` loop. Add the corresponding data cell.
```tsx
<td className="px-6 py-4 text-sm text-slate-500">
  {/* Using created_at since updated_at might not be in your schema yet */}
  {formatDateShort(grant.created_at)}
</td>
```

## 3. Pre-Demo Checklist (Local)

Before showing the client:

1. **Clear Browser Cache:** Or open in Incognito to ensure no old CSS is stuck.
2. **Verify Data:** Ensure you have at least 3 grants in the list so the table doesn't look empty.
3. **Test the Printer:** Click "Print Offer Letter" once to make sure the pop-up blocker doesn't stop it.