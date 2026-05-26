'use client';

export default function TestSettingsPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-4">Settings Test Page</h1>
      <p>If you can see this, Next.js routing is working.</p>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold">Test Content:</h2>
        <ul className="list-disc ml-5 mt-2">
          <li>Static rendering: ✅</li>
          <li>Page loads: ✅</li>
          <li>Basic HTML: ✅</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h2 className="font-semibold">Next Steps:</h2>
        <ol className="list-decimal ml-5 mt-2">
          <li>If this page loads, the issue is with the settings page specifically</li>
          <li>Check browser console for JavaScript errors</li>
          <li>Check network tab for failed API requests</li>
          <li>Navigate to /account-settings to see debug info</li>
        </ol>
      </div>

      <button
        onClick={() => window.location.href = '/account-settings'}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go to Settings Page
      </button>
    </div>
  );
}
