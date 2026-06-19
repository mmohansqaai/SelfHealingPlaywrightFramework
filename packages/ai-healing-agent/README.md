# ai-healing-agent

Framework-agnostic **local agentic healing** for any `HealingDriver`.

Observe → tool use (seed + DOM scan) → act (validate on driver) → reflect → retry.

Works **without** `healing-service` (local mode) or with it (remote mode / `agentMode: auto`).
