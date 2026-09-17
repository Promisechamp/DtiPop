# POP Borrow & Lend — Deposits, Protection & POP Coin Rewards

**Status:** Planned / Future Implementation  
**Feature Area:** POP Community → Borrow & Lend  
**Priority:** Future  
**Dependencies:** Borrow & Lend lifecycle, POP Reputation, POP Reliability Events, payment infrastructure, dispute system

---

## 1. Overview

POP Borrow & Lend will eventually support a financial protection and incentive layer around community borrowing.

The goal is to make lending assets to other community members safer and more rewarding while also giving borrowers an incentive to complete borrowing transactions responsibly.

The system will introduce three separate concepts:

1. **Security Deposit**
   - Financial security attached to a borrowing transaction.
   - Primarily protects the lender against loss, damage, non-return, or other agreed risks.

2. **POP Protection**
   - A POP-managed protection/dispute mechanism.
   - Provides a structured process for handling physical damage, disputes, and transaction evidence.

3. **POP Coin**
   - An internal reward currency.
   - Rewards positive participation in the Borrow & Lend ecosystem.
   - POP Coin is separate from the security deposit.

These three systems must remain conceptually and technically separate.

---

## 2. Core Principle

A security deposit is **not revenue**.

If a borrower pays a ₦100,000 deposit and that deposit is eventually returned, POP must not treat the ₦100,000 as income.

The deposit exists primarily as security for the lending transaction.

POP Coin rewards must therefore have a separate funding source.

Example:

Borrower
   │
   ├── Security Deposit ───────────────► Deposit System
   │
   └── Completes transaction
                 │
                 ▼
          Reward Calculation
             │          │
             ▼          ▼
        Borrower      Lender
        POP Coin      POP Coin
```

---

## 3. Security Deposit

### Purpose

The security deposit gives the lender financial protection when allowing another community member to use their asset.

A lender may configure whether a deposit is required for an asset.

Possible future configuration:

Deposit required: Yes / No

Deposit amount:
₦__________

Deposit type:
- Fixed amount
- Percentage of asset value

The initial implementation should preferably support a fixed amount first.
If lender must chose "Percentage of asset value", then the assets purchase details
like the purchase cost, year etc must be made public for borrowers to see. 
---

## 4. Deposit Ownership & Custody

The product must clearly distinguish:

- **Deposit ownership**
- **Deposit custody**

The deposit belongs economically to the borrowing transaction and is subject to the transaction's outcome.

However, POP should not assume that sending the money directly to the lender's ordinary personal account provides adequate dispute protection.

### Important architectural requirement

If POP is expected to provide meaningful protection in a dispute, the payment architecture should preserve appropriate control over the deposit.

Possible future architecture:

Borrower
   │
   │ Deposit
   ▼
Payment / Escrow Layer
   │
   ├── Transaction active
   ├── Return confirmed
   ├── Dispute
   └── Release decision
   │
   ├──────────────► Lender
   │
   └──────────────► Borrower
```

The exact custody mechanism must be determined later based on payment-provider capabilities, legal requirements, and POP's operating model.

Do not implement an assumption that POP can reverse or recover money simply because the transaction was initiated through POP.

---

## 5. Deposit Lifecycle

A future deposit should have an explicit lifecycle.

Example:

required
   ↓
pending
   ↓
paid
   ↓
held
   ↓
asset_returned
   ↓
return_confirmation
   ↓
protection_window
   ↓
released
```

Possible alternative outcomes:

held
  ├──► released_to_borrower
  ├──► released_to_lender
  └──► disputed
           ↓
       resolution
           ↓
       final_release
```

The system must never rely only on a boolean such as:
deposit_paid = true
```

A proper status/state model is required.

---

## 6. Deposit Return Timing

Current product concept:

> The deposit should be returned to the lender 7 days after the asset is returned.

This needs to be interpreted carefully.

The 7-day period should represent a **protection/dispute window**, not simply a delay in payment.

Suggested lifecycle:

Asset returned
      ↓
Condition recorded
      ↓
7-day protection/dispute window
      ↓
No dispute
      ↓
Deposit released according to transaction rules
```

If a dispute is opened during the window:

Asset returned
      ↓
Dispute opened
      ↓
Deposit remains unresolved
      ↓
Evidence / review
      ↓
Resolution
      ↓
