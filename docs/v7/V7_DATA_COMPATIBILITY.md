# Rehab V7 Data Compatibility

## Contract

V7 does not create a new user-data format during the UI migration. The V6 persistence model remains authoritative until a separate, additive data change is justified and tested.

Preserved identifiers at Phase 2:

| Item | V6/V7 value |
|---|---|
| App DB key | `rehab_pro_universal_db` |
| IndexedDB database | `rehab_pro_storage` |
| IndexedDB version | `4` |
| KV store | `kv` |
| History store | `history` |
| AI messages store | `ai_messages` |
| App schema | current V6 schema (`3` at baseline) |

No Phase 2 code increments those versions or renames a store.

## Adapter boundary

Legacy access is isolated under `src/legacy/adapters/`:

- `data.js` exposes the live V6 database, settings, health, plan, history and AI-config views.
- `storage.js` exposes storage metadata and the existing migration/collection implementations.
- `services.js` exposes mature runtime services such as AI, sync, voice and workout without asking V7 features to create new globals.
- `index.js` composes those adapters for App Context.

The adapter intentionally returns live domain records where V6 does so. It is a compatibility boundary, not a second state store; creating duplicate V7 copies would introduce reconciliation/data-loss risk.

## Readiness and writes

V7 uses the existing V6 data readiness behavior. During the bridge period:

- data initialization still happens once in the V6 startup chain before V7 mounts;
- `whenReady()` delegates to the existing readiness barrier when available;
- `save()` delegates to the existing guarded save path;
- localStorage fallback and deferred IndexedDB promotion are unchanged;
- pagehide/flush and sync scheduling are unchanged.

## Data groups verified through the adapter

- actions and routines;
- workout/history records;
- daily plan / body / weight / diet plan state;
- health weights, food logs, exercise logs, rehab weekly records and reports;
- sync config presence;
- AI profile/task/search config presence;
- storage identifiers and current storage mode.

The runtime debug facade exposes only count/version summaries via `rehabV7.compatibility`; it does not surface API keys or credential payloads.

## Migration repeatability

The existing `storage/migrate.js` remains the sole localStorage -> IndexedDB migration owner. Phase 2 extends its migration test to run the same target migration a second time and verify that collection data remains unchanged. This confirms the migration is repeatable at the current target version.

## Rules for later phases

1. UI work must not rename IndexedDB stores or local keys.
2. Any future schema migration must be additive where possible and include forward/repeat/fallback tests.
3. A V7 feature receives data/services from App Context/adapters, not by adding new feature globals.
4. AI/search/sync secrets remain in their existing stores/services; UI state should hold IDs/status, not duplicate credentials.
5. Deleting a legacy persistence path requires a dedicated compatibility proof, not a visual-refactor commit.

