# AUXTECHNA Integration Roadmap

This document explains how the local Case Studies MVP can evolve into an AUXTECHNA platform module alongside Homecare and PGD.

## Current Position

The current repo is a standalone local MVP with:
- React frontend
- Node/Express API
- PostgreSQL schema
- Local auth
- Live teaching sessions
- Self-paced learner sessions

This is useful for product review and rapid iteration, but it is not yet aligned with the architecture described in:
- [CLAUDE.md](C:/Users/Ben/OneDrive/Documents/AUXTECHNA/homecare-system/CLAUDE.md)

## Key Integration Principle

Do not attempt to merge this code directly into the production platform in one step.

Instead use a 3-stage integration path:

1. Product validation in this local repo
2. Shared domain and architecture design against the AUXTECHNA platform
3. Controlled module integration into the main platform

## Stage 1: Product Validation in This Repo

Goal:
- validate workflows with colleagues and educators before platform integration

Use this repo to review:
- lecturer dashboard flow
- student dashboard flow
- case builder ergonomics
- self-paced player
- live classroom usefulness
- scoring and analytics expectations

Outputs from Stage 1:
- accepted MVP workflow
- agreed entity list
- agreed module boundaries
- UI screenshots or recordings
- prioritised backlog

## Stage 2: Platform Design Alignment

Goal:
- map the local MVP to AUXTECHNA architecture without breaking Homecare or PGD

### Required decisions

#### 1. Module model
Case Studies should be introduced as a new platform module, similar to PGD.

Needed outcomes:
- module subscription/access flag
- dashboard tile
- module-specific admin/settings area
- module-specific TempData/message conventions if using MVC views

#### 2. Tenant model
The current MVP is single-tenant.
The AUXTECHNA platform is multi-tenant with strong tenant resolution rules.

Needed outcomes:
- all core case-study tables gain tenant awareness
- tenant isolation is enforced in service/repository layer
- platform admin controls which tenants have Case Studies enabled

#### 3. Auth model
The current MVP uses local JWT auth.
The platform already has role-aware auth and optional NHS SSO.

Needed outcomes:
- map local roles to platform roles
- stop treating local auth as long-term production auth
- keep local auth only for repo review/demo purposes

#### 4. Database ownership
The platform distinguishes master DB concerns from tenant DB concerns.

Recommended placement:
- Master DB:
  - module subscription metadata
  - future global case templates if centrally curated
- Tenant DB:
  - case studies
  - case versions
  - sessions
  - responses
  - analytics
  - local templates
  - local interaction rules

#### 5. Settings separation
Following CLAUDE rules:
- do not place Case Studies settings in generic site settings
- add a future module-specific settings page for Case Studies

Examples:
- default live session duration
- scoring behavior defaults
- question feedback timing
- simulation feature toggles
- local rules engine enablement

## Stage 3: Controlled Module Integration

Goal:
- rebuild or port the validated feature set into the main platform incrementally

### Recommended integration order

#### Phase A: Read-only module shell
- add Case Studies tile/module access
- add Case Studies navigation shell
- add placeholder dashboard page
- add tenant-aware schema migrations

#### Phase B: Authoring and library
- lecturer dashboard
- case study CRUD
- draft/published/archive lifecycle
- library listing

#### Phase C: Learner flow
- student dashboard
- self-paced case sessions
- scoring and progress persistence

#### Phase D: Live teaching
- lecturer-controlled live sessions
- student join and response capture
- aggregate classroom results

#### Phase E: Simulation extensions
- prescribing workspace
- rules engine
- medication review
- pharmacist verification
- infusion and administration simulation

## Recommended Entity Mapping

### Keep from MVP conceptually
- case studies
- live sessions
- learner attempts
- scoring summary

### Replace with richer platform entities
- `users` -> platform identity/user model
- `case_studies.draft_data` -> versioned authored content model
- `case_sessions.answers/progress jsonb` -> student response/session tables with more structure over time

### New entities for platform version
- CaseStudy
- CaseVersion
- CaseSection
- CaseTask
- CaseSession
- StudentResponse
- ScoreRecord
- InteractionRule
- Template
- FeatureToggle or module settings entity

## Technical Recommendation

### For this repo
Continue using it as:
- a reviewable MVP sandbox
- a reference implementation
- a UX proving ground

### For the platform
Do not copy the Express API wholesale into the main system.
Instead:
- reuse the validated frontend flows and domain concepts
- re-implement persistence and access around the platform's tenant/auth architecture
- migrate carefully with additive schema changes only

## Risks To Avoid

- Building too much platform-specific complexity into this repo before product review
- Shipping duplicate auth/tenant logic in production
- Storing all future workflow state in JSON blobs long term
- Merging too early before educator review validates the teaching workflows

## Definition of Done for “Ready to Integrate”

The local MVP is ready to move into platform planning when:
- educators approve the core authoring flow
- student flow is understandable and stable
- live teaching mode is useful enough for classroom demo
- data model draft is agreed
- backlog has been prioritised for institutional MVP

## Short Recommendation

Use this repo to get the workflow right.
Use the main AUXTECHNA platform to make it production-grade.