Final deposit allocation
```

The exact number of days should remain configurable rather than hard-coded into the database architecture.

---

## 7. POP Protection

POP Protection is different from the deposit.

The deposit is the financial security mechanism.

POP Protection is the process/system used to help handle disputes involving the physical asset.

Potential protected scenarios include:

- Asset returned damaged
- Asset not returned
- Asset returned with missing components
- Condition disputed
- Borrower claims damage existed before pickup
- Lender claims damage occurred during borrowing
- Borrower claims the asset was already defective
- Lender and borrower disagree about the return condition

POP should use transaction evidence when evaluating these situations.

---

## 8. Existing Evidence System

The existing Borrow & Lend lifecycle already provides useful evidence points.

The future protection system should build on these rather than creating a separate unrelated system.

Existing lifecycle information includes:

conditionBefore
borrowerReceivedNotes

conditionAfter
borrowerReturnNotes

ownerReturnConfirmationNotes
```

Future protection should also be able to reference:

```text
asset photos
pickup evidence
return evidence
timestamps
borrow transaction history
reliability events
reputation history
messages / communication
```

Where possible, evidence should be immutable or versioned after a transaction reaches important lifecycle states.

---

## 9. POP Reputation vs Reliability Events

This feature must preserve the existing distinction.

### `pop_reputation`

Aggregate community reputation.

Examples:

```text
successful borrows
successful lends
late returns
damage incidents
trust score
rating
```

### `pop_reliability_events`

Individual immutable reliability events.

Examples:

```text
borrow completed
late return
asset damaged
borrower ghosted
lender ghosted
asset returned successfully
```

A deposit dispute should not replace these systems.

Instead:

```text
Borrow Transaction
       │
       ├── Deposit
       ├── Protection
       ├── Evidence
       ├── Dispute
       │
       └── Reliability Event
                  │
                  ▼
           POP Reputation
```

---

## 10. POP Coin

POP Coin is an internal reward system designed to encourage positive community behavior.

It should not be treated as the same thing as the security deposit.

```text
Security Deposit
= transaction protection

POP Protection
= dispute/risk process

POP Coin
= participation reward
```

---

## 11. Proposed Borrower Reward

Current product concept:

> Borrower receives 0.05% of the deposit as POP Coin.

Example(actual production will be in $ ):

```text
Deposit = ₦100,000

Borrower reward
= 0.05%
= ₦50 worth of POP Coin
```

The percentage should be configurable and should not be hard-coded into the Borrow Transaction implementation.

Suggested configuration:

```text
borrower_reward_rate
```

---

## 12. Proposed Lender Reward

Current product concept:

> Lender receives 0.10% of the deposit as POP Coin.

Example(actual production will be in $ ):

```text
Deposit = ₦100,000

Lender reward
= 0.10%
= ₦100 worth of POP Coin
```

The lender receives a higher reward because the lender supplies an asset to the community.

Suggested configuration:

```text
lender_reward_rate
```

---

## 13. Reward Eligibility

Rewards should not necessarily be issued immediately when a deposit is paid.

The system should first determine whether the transaction qualifies.

Suggested lifecycle:

```text
Borrow requested
      ↓
Approved
      ↓
Deposit paid
      ↓
Asset picked up
      ↓
Asset used
      ↓
Asset returned
      ↓
Transaction completed
      ↓
Protection/dispute window
      ↓
Reward becomes eligible
```

This prevents users from earning rewards from transactions that are later cancelled, abandoned, or involved in unresolved disputes.

---

## 14. POP Coin Reward States

A reward should have explicit states.

Example:

```text
pending
   ↓
earned
   ↓
vesting
   ↓
vested
   ↓
withdrawable
   ↓
redeemed
```

Possible exception:

```text
pending
   ↓
cancelled
```

or:

```text
vesting
   ↓
revoked
```

if a transaction is later determined to have involved behavior that invalidates the reward.

---

## 15. 60-Day POP Coin Rule

Current product concept:

> POP Coin becomes withdrawable after 60 days.

The 60-day period should be treated as a **vesting/eligibility period**, not merely a database timestamp.

Example:

```text
Reward earned
      ↓
Day 0
      ↓
Vesting
      ↓
Day 60
      ↓
Withdrawable
```

The exact implementation should remain configurable.

Suggested configuration:

```text
reward_vesting_days = 60
```

---

## 16. 5% Rule

The product concept currently includes:

> POP Coin can be withdrawn after 60 days or when it reaches 5%, whichever comes first.

This rule requires clarification before implementation.

The system must define:

> 5% of what?

Possible interpretations include:

- 5% of the original deposit
- 5% of asset value
- 5% of the user's accumulated POP Coin
- 5% of a predefined withdrawal threshold
- another system-wide threshold

Do not implement the 5% rule until this definition is finalized.

---

## 17. POP Reward Pool

POP Coin rewards need a sustainable funding model.

Security deposits should not automatically fund rewards because deposits may need to be returned.

Instead, POP should eventually have a dedicated reward pool.

Possible funding sources:

```text
POP service fees
Protection fees
Premium memberships
Partner revenue
Merchant revenue
Transaction fees
Other legitimate POP revenue
```

Conceptually:

