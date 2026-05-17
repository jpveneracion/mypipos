# PiPOS — Point of Sale System for Pi Network

## What This Is

A Point of Sale (POS) system built on Pi Network that enables merchants to scan items using Pi Browser and process payments through Pi's escrow system, coupled with a desktop inventory management interface for managing products, stock, and sales reports. The system supports mixed business types (retail, restaurant, service) and handles medium-sized inventories (100-1000 items).

## Core Value

Enable small businesses to accept Pi Network payments with lower transaction fees while providing robust inventory management capabilities through an easy-to-use scanning and management interface.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Pi Browser Scanner** — Merchant interface for scanning purchased items and building orders
- [ ] **Escrow Payment Integration** — Create escrow vaults for orders and process Pi payments through Pi Network
- [ ] **Desktop Authentication** — Hybrid authentication system (Pi Network account + desktop password login)
- [ ] **Product Catalog Management** — Create, read, update, delete products with names, prices, descriptions, and categories
- [ ] **Inventory Tracking** — Monitor stock levels, track quantities, and receive low stock alerts
- [ ] **Sales Reports** — View sales history, revenue analytics, and business trends
- [ ] **Multi-Business Support** — Flexible system supporting retail, restaurant, and mixed-use business types
- [ ] **Order Completion Flow** — End-to-end workflow from scanning to payment confirmation to item release

### Out of Scope

- **Employee management** — Focused on single-merchant operations initially
- **Multi-location inventory** — Single location per business for v1
- **Advanced accounting** — Basic sales tracking only, not full accounting suite
- **Customer management** — Transaction-focused, not CRM features
- **Hardware integration** — Software-based scanning only (no dedicated POS hardware)

## Context

**Pi Network Ecosystem**: Pi Network is a cryptocurrency platform with a growing user base of "pioneers" who use the Pi Browser and mobile app. The network supports decentralized applications and payment processing through an escrow system that provides security for both buyers and sellers.

**Small Business Pain Points**: Traditional payment processors charge high transaction fees (2-3% or more) that cut into already-thin margins for small businesses. Additionally, many POS systems are expensive, complex, or require specialized hardware.

**Decentralized Payment Advantages**: By leveraging Pi Network's escrow system, merchants can accept payments with lower fees, faster settlement times, and without relying on traditional financial intermediaries. The system also provides access to Pi's ecosystem of millions of potential customers.

**Technical Environment**: Pi Network provides APIs for dApp integration, escrow services, and user authentication. The Pi Browser serves as both a wallet and application platform. Desktop interface provides traditional keyboard/mouse management capabilities.

## Constraints

- **Pi Network API**: Must work within current Pi Network API capabilities and limitations
- **Production Quality**: v1 must be production-ready, not prototype quality
- **Inventory Scale**: System optimized for 100-1000 items per business
- **Escrow Dependency**: Payment processing relies on Pi Network's escrow system availability
- **Authentication Flow**: Hybrid approach requires both Pi Network and local authentication systems

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid authentication (Pi Network + local password) | Balances Pi Network security with desktop usability | — Pending |
| Pi Browser as primary scanning interface | Leverages existing Pi ecosystem, provides built-in wallet access | — Pending |
| Escrow-based payment processing | Provides security for both merchants and customers | — Pending |
| Desktop for inventory management | Better UX for detailed management tasks than mobile interface | — Pending |
| Multi-business type support | Single system can serve retail, restaurant, and service businesses | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2025-05-17 after initialization*