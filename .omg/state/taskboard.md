# Taskboard (Deprecated)

This file is retained only as a compatibility marker for older agent workflows.

## Source of truth

GitHub Issues is the authoritative product and engineering task tracker for TGIM. Agents and contributors must not infer current implementation status from the historical `.omg/state` files.

Before starting work:
1. Read the current GitHub issue/epic and its acceptance criteria.
2. Inspect the current `master` implementation before assuming a task is unimplemented.
3. Prefer updating/closing the corresponding GitHub issue over editing this file.
4. Do not create parallel task state in this directory.

## Current product direction

The consumer mobile information architecture is:
- Home
- Explore
- Report
- Promises
- You

Verify, Participate, Manifesto, Tracker, Party, Officer and Admin capabilities remain contextual or specialist surfaces rather than universal navigation.

The canonical consumer-mobile epic is GitHub issue #1 and its active child issues.

## Historical note

The previous task ledger described the July 2026 Expo scaffold and Mumbai pincode prototype. It became stale after the August 2026 consumer-mobile implementation and must not be treated as execution state.
