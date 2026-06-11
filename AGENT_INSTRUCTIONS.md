# Agent Instructions

This repository uses `CHANGELOG.md` as the authoritative record of every change. All future AI-driven changes must update the changelog before finalizing the work.

## How to use this file

1. Read `AGENT_INSTRUCTIONS.md` before making any code or UI changes.
2. Add or update a changelog entry as part of the same pull request or patch.
3. If the change is small, add it under `## [Unreleased]`.
4. If a version is already in progress, add your entry to the correct release section.

## Changelog rules

- Always add at least one bullet in `CHANGELOG.md` describing the change.
- Use one of the following categories whenever possible:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Removed`
- Keep the entry concise, factual, and present tense.
- Do not leave changes undocumented in `CHANGELOG.md`.

## What to document

- New features, UI improvements, and workflow changes.
- Bug fixes and behavior corrections.
- Refactors that affect user-facing behavior or important architecture.
- Any update to build, tests, or automation that impacts project maintenance.

## Example

### Added
- New clip remove button for timeline clips.
- Single-clip default track creation for new tracks.

### Changed
- Updated playing clip styling so active clips are more visible.

## Additional guidance

- If a change spans multiple areas, add a single bullet for each meaningful user-facing item.
- Avoid adding implementation details in the changelog bullet; focus on the result.
- Maintain the current markdown structure of `CHANGELOG.md`.
