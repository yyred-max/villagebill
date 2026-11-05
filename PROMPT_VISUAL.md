# TASK: VILLAGEBILL FRONTEND REDESIGN — STARDew VALLEY INSPIRED

Act as a senior frontend engineer, UI/UX designer, and software quality auditor.

Your task is to redesign the EXISTING VillageBill frontend into a cozy pixel-art farming RPG experience inspired by Stardew Valley.

CRITICAL RULE:

**ONLY MODIFY THE FRONTEND PRESENTATION AND USER INTERFACE.**

Do not modify, replace, rewrite, delete, or restructure existing backend functionality, smart contracts, APIs, database schemas, payment logic, wallet logic, authentication, or business logic.

The existing application must continue working exactly as before.

# 1. MANDATORY INITIAL INSPECTION

Before changing any code:

1. Inspect the entire project structure.
2. Read package.json and identify the frontend framework.
3. Identify frontend routes and pages.
4. Identify existing UI components.
5. Identify all API clients and backend endpoints.
6. Identify wallet connection implementation.
7. Identify NEAR Protocol integration.
8. Identify smart contract calls.
9. Identify group management functionality.
10. Identify payment and transaction functionality.
11. Identify how frontend data is fetched and updated.
12. Identify existing loading, error, and success states.

Do not assume that a feature is connected to the backend simply because a button or UI element exists.

# 2. BACKEND CONNECTION AUDIT — READ ONLY

Before redesigning, audit every existing feature.

Create a report containing:

| Feature | Frontend UI | Backend/API | NEAR Contract | Status |
|---|---|---|---|---|
| Wallet connection | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Create group | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Join group | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Group list | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Group details | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Payment | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Transaction history | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Member management | Inspect | Inspect | Inspect | Connected / Partial / Missing |
| Group progress | Inspect | Inspect | Inspect | Connected / Partial / Missing |

For each feature, verify:

- Which frontend component handles it.
- Which existing API function or smart contract method is called.
- Whether the request uses real backend data.
- Whether the response is correctly handled.
- Whether errors are handled.
- Whether loading states exist.
- Whether the feature actually works.

Use existing code inspection and non-destructive testing.

Do not create new endpoints or contract methods.

Do not change existing backend code to make the audit pass.

If backend services are unavailable, mark the feature as NOT VERIFIED rather than claiming it works.

# 3. FRONTEND REDESIGN

Visual direction:

Create a cozy 2D pixel-art farming RPG inspired by Stardew Valley.

Design characteristics:

- Top-down 3/4 perspective.
- Cozy green village.
- Grass, trees, rivers, bridges, flowers, and dirt paths.
- Wooden houses and village buildings.
- Animated player character.
- Warm and welcoming atmosphere.
- Consistent pixel-art style.

Color palette:

- Forest Green: #183D2B
- Deep Green: #245638
- Grass Green: #579653
- Sage: #A6B98A
- Cream: #F3E8C9
- Gold: #DDAA54

Use legally permitted assets from:
- Kenney
- OpenGameArt
- Other properly licensed pixel-art asset libraries.

Do not use copyrighted Stardew Valley sprites or extracted game assets.

# 4. STRICT FRONTEND-ONLY SCOPE

You are allowed to modify:

- Existing frontend page layouts.
- React/Vue frontend components, depending on the existing framework.
- CSS and Tailwind styles.
- Frontend visual assets.
- Frontend animations.
- Frontend game rendering.
- Frontend-only navigation presentation.
- Responsive layouts.

You must NOT modify:

- Backend controllers.
- Backend services.
- API route definitions.
- Database schemas.
- Database migrations.
- Smart contracts.
- NEAR contract methods.
- Wallet authentication logic.
- Payment calculation logic.
- Transaction execution logic.
- Existing business rules.
- Environment secrets.
- Backend configuration.

Do not replace working backend integrations with mock data.

Do not introduce fake transactions, fake wallet balances, or fake group information.

# 5. PRESERVE EXISTING FUNCTIONALITY

Every existing feature must continue working.

For example:

- Wallet connection must use the existing implementation.
- Creating groups must call the existing backend or smart contract flow.
- Joining groups must preserve existing behavior.
- Payments must use existing transaction logic.
- Group details must use existing data sources.
- Transaction history must display actual existing data.

The redesign must reuse existing functions, hooks, API clients, and state management wherever possible.

If an existing feature is not connected, report it instead of silently implementing a replacement.

# 6. GAME WORLD IMPLEMENTATION

If the project uses React, consider Phaser 3 for the game world.

However:

- Do not replace the existing application framework.
- Do not replace existing routing.
- Do not rewrite application state management.
- Do not replace the existing NEAR SDK integration.

Game concepts:

- Existing groups are represented by buildings.
- Existing group members can be represented by characters.
- Existing payment progress can determine building appearance.
- Existing completed groups can unlock decorative visual effects.

These are presentation mappings only.

All displayed values must come from existing application data.

Clicking a building should open the existing group details or existing group page.

# 7. TESTING AND REGRESSION

After implementation:

1. Run the existing build command.
2. Run existing lint checks if available.
3. Run existing tests if available.
4. Verify existing routes.
5. Verify wallet connection.
6. Verify group creation.
7. Verify joining groups.
8. Verify group details.
9. Verify payment flow without making unauthorized real transactions.
10. Verify transaction history.
11. Verify responsive behavior.
12. Check browser console errors.

Do not execute real financial transactions without explicit authorization.

Compare the original feature behavior with the redesigned frontend.

If any existing functionality is broken, fix the frontend presentation or integration issue without changing backend logic.

# 8. REQUIRED DELIVERABLES

Provide:

A. Backend connection audit report.

B. List of existing frontend features preserved.

C. List of frontend files modified.

D. List of frontend assets added.

E. Build and test results.

F. Features that remain unverified or disconnected.

G. Any regressions discovered.

H. Screenshots of the redesigned frontend if available.

# FINAL RULE

The priority order is:

1. Preserve all existing functionality.
2. Verify frontend-to-backend connections.
3. Redesign the frontend.
4. Test for regressions.

Never sacrifice working functionality for visual improvements.

Start with repository inspection and the read-only backend connection audit. Present your findings before making modifications.