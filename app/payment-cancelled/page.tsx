"use client";

import { Suspense } from 'react';

function PaymentCancelledContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Payment Cancelled</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-center text-lg">
              Your payment was cancelled. No charges have been made to your account.
            </p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-center">
              If you'd like to try again, you can return to the application and start a new payment.
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              You can now close this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentCancelledContent />
    </Suspense>
  );
} 