```text
POP Revenue
     │
     ▼
Reward Pool
     │
     ├── Borrower Rewards
     └── Lender Rewards
```

The exact funding model should be decided before POP Coin becomes redeemable for real money.

---

## 18. Recommended Future Data Architecture

The Borrow Transaction should eventually support:

```text
Borrow Transaction
│
├── deposit
│   ├── amount
│   ├── currency
│   ├── status
│   ├── required_at
│   ├── paid_at
│   ├── release_at
│   └── released_at
│
├── protection
│   ├── enabled
│   ├── protection_fee
│   └── status
│
├── condition evidence
│   ├── before
│   └── after
│
├── dispute
│   ├── status
│   ├── reason
│   ├── evidence
│   ├── resolution
│   └── resolved_at
│
├── deposit release
│   ├── outcome
│   ├── borrower_amount
│   ├── lender_amount
│   └── resolved_at
│
├── borrower reward
│   ├── rate
│   ├── amount
│   ├── status
│   └── vesting_until
│
└── lender reward
    ├── rate
    ├── amount
    ├── status
    └── vesting_until
```

---

## 19. POP Coin Wallet Architecture

POP Coin should have its own accounting system.

Do not simply store:

```text
user.pop_coin_balance
```

as the only source of truth.

Use a ledger-based architecture.

Suggested structure:

```text
pop_coin_wallets
```

Stores the current wallet/account.

```text
pop_coin_ledger
```

Stores every balance-changing transaction.

```text
pop_coin_rewards
```

Stores why a reward was earned.

```text
pop_coin_redemptions
```

Stores withdrawals/redemptions.

Example:

```text
POP Coin Wallet
      │
      ▼
POP Coin Ledger
      │
      ├── Borrower reward
      ├── Lender reward
      ├── Adjustment
      ├── Bonus
      ├── Redemption
      └── Reversal
```

The ledger should be append-only wherever practical.

---

## 20. Reward Calculation

Rewards should be calculated from the actual qualifying deposit.

Example:

```text
deposit = ₦100,000

borrower rate = 0.05%
lender rate   = 0.10%

borrower reward = ₦50
lender reward   = ₦100
```

However, the system should not assume that the reward amount is automatically funded.

Reward calculation and reward funding should be separate concerns.

```text
Reward Calculation
        │
        ▼
Reward Eligibility
        │
        ▼
Reward Pool Check
        │
        ▼
Reward Issuance
```

---

## 21. Important Anti-Abuse Requirements

The reward system must be designed with abuse prevention from the beginning.

Potential abuse:

- Users repeatedly borrowing from each other to generate rewards
- Users creating artificial lending transactions
- Users setting unusually high deposits
- Users cancelling transactions after rewards are generated
- Users colluding to generate POP Coin
- Users creating circular lending relationships
- Users manipulating asset values or deposit amounts

Potential controls:

```text
minimum transaction duration
maximum reward per transaction
maximum reward per user/day/month
transaction eligibility requirements
cooldowns
duplicate/collusion detection
minimum asset age
minimum account/reputation requirements
reward pool limits
manual review for suspicious activity
```

These controls should be configurable.

---

## 22. Example Complete Transaction

Example:

```text
Asset:
Cordless Vacuum Cleaner

Lender:
User A

Borrower:
User B

Deposit:
₦100,000

Borrower reward:
0.05% = ₦50 POP Coin

Lender reward:
0.10% = ₦100 POP Coin
```

Transaction:

```text
1. User B requests the vacuum.

2. User A accepts User B.

3. User B pays the ₦100,000 deposit.

4. Deposit enters the configured payment/custody system.

5. Pickup condition is recorded.

6. Asset is used.

7. User B returns the asset.

8. Return condition is recorded.

9. Seven-day protection/dispute window begins.

10. No dispute is raised.

11. Deposit is released according to the deposit rules.

12. Borrow transaction becomes eligible for rewards.

13. ₦50 POP Coin is awarded to User B.

14. ₦100 POP Coin is awarded to User A.

15. Rewards enter vesting.

16. After the configured vesting period, eligible POP Coin becomes withdrawable.
```

---

## 23. Dispute Example

```text
Asset returned
      ↓
Lender reports damage
      ↓
Dispute opened
      ↓
Deposit remains unresolved
      ↓
POP reviews transaction evidence
      ↓
Resolution
```

Possible resolution:

```text
Deposit
├── ₦80,000 → Borrower
└── ₦20,000 → Lender
```

Or:

```text
₦100,000 → Borrower
```

Or:

```text
₦100,000 → Lender
```

The exact resolution rules must be defined separately.

Rewards should also have an explicit rule for disputed transactions.

For example:

```text
Unresolved dispute
= rewards remain pending

Confirmed serious violation
= rewards may be cancelled/reversed
```

