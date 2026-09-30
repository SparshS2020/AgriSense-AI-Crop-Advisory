---
name: Gemini access
description: How the AgriSense project obtains Gemini access when managed AI provisioning is unavailable
---

The project supports direct Google Gemini access through the `GEMINI_API_KEY` secret and uses the `@google/genai` client. Managed Replit AI provisioning was unavailable on the current plan, so the direct-key path is the durable fallback.

**Why:** The advisory workflow is explicitly built around Gemini, and the managed integration can require an account upgrade.

**How to apply:** Keep the key in Replit Secrets only. Use the configured model environment variable when present and preserve the conservative local fallback if Gemini is unreachable.