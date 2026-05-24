# A2U (App-to-User) Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete A2U payment functionality allowing the myPiPOS application to send Pi payments from the app wallet to user wallets for refunds, rewards, and payouts.

**Architecture:** Service layer approach with Pi Network SDK integration, following existing Next.js App Router patterns. Add A2U methods to the PiNetworkService class, create new API route, update frontend authentication with wallet_address scope, and add database support for A2U transactions.

**Tech Stack:** Pi Network SDK (pi-backend), Next.js 16+ API routes, TypeScript, PostgreSQL with pg driver, existing blockchain utilities

---

## File Structure

**New Files:**
- `src/lib/pi-network-a2u.ts` - A2U-specific service layer with complete payment flow
- `src/app/api/payments/a2u/route.ts` - POST endpoint for A2U payments
- `src/lib/types/a2u.ts` - A2U-specific TypeScript interfaces
- `database/migrations/007_add_a2u_payments.sql` - Database schema updates
- `src/app/api/payments/a2u/__tests__/route.test.ts` - API route tests
- `src/lib/pi-network-a2u.__tests__.ts` - Service layer tests

**Modified Files:**
- `src/hooks/use-pi-network.tsx` - Add wallet_address scope to authentication
- `package.json` - Add pi-backend dependency
- `.env.local` - Add Pi Network server credentials (documentation only)

---

## Task 1: Add Pi Network SDK Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add pi-backend dependency to package.json**

```json
{
  "dependencies": {
    "@tailwindcss/postcss": "^4",
    "clsx": "^2.1.1",
    "date-fns": "^2.30.0",
    "html5-qrcode": "^2.3.8",
    "lucide-react": "^1.16.0",
    "next": "16.2.6",
    "pg": "^8.11.3",
    "pi-backend": "^1.2.0",
    "qrcode": "^1.5.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwindcss": "^4",
    "zustand": "^4.5.7"
  }
}
```

- [ ] **Step 2: Install the dependency**

Run: `npm install`
Expected: pi-backend added to node_modules and package-lock.json updated

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add pi-backend SDK for A2U payment support"
```

---

## Task 2: Create A2U Type Definitions

**Files:**
- Create: `src/lib/types/a2u.ts`

- [ ] **Step 1: Write the type definitions file**

```typescript
/**
 * A2U (App-to-User) Payment Type Definitions
 * Defines interfaces for App-to-User payment flow following Pi Network SDK
 */

import { TransactionStatus } from '../blockchain';

/**
 * Payment arguments for creating A2U payment
 */
export interface A2UPaymentArgs {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  uid: string;  // Pi Network user UID
}

/**
 * A2U Payment Data Transfer Object from Pi Network
 */
export interface A2UPaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  from_address: string;
  to_address: string;
  direction: 'user_to_app' | 'app_to_user';
  created_at: string;
  network: 'Pi Testnet' | 'Pi Network';
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | {
    txid: string;
    verified: boolean;
    _link: string;
  };
}

/**
 * A2U Payment result from service layer
 */