---

## 24. UI Considerations

The Borrow & Lend interface should eventually expose deposit information before a borrower submits a request.

Example:

```text
Cordless Vacuum Cleaner

Deposit
₦100,000

Maximum borrowing period
7 days

Protection
Included

Potential POP Coin
Borrower: 0.05%
Lender: 0.10%
```

The UI must clearly distinguish:

```text
Deposit
```

from:

```text
POP Coin reward
```

Users should never be led to believe that the deposit is a fee.

---

## 25. Lender Asset Settings

Future assets may support:

```text
Available for borrowing
Yes / No

Deposit required
Yes / No

Deposit amount
₦__________

Maximum borrow days
7

Protection
Enabled / Disabled
```

These settings should belong to the sharing/lending configuration rather than being mixed into the core ownership data.

---

## 26. Borrow Transaction Integration

The existing Borrow lifecycle should remain the source of truth for the physical lending transaction:

```text
requested
approved
picked_up
in_use
returned
completed
```

Additional financial/protection states should not replace the borrow lifecycle.

Instead:

```text
Borrow Status
+
Deposit Status
+
Protection Status
+
Reward Status
```

should operate as related state machines.

---

## 27. Do Not Couple Everything Into One Status

Avoid a structure such as:

```text
borrow_status =
"completed_with_deposit_released_and_rewards_vested"
```

This becomes difficult to maintain.

Instead:

```text
borrow_status
deposit_status
protection_status
borrower_reward_status
lender_reward_status
```

Each represents a separate concern.

---

## 28. Future APIs

Potential future endpoints:

```text
POST   /borrow/:id/deposit
GET    /borrow/:id/deposit
POST   /borrow/:id/deposit/release

POST   /borrow/:id/dispute
GET    /borrow/:id/dispute
POST   /borrow/:id/dispute/evidence

GET    /pop-coin/wallet
GET    /pop-coin/ledger
GET    /pop-coin/rewards
GET    /pop-coin/redemptions

POST   /pop-coin/redeem
```

Exact routes should be designed when implementation begins.

---

## 29. Implementation Order

When this feature is eventually implemented, build it in stages.

### Phase 1 — Deposit Foundation

- Asset deposit configuration
- Borrow transaction deposit requirement
- Deposit records
- Deposit status lifecycle
- Payment-provider integration
- Deposit release rules

### Phase 2 — Protection

- Return condition evidence
- Protection window
- Dispute creation
- Dispute evidence
- Resolution workflow
- Deposit allocation

### Phase 3 — POP Coin

- POP Coin wallet
- Ledger
- Reward calculation
- Borrower rewards
- Lender rewards
- Reward eligibility
- Vesting

### Phase 4 — Redemption

- Withdrawal/redemption mechanism
- Redemption ledger
- Reward pool
- Funding controls
- Limits
- Fraud/abuse controls

### Phase 5 — Optimization

- Reputation integration
- Reliability-event integration
- Reward multipliers
- Community incentives
- Analytics
- Anti-abuse automation

---

## 30. Important Rules to Preserve

1. **A deposit is not POP revenue.**
2. **POP Coin is not the security deposit.**
3. **POP Protection is not the same thing as the deposit.**
4. **The deposit should not automatically become POP's money.**
5. **Reward calculation must be separate from reward funding.**
6. **Borrower and lender rewards must be independently recorded.**
7. **POP Coin must use a ledger rather than relying solely on a mutable balance.**
8. **Disputed transactions must have explicit reward rules.**
9. **Deposit custody must be designed around the actual payment infrastructure and applicable requirements.**
10. **The 5% withdrawal rule must not be implemented until its reference value is clearly defined.**
11. **Reward percentages must be configurable.**
12. **The existing Borrow & Lend lifecycle remains independent from financial/protection state.**
13. **`pop_reputation` remains an aggregate summary.**
14. **`pop_reliability_events` remains the immutable behavioral history.**
15. **The system must be resistant to reward farming and collusion.**

---

## 31. Product Philosophy

The long-term goal is not simply to add money to POP.

The goal is to create a healthy economic loop:

```text
People own useful things
        ↓
People share those things
        ↓
Other community members borrow them
        ↓
Deposits reduce lending risk
        ↓
POP provides structured protection
        ↓
Good behavior is recorded
        ↓
Good behavior earns POP Coin
        ↓
POP Coin encourages continued participation
        ↓
More useful assets enter the community
        ↓
Community utility increases
```

The financial layer should strengthen the existing community system rather than becoming the reason the system exists.

---

## 32. Status

This feature is **documented for future implementation only**.

No deposit, POP Coin, escrow, reward, or redemption functionality should be implemented until the product rules, funding model, payment architecture, dispute process, and applicable financial/legal requirements have been finalized.
