---
name: Publish schema validation
description: How to distinguish a real Replit publish schema problem from disposable database validation infrastructure errors
---

When a publish validation reports that a disposable branch or fork cannot be found, first compare development and production schemas and recompute the development-to-production diff. If the diff is non-destructive and the generated statements are valid, the missing branch is an infrastructure or lifecycle lookup failure rather than a schema-source defect.

**Why:** A valid migration can be rejected before SQL execution if the disposable production branch used for validation has already disappeared or cannot be resolved.

**How to apply:** Use read-only production queries plus `explainSchemaDiff()`. Do not add deploy-time DDL, mutate production, or make destructive development changes just to work around a missing validation branch; retry publishing after confirming the source schema and diff are sound.