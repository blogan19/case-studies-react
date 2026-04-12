# GitHub Review Checklist

Use this checklist when sharing the repo with a colleague.

## Before sharing

- Repo builds locally with `npm run build`
- API starts locally with `npm run server`
- README is up to date
- `.env.example` is present
- Demo accounts are documented
- Database can be started either manually or via Docker

## What the reviewer should test

### Educator flow
- Sign in as educator
- Edit seeded case
- Save draft
- Clone case
- Publish case
- Archive case
- Review analytics panel

### Student flow
- Sign in as student
- Open dashboard
- Start self-paced case
- Save progress
- Resume session
- Submit case
- Reopen completed session

### Live teaching flow
- Publish a case as educator
- Join live session using code in another browser
- Confirm view loads correctly
- Confirm changes are reflected when the case is republished/pushed

## Questions for reviewer

- Is the builder fast enough for a lecturer?
- Is the student dashboard clear enough?
- Does the player feel usable on desktop and mobile?
- Is the live session concept good enough for classroom use?
- Which missing feature matters most before university demos?
- Should this remain a separate repo through MVP, or move into the main platform sooner?

## Review outputs to capture

- product feedback
- workflow pain points
- missing must-have features
- architecture concerns
- integration concerns
- priority changes before staging/demo
