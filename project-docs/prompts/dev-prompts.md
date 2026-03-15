# Dev Prompts

## Session Start Prompt
Review all relevant markdown files in this repository before taking action.
Summarize:
- project purpose
- current architecture
- constraints
- current sprint priorities
Then propose the safest implementation plan.

## Feature Prompt
Review all relevant project files first.
Implement the following feature:

[PASTE FEATURE HERE]

Requirements:
- follow coding standards
- remain consistent with architecture
- preserve existing functionality
- prioritize mobile-first UX

## Refactor Prompt
Review architecture, coding standards, and constraints first.
Refactor the target area for clarity, maintainability, and performance without changing user-facing behavior unless specified.

## Bug Fix Prompt
Review project files first.
Identify likely root causes, explain the safest fix, and then implement the fix with minimal surface area.
