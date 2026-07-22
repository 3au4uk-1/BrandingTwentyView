# Day Separators + Cancel Popup Implementation Plan

> **For agentic workers:** Execute task-by-task.

**Goal:** Day-labeled separators in date-sorted desktop table; OTMENA transition popup with meme image.

**Architecture:** Pure helpers for day keys/labels; DealsTable inserts separator rows when `sortsByDateField`. Cancel popup via React context; notify from DealStageSelect and syncDealStage.

**Tech Stack:** React 19, Twenty public assets (`getPublicAssetUrl`), existing Modal/portal patterns.

---

### Task 1: Day separator helpers + tests
### Task 2: Wire DealsTable separators
### Task 3: Public asset + CancelOtmenaProvider/popup
### Task 4: Notify on manual + syncDealStage transitions
### Task 5: Version bump, tests, build, commit, push