export interface A2UPaymentResult {
  paymentId: string;
  txid: string;
  payment: A2UPaymentDTO;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Database record for A2U payment
 */
export interface A2UPaymentRecord {
  id: string;
  transaction_id: string;
  user_id: string;
  pi_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  payment_id: string;
  txid: string;
  status: TransactionStatus;
  transaction_type: 'payout' | 'refund' | 'reward';
  from_address: string;
  to_address: string;
  network: 'Pi Testnet' | 'Pi Network';
  created_at: string;
  completed_at?: string;
}

/**
 * Request body for A2U payment API endpoint
 */
export interface A2UPaymentRequest {
  uid: string;
  amount: number;
  memo?: string;
  metadata?: Record<string, any>;
  transaction_type?: 'payout' | 'refund' | 'reward';
}

/**
 * Response from A2U payment API endpoint
 */
export interface A2UPaymentResponse {
  success: boolean;
  paymentId?: string;
  txid?: string;
  transactionId?: string;
  amount?: number;
  user?: {
    id: string;
    username: string;
    piUID: string;
  };
  status?: any;
  error?: string;
  details?: string;
  timestamp: string;
}

/**
 * Configuration for A2U payment service
 */
export interface A2UServiceConfig {
  useMock: boolean;
  serverApiKey: string;
  walletPrivateSeed: string;
  network: 'testnet' | 'mainnet';
}
```

- [ ] **Step 2: Run TypeScript compiler to verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/a2u.ts
git commit -m "types: add A2U payment type definitions"
```

---

## Task 3: Create A2U Payment Service Layer

**Files:**
- Create: `src/lib/pi-network-a2u.ts`
- Test: `src/lib/pi-network-a2u.__tests__.ts`

- [ ] **Step 1: Write the failing test for service initialization**

```typescript
// src/lib/pi-network-a2u.__tests__.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PiNetworkA2UService } from '../pi-network-a2u';

describe('PiNetworkA2UService', () => {
  let service: PiNetworkA2UService;
  
  beforeEach(() => {
    service = new PiNetworkA2UService({ useMock: true });
  });

  it('should initialize with mock configuration', () => {
    expect(service).toBeDefined();
    expect(service['useMock']).toBe(true);
  });

  it('should fail initialization with missing credentials in non-mock mode', () => {
    expect(() => new PiNetworkA2UService({ 
      useMock: false,
      serverApiKey: '',
      walletPrivateSeed: ''
    })).toThrow('Missing Pi Network credentials');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pi-network-a2u.__tests__.ts`
Expected: FAIL - Class not defined

- [ ] **Step 3: Write minimal service class implementation**

```typescript
// src/lib/pi-network-a2u.ts
/**
 * Pi Network A2U (App-to-User) Payment Service
 * Handles sending payments from app wallet to user wallets
 */

import piBackend from 'pi-backend';
import type { 
  A2UPaymentArgs, 
  A2UPaymentDTO, 
  A2UPaymentResult,
  A2UServiceConfig 
} from './types/a2u';

// Handle both default export and named export
const PiNetworkClass = (piBackend as any).default || piBackend;

export class PiNetworkA2UService {
  private useMock: boolean;
  private piInstance: any = null;

  constructor(config: A2UServiceConfig) {
    this.useMock = config.useMock;
    
    if (!config.useMock) {
      if (!config.serverApiKey || !config.walletPrivateSeed) {
        throw new Error('Missing Pi Network credentials');
      }
      this.piInstance = new PiNetworkClass(config.serverApiKey, config.walletPrivateSeed);
      console.log('✅ PiNetwork SDK initialized for A2U');
    } else {
      console.log('🧪 Using mock A2U payment implementation');
    }
  }

  async createA2UPayment(paymentArgs: A2UPaymentArgs): Promise<string | null> {
    console.log('createA2UPayment called with:', JSON.stringify(paymentArgs, null, 2));

    if (this.useMock) {
      console.log('Using mock A2U payment implementation');
      return `mock_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      const paymentId = await this.piInstance.createPayment(paymentArgs);
      console.log('✅ Payment created with ID:', paymentId);
      return paymentId;
    } catch (error: any) {
      console.error('❌ A2U payment creation failed:', error.message);
      return null;
    }
  }

  async submitPaymentToBlockchain(paymentId: string): Promise<string | null> {
    console.log('submitPaymentToBlockchain called with paymentId:', paymentId);

    if (this.useMock) {
      console.log('Using mock blockchain submission');
      return `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      const txid = await this.piInstance.submitPayment(paymentId);
      console.log('✅ Payment submitted with txid:', txid);
      return txid;
    } catch (error: any) {
      console.error('❌ Payment submission failed:', error.message);
      return null;
    }
  }

  async completePaymentInServer(paymentId: string, txid: string): Promise<A2UPaymentDTO | null> {
    console.log('completePaymentInServer called with paymentId:', paymentId, 'txid:', txid);

    if (this.useMock) {
      console.log('Using mock payment completion');
      return {
        identifier: paymentId,
        status: {
          developer_approved: true,
          transaction_verified: true,
          developer_completed: true,
          cancelled: false,
          user_cancelled: false
        },
        transaction: {
          txid,
          verified: true,
          _link: `https://sandbox.minepi.com/transaction/${txid}`
        },
        user_uid: '',
        amount: 0,
        memo: '',
        metadata: {},
        from_address: '',
        to_address: '',
        direction: 'app_to_user',
        created_at: new Date().toISOString(),
        network: 'Pi Testnet'
      };
    }

    try {
      const completedPayment = await this.piInstance.completePayment(paymentId, txid);
      console.log('✅ Payment completed:', JSON.stringify(completedPayment.status, null, 2));
      return completedPayment;
    } catch (error: any) {
      console.error('❌ Payment completion failed:', error.message);
      return null;
    }
  }

  async processFullA2UPayment(paymentArgs: A2UPaymentArgs): Promise<A2UPaymentResult | null> {
    console.log('processFullA2UPayment called with:', JSON.stringify(paymentArgs, null, 2));

    try {
      const paymentId = await this.createA2UPayment(paymentArgs);
      if (!paymentId) {
        console.error('Failed to create payment');
        return null;
      }

      const txid = await this.submitPaymentToBlockchain(paymentId);
      if (!txid) {
        console.error('Failed to submit payment to blockchain');
        return null;
      }

      const completedPayment = await this.completePaymentInServer(paymentId, txid);
      if (!completedPayment) {
        console.error('Failed to complete payment');
        return null;
      }

      console.log('✅ Full A2U payment process completed successfully');
      return { 
        paymentId, 
        txid, 
        payment: completedPayment,
        status: 'success'
      };
    } catch (error: any) {
      console.error('❌ Full A2U payment process failed:', error.message);
      return { 
        paymentId: '', 
        txid: '', 
        payment: null as any,
        status: 'failed',
        error: error.message 
      };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pi-network-a2u.__tests__.ts`
Expected: PASS

- [ ] **Step 5: Write test for full A2U payment flow**

```typescript
it('should process full A2U payment flow in mock mode', async () => {
  const paymentArgs = {
    amount: 1.5,
    memo: 'Test refund',
    metadata: { type: 'refund' },
    uid: 'test_user_123'
  };

  const result = await service.processFullA2UPayment(paymentArgs);

  expect(result).toBeDefined();
  expect(result?.status).toBe('success');
  expect(result?.paymentId).toContain('mock_payment_');
  expect(result?.txid).toContain('mock_tx_');
  expect(result?.payment).toBeDefined();
  expect(result?.payment.status.developer_completed).toBe(true);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- pi-network-a2u.__tests__.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/pi-network-a2u.ts src/lib/pi-network-a2u.__tests__.ts
git commit -m "feat: implement A2U payment service layer with mock support"
```

---

## Task 4: Create Database Migration for A2U Payments

**Files:**
- Create: `database/migrations/007_add_a2u_payments.sql`

- [ ] **Step 1: Write the database migration**

```sql
-- ============================================================================
-- A2U (App-to-User) Payment Support
-- ============================================================================

-- Add A2U-specific columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS a2u_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_txid VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_from_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_to_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_network VARCHAR(50),
ADD COLUMN IF NOT EXISTS a2u_completed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for A2U payment lookups
CREATE INDEX IF NOT EXISTS idx_sales_a2u_payment_id ON sales(a2u_payment_id) WHERE a2u_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_a2u_txid ON sales(a2u_txid) WHERE a2u_txid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_a2u_user ON sales(customer_id) WHERE a2u_payment_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN sales.a2u_payment_id IS 'Pi Network payment ID for A2U transactions';
COMMENT ON COLUMN sales.a2u_txid IS 'Blockchain transaction ID for A2U payments';
COMMENT ON COLUMN sales.a2u_from_address IS 'App wallet address that sent the payment';
COMMENT ON COLUMN sales.a2u_to_address IS 'User wallet address that received the payment';
COMMENT ON COLUMN sales.a2u_network IS 'Pi Network used (Pi Testnet or Pi Network)';
COMMENT ON COLUMN sales.a2u_completed_at IS 'Timestamp when A2U payment was completed';

-- Add wallet_address to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pi_wallet_address VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_pi_wallet_address ON users(pi_wallet_address) WHERE pi_wallet_address IS NOT NULL;

COMMENT ON COLUMN users.pi_wallet_address IS 'User Pi Network wallet address for receiving A2U payments';
```

- [ ] **Step 2: Test the migration**

Run: `npm run migrate`
Expected: Migration applies successfully without errors

- [ ] **Step 3: Verify migration status**

Run: `npm run migrate:status`
Expected: Migration 007_add_a2u_payments.sql shows as applied

- [ ] **Step 4: Commit**

```bash
git add database/migrations/007_add_a2u_payments.sql
git commit -m "schema: add A2U payment support to sales and users tables"
```

---

## Task 5: Create A2U Payment API Route

**Files:**
- Create: `src/app/api/payments/a2u/route.ts`
- Test: `src/app/api/payments/a2u/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test for API route**

```typescript
// src/app/api/payments/a2u/__tests__/route.test.ts
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/payments/a2u', () => {
  it('should return 400 for missing uid', async () => {
    const request = new NextRequest('http://localhost:3000/api/payments/a2u', {
      method: 'POST',
      body: JSON.stringify({ amount: 1.5 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('uid and amount required');
  });

  it('should return 400 for missing amount', async () => {
    const request = new NextRequest('http://localhost:3000/api/payments/a2u', {
      method: 'POST',
      body: JSON.stringify({ uid: 'test_user' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('uid and amount required');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- route.test.ts`
Expected: FAIL - Route not defined

- [ ] **Step 3: Write minimal API route implementation**

```typescript
// src/app/api/payments/a2u/route.ts
/**
 * POST /api/payments/a2u - Send Pi from app to user (A2U payment)
 * Handles refunds, rewards, and payouts from app wallet to user wallets
 */

import { NextRequest, NextResponse } from 'next/server';
import { PiNetworkA2UService } from '@/lib/pi-network-a2u';
import { query } from '@/lib/db';
import type { A2UPaymentRequest, A2UPaymentResponse } from '@/lib/types/a2u';

/**
 * Validate Pi amount (must be between 0.001 and 1,000,000)
 */
function validateAmount(amount: number): boolean {
  return amount >= 0.001 && amount <= 1000000 && Number.isFinite(amount);
}

/**
 * Generate unique transaction ID
 */
function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: A2UPaymentRequest = await request.json();
    const { uid, amount, memo, metadata, transaction_type = 'payout' } = body;

    // Basic validation
    if (!uid || !amount) {
      return NextResponse.json({
        error: "uid and amount required",
        timestamp: new Date().toISOString()
      } as A2UPaymentResponse, { status: 400 });
    }

    if (!validateAmount(amount)) {
      return NextResponse.json({
        error: "Invalid amount: must be between 0.001 and 1,000,000",
        timestamp: new Date().toISOString()
      } as A2UPaymentResponse, { status: 400 });
    }

    // Get user by Pi UID
    const userResult = await query(
      'SELECT id, username, pi_uid FROM users WHERE pi_uid = $1 AND deleted_at IS NULL',
      [uid]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        error: "User not found or invalid Pi UID",
        timestamp: new Date().toISOString()
      } as A2UPaymentResponse, { status: 404 });
    }

    const user = userResult.rows[0];
    console.log(`A2U Payment: Sending ${amount} Pi to user ${user.username} (UID: ${uid})`);

    // Initialize A2U service (use mock mode for testing)
    const a2uService = new PiNetworkA2UService({ 
      useMock: process.env.NODE_ENV === 'test' || process.env.PI_A2U_MOCK === 'true',
      serverApiKey: process.env.PI_SERVER_API_KEY || '',
      walletPrivateSeed: process.env.WALLET_PRIVATE_SEED || '',
      network: process.env.PI_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
    });

    // Process full A2U payment flow
    const paymentResult = await a2uService.processFullA2UPayment({
      amount: Number(amount),
      memo: memo || `${transaction_type.charAt(0).toUpperCase() + transaction_type.slice(1)}`,
      metadata: {
        type: "A2U",
        transaction_type,
        user_id: user.id,
        username: user.username,
        timestamp: Date.now(),
        ...metadata
      },
      uid
    });

    if (!paymentResult || paymentResult.status === 'failed') {
      return NextResponse.json({
        error: "Payment failed",
        details: paymentResult?.error || 'Unknown error',
        timestamp: new Date().toISOString()
      } as A2UPaymentResponse, { status: 500 });
    }

    // Create sales record for A2U transaction
    const transactionId = generateTransactionId();
    const salesResult = await query(`
      INSERT INTO sales (
        transaction_number, 
        merchant_id, 
        customer_id, 
        transaction_type,
        subtotal, 
        tax_amount, 
        discount_amount, 
        total_amount,
        payment_method, 
        payment_status, 
        pi_payment_id, 
        pi_transaction_id,
        a2u_payment_id,
        a2u_txid,
        a2u_from_address,
        a2u_to_address,
        a2u_network,
        a2u_completed_at,
        status,
        completed_at,
        metadata,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING id
    `, [
      transactionId,
      null, // merchant_id (null for platform transactions)
      user.id,
      transaction_type, // transaction_type
      Number(amount), // subtotal
      0.00, // tax_amount
      0.00, // discount_amount
      Number(amount), // total_amount
      'pi', // payment_method
      'completed', // payment_status
      paymentResult.paymentId, // pi_payment_id
      paymentResult.txid, // pi_transaction_id
      paymentResult.paymentId, // a2u_payment_id
      paymentResult.txid, // a2u_txid
      paymentResult.payment.from_address || '', // a2u_from_address
      paymentResult.payment.to_address || '', // a2u_to_address
      paymentResult.payment.network, // a2u_network
      new Date(), // a2u_completed_at
      'completed', // status
      new Date(), // completed_at
      JSON.stringify({ ...paymentResult, ...metadata }), // metadata
      memo || `${transaction_type.charAt(0).toUpperCase() + transaction_type.slice(1)}` // notes
    ]);

    const saleId = salesResult.rows[0].id;
    console.log(`✅ A2U transaction saved to database: ${transactionId} (sale_id: ${saleId})`);

    return NextResponse.json({
      success: true,
      paymentId: paymentResult.paymentId,
      txid: paymentResult.txid,
      transactionId,
      amount: Number(amount),
      user: {
        id: user.id,
        username: user.username,
        piUID: user.pi_uid
      },
      status: paymentResult.payment.status,
      timestamp: new Date().toISOString()
    } as A2UPaymentResponse);

  } catch (error: any) {
    console.error("A2U Payment Error:", error.message);

    return NextResponse.json({
      error: "Payment failed",
      details: error.message,
      timestamp: new Date().toISOString()
    } as A2UPaymentResponse, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- route.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for successful A2U payment**

```typescript
it('should process successful A2U payment', async () => {
  const requestBody = {
    uid: 'test_user_123',
    amount: 1.5,
    memo: 'Test refund',
    transaction_type: 'refund'
  };

  const request = new NextRequest('http://localhost:3000/api/payments/a2u', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  // Mock the database query to return a test user
  jest.spyOn(require('@/lib/db'), 'query').mockResolvedValue({
    rows: [{
      id: 'user-id-123',
      username: 'testuser',
      pi_uid: 'test_user_123'
    }]
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.paymentId).toContain('mock_payment_');
  expect(data.txid).toContain('mock_tx_');
  expect(data.amount).toBe(1.5);
  expect(data.user.username).toBe('testuser');
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- route.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/payments/a2u/route.ts src/app/api/payments/a2u/__tests__/route.test.ts
git commit -m "feat: add A2U payment API endpoint with validation and database integration"
```

---

## Task 6: Update Frontend Authentication with wallet_address Scope

**Files:**
- Modify: `src/hooks/use-pi-network.tsx`

- [ ] **Step 1: Find the authenticate function in the hook**

Read the existing `use-pi-network.tsx` file to locate the authenticate function

- [ ] **Step 2: Update authentication to include wallet_address scope**

```typescript
// Find the existing authenticate function and update the scope array
const authenticate = async () => {
  setIsLoading(true);
  try {
    // Define the onIncompletePaymentFound callback
    const onIncompletePaymentFound = async (payment: any) => {
      console.log('Incomplete payment found:', payment);
      try {
        // Notify the backend about the incomplete payment
        await apiRequest('POST', '/api/payment/incomplete', {
          paymentId: payment.identifier,
        });
        console.log('Incomplete payment reported to backend');
      } catch (error) {
        console.error('Failed to report incomplete payment:', error);
      }
    };

    // IMPORTANT: Include 'wallet_address' scope for A2U payments
    const authResult = await piSDK.authenticate(
      ['username', 'payments', 'wallet_address'],  // Added 'wallet_address' scope
      onIncompletePaymentFound
    );
    
    if (!authResult) {
      throw new Error('Authentication failed - User cancelled or Pi SDK not available. Please ensure you grant all requested permissions including payments.');
    }

    // Send access token to backend for verification
    const response = await apiRequest('POST', '/api/auth/pi', {
      accessToken: authResult.accessToken,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Authentication failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    setUser(data.user);
    setToken(data.token);
    setIsAuthenticated(true);
    
    // Save to localStorage
    localStorage.setItem('pi_token', data.token);
    localStorage.setItem('pi_user', JSON.stringify(data.user));
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Provide better error messaging for scope-related issues
    let errorMessage = (error as Error).message;
    if (errorMessage.includes('scope') || errorMessage.includes('payment') ||
        errorMessage.includes('auth') || errorMessage.includes('permissions')) {
      errorMessage = "Payment permissions missing. Please ensure you grant all requested permissions including payments when authenticating.";
    }
    
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem('pi_token');
    localStorage.removeItem('pi_user');
    
    throw new Error(errorMessage);
  }
  setIsLoading(false);
};
```

- [ ] **Step 3: Test authentication flow**

Run: `npm run dev`
Expected: Authentication now requests wallet_address scope

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-pi-network.tsx
git commit -m "feat: add wallet_address scope to authentication for A2U payments"
```

---

## Task 7: Create Environment Configuration Documentation

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create environment configuration example**

```bash
# Pi Network Configuration
PI_NETWORK=testnet  # or 'mainnet'
PI_SERVER_API_KEY=your_pi_server_api_key_here
WALLET_PRIVATE_SEED=your_wallet_private_seed_here
PI_A2U_MOCK=false  # Set to 'true' for testing without real transactions

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mypipos

# App Configuration
NEXT_PUBLIC_PI_NETWORK=testnet  # Matches PI_NETWORK
NEXT_PUBLIC_PI_APP_ID=your_pi_app_id
```

- [ ] **Step 2: Update README with A2U setup instructions**

Add to `README.md`:

```markdown
## A2U (App-to-User) Payment Setup

To enable A2U payments for refunds, rewards, and payouts:

1. **Get Pi Network Credentials:**
   - Server API Key from Pi Network Developer Portal
   - Wallet Private Seed from your app wallet

2. **Configure Environment Variables:**
   ```bash
   PI_NETWORK=testnet  # or 'mainnet'
   PI_SERVER_API_KEY=your_key_here
   WALLET_PRIVATE_SEED=your_seed_here
   ```

3. **Update Frontend Authentication:**
   The app now requests `wallet_address` scope during authentication to enable A2U payments.

4. **Testing:**
   Set `PI_A2U_MOCK=true` to test without real transactions.

## A2U Payment API

### Send A2U Payment

```bash
POST /api/payments/a2u
Content-Type: application/json

{
  "uid": "user_pi_uid",
  "amount": 1.5,
  "memo": "Refund for order #123",
  "transaction_type": "refund",
  "metadata": {
    "order_id": "123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "payment_id_here",
  "txid": "blockchain_txid",
  "transactionId": "txn_1234567890_abc123",
  "amount": 1.5,
  "user": {
    "id": "user_id",
    "username": "username",
    "piUID": "user_pi_uid"
  },
  "status": {
    "developer_approved": true,
    "transaction_verified": true,
    "developer_completed": true
  },
  "timestamp": "2026-05-24T12:00:00.000Z"
}
```
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add A2U payment setup and configuration documentation"
```

---

## Task 8: Create Integration Tests

**Files:**
- Create: `src/app/api/payments/a2u/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
/**
 * Integration tests for A2U payment flow
 * Tests the complete flow from API request to database record
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { PiNetworkA2UService } from '@/lib/pi-network-a2u';

describe('A2U Payment Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await query("DELETE FROM sales WHERE transaction_number LIKE 'test_%'");
    await query("DELETE FROM users WHERE pi_uid LIKE 'test_%'");
  });

  afterEach(async () => {
    // Clean up test data
    await query("DELETE FROM sales WHERE transaction_number LIKE 'test_%'");
    await query("DELETE FROM users WHERE pi_uid LIKE 'test_%'");
  });

  it('should complete full A2U payment flow and create database record', async () => {
    // Create test user
    await query(`
      INSERT INTO users (id, username, pi_uid, user_type, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['test-user-id', 'testuser', 'test_user_123', 'pioneer', 'customer', true]);

    const requestBody = {
      uid: 'test_user_123',
      amount: 2.5,
      memo: 'Integration test payment',
      transaction_type: 'payout'
    };

    const request = new NextRequest('http://localhost:3000/api/payments/a2u', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.paymentId).toBeDefined();
    expect(data.txid).toBeDefined();
    expect(data.transactionId).toBeDefined();

    // Verify database record was created
    const salesResult = await query(
      'SELECT * FROM sales WHERE transaction_number = $1',
      [data.transactionId]
    );

    expect(salesResult.rows.length).toBe(1);
    const sale = salesResult.rows[0];
    
    expect(sale.total_amount).toBe('2.5');
    expect(sale.payment_method).toBe('pi');
    expect(sale.payment_status).toBe('completed');
    expect(sale.a2u_payment_id).toBe(data.paymentId);
    expect(sale.a2u_txid).toBe(data.txid);
    expect(sale.status).toBe('completed');
  });

  it('should handle invalid amounts correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/payments/a2u', {
      method: 'POST',
      body: JSON.stringify({
        uid: 'test_user_123',
        amount: 0.0001  // Below minimum
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid amount');
  });

  it('should handle non-existent users correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/payments/a2u', {
      method: 'POST',
      body: JSON.stringify({
        uid: 'nonexistent_user',
        amount: 1.0
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('User not found');
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npm test -- integration.test.ts`
Expected: PASS (all integration tests pass)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/payments/a2u/__tests__/integration.test.ts
git commit -m "test: add A2U payment integration tests"
```

---

## Task 9: Create Helper Functions for Common A2U Operations

**Files:**
- Create: `src/lib/a2u-helpers.ts`
- Test: `src/lib/a2u-helpers.__tests__.ts`

- [ ] **Step 1: Write the failing test for helper functions**

```typescript
// src/lib/a2u-helpers.__tests__.ts
import { describe, it, expect } from 'vitest';
import { processRefund, sendReward, validateA2URequest } from '../a2u-helpers';

describe('A2U Helper Functions', () => {
  it('should validate correct A2U requests', () => {
    const validRequest = {
      uid: 'test_user',
      amount: 1.5,
      memo: 'Test'
    };

    const result = validateA2URequest(validRequest);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid A2U requests', () => {
    const invalidRequest = {
      uid: '',
      amount: -1
    };

    const result = validateA2URequest(invalidRequest);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- a2u-helpers.__tests__.ts`
Expected: FAIL - Functions not defined

- [ ] **Step 3: Write helper functions implementation**

```typescript
/**
 * Helper functions for common A2U operations
 * Provides convenience functions for refunds, rewards, and payouts
 */

import type { A2UPaymentRequest, A2UPaymentResponse } from './types/a2u';

/**
 * Validate A2U payment request
 */
export function validateA2URequest(request: Partial<A2UPaymentRequest>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.uid || typeof request.uid !== 'string' || request.uid.trim() === '') {
    errors.push('Valid uid is required');
  }

  if (!request.amount || typeof request.amount !== 'number') {
    errors.push('Amount is required and must be a number');
  } else if (request.amount < 0.001) {
    errors.push('Amount must be at least 0.001 Pi');
  } else if (request.amount > 1000000) {
    errors.push('Amount must not exceed 1,000,000 Pi');
  }

  if (request.transaction_type && !['payout', 'refund', 'reward'].includes(request.transaction_type)) {
    errors.push('Transaction type must be payout, refund, or reward');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Process refund for a sale
 */
export async function processRefund(saleId: string, amount?: number): Promise<A2UPaymentResponse> {
  try {
    // Get sale details
    const response = await fetch('/api/sales/' + saleId);
    if (!response.ok) {
      throw new Error('Sale not found');
    }

    const sale = await response.json();
    const refundAmount = amount || sale.total_amount;

    // Get user's Pi UID
    const userResponse = await fetch('/api/users/' + sale.customer_id);
    const user = await userResponse.json();

    // Process A2U refund
    const a2uResponse = await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.pi_uid,
        amount: refundAmount,
        memo: `Refund for sale #${sale.transaction_number}`,
        transaction_type: 'refund',
        metadata: { original_sale_id: saleId }
      })
    });

    return await a2uResponse.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    } as A2UPaymentResponse;
  }
}

/**
 * Send reward to user
 */
export async function sendReward(userId: string, amount: number, reason: string): Promise<A2UPaymentResponse> {
  try {
    // Get user details
    const userResponse = await fetch('/api/users/' + userId);
    const user = await userResponse.json();

    // Process A2U reward
    const a2uResponse = await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.pi_uid,
        amount,
        memo: `Reward: ${reason}`,
        transaction_type: 'reward',
        metadata: { reward_reason: reason }
      })
    });

    return await a2uResponse.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    } as A2UPaymentResponse;
  }
}

/**
 * Process payout to user
 */
export async function processPayout(userId: string, amount: number, description: string): Promise<A2UPaymentResponse> {
  try {
    // Get user details
    const userResponse = await fetch('/api/users/' + userId);
    const user = await userResponse.json();

    // Process A2U payout
    const a2uResponse = await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.pi_uid,
        amount,
        memo: description,
        transaction_type: 'payout'
      })
    });

    return await a2uResponse.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    } as A2UPaymentResponse;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- a2u-helpers.__tests__.ts`
Expected: PASS

- [ ] **Step 5: Add tests for processRefund and sendReward**

```typescript
it('should validate amount bounds correctly', () => {
  const tooSmall = { uid: 'test', amount: 0.0001 };
  const tooLarge = { uid: 'test', amount: 1000001 };
  const valid = { uid: 'test', amount: 1.0 };

  expect(validateA2URequest(tooSmall).isValid).toBe(false);
  expect(validateA2URequest(tooLarge).isValid).toBe(false);
  expect(validateA2URequest(valid).isValid).toBe(true);
});

it('should validate transaction types correctly', () => {
  const validTypes = ['payout', 'refund', 'reward'];
  
  validTypes.forEach(type => {
    const result = validateA2URequest({ uid: 'test', amount: 1.0, transaction_type: type as any });
    expect(result.isValid).toBe(true);
  });

  const invalidType = validateA2URequest({ uid: 'test', amount: 1.0, transaction_type: 'invalid' as any });
  expect(invalidType.isValid).toBe(false);
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- a2u-helpers.__tests__.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/a2u-helpers.ts src/lib/a2u-helpers.__tests__.ts
git commit -m "feat: add A2U helper functions for refunds, rewards, and payouts"
```

---

## Task 10: End-to-End Testing and Documentation

**Files:**
- Create: `docs/a2u-payment-guide.md`

- [ ] **Step 1: Create comprehensive usage guide**

```markdown
# A2U Payment Integration Guide

## Overview

A2U (App-to-User) payments allow your myPiPOS application to send Pi from the app wallet to user wallets. This is useful for:
- Processing refunds
- Sending loyalty rewards  
- Paying out commissions
- Any scenario where the app needs to send money to users

## Setup Requirements

1. **Pi Network Credentials:**
   - Server API Key from Pi Network Developer Portal
   - Wallet Private Seed from your app wallet
   - Configure in environment variables (see .env.example)

2. **Database Migration:**
   ```bash
   npm run migrate
   ```
   This adds A2U support to existing tables.

3. **Frontend Authentication:**
   Users must authenticate with `wallet_address` scope to receive A2U payments.

## Usage Examples

### Process a Refund

```typescript
import { processRefund } from '@/lib/a2u-helpers';

// Refund full sale amount
const result = await processRefund('sale-id-123');

// Refund partial amount
const partialRefund = await processRefund('sale-id-123', 1.5);
```

### Send a Reward

```typescript
import { sendReward } from '@/lib/a2u-helpers';

const result = await sendReward('user-id-456', 2.5, 'Loyalty bonus');
```

### Process a Payout

```typescript
import { processPayout } from '@/lib/a2u-helpers';

const result = await processPayout('user-id-789', 10.0, 'Monthly commission');
```

### Direct API Call

```typescript
const response = await fetch('/api/payments/a2u', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: 'user_pi_uid',
    amount: 1.5,
    memo: 'Refund for order #123',
    transaction_type: 'refund',
    metadata: { order_id: '123' }
  })
});

const result = await response.json();
```

## Testing

### Mock Mode
Set `PI_A2U_MOCK=true` in environment to test without real transactions:
```bash
PI_A2U_MOCK=true npm run dev
```

### Integration Tests
```bash
npm test -- integration.test.ts
```

## Error Handling

All A2U operations return a standard response:
```typescript
{
  success: boolean;
  paymentId?: string;
  txid?: string;
  error?: string;
  details?: string;
  timestamp: string;
}
```

## Security Considerations

1. **Never expose wallet credentials** in frontend code
2. **Always validate user permissions** before processing A2U payments
3. **Use mock mode for development** and testing
4. **Monitor transaction limits** to prevent abuse
5. **Implement rate limiting** on A2U endpoints

## Troubleshooting

### Common Issues

1. **"Missing Pi Network credentials"**
   - Check PI_SERVER_API_KEY and WALLET_PRIVATE_SEED in environment

2. **"User not found or invalid Pi UID"**
   - Ensure user exists and has valid pi_uid in database
   - User must have authenticated with wallet_address scope

3. **"Payment permissions missing"**
   - User needs to re-authenticate with wallet_address scope
   - Check frontend authentication is requesting all required scopes

4. **Transaction stuck in pending**
   - Check Pi Network service status
   - Verify wallet has sufficient balance
   - Check transaction in Pi Blockchain explorer
```

- [ ] **Step 2: Test end-to-end flow**

Run: `npm run dev`
Test: Complete full A2U payment flow using the API endpoint
Expected: Payment created, submitted to blockchain, completed, and saved to database

- [ ] **Step 3: Verify all tests pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add docs/a2u-payment-guide.md
git commit -m "docs: add comprehensive A2U payment integration guide"
```

---

## Summary

This implementation plan provides:

✅ **Complete A2U payment functionality** - Create, submit, and complete A2U payments
✅ **Service layer architecture** - Clean separation of concerns with PiNetworkA2UService  
✅ **API endpoint** - RESTful POST endpoint for A2U payments
✅ **Database integration** - Schema updates and record tracking
✅ **Type safety** - Full TypeScript support with comprehensive types
✅ **Testing** - Unit, integration, and end-to-end tests
✅ **Error handling** - Comprehensive validation and error responses
✅ **Security** - Wallet credentials protected, proper validation
✅ **Documentation** - Complete setup and usage guide
✅ **Mock mode** - Safe testing without real transactions

**Estimated implementation time:** 4-6 hours for all tasks

**Next steps after implementation:**
1. Test with real Pi Network credentials in testnet
2. Monitor transaction processing and error rates  
3. Set up alerts for failed payments
4. Implement admin dashboard for A2U transaction monitoring
5. Add rate limiting to prevent abuse
