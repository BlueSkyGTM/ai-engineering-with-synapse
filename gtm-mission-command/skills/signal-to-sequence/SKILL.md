# /signal-to-sequence — Turn a Signal Into a Live Outreach Campaign

Takes a buying signal and generates a complete outbound sequence:
subject lines, email bodies, follow-up cadence, LinkedIn touches.

## Usage

```
/signal-to-sequence "acme.com hired 3 SDRs last week"
/signal-to-sequence --research outputs/skill-account-research.md
```

## What it does

1. Loads `context/icp.md`, `context/company.md`, `context/sequence-library.md`
2. Interprets the signal — what buying motion does it indicate?
3. Maps the signal to the closest proven sequence in your sequence library
4. Personalizes each touch to the signal and the account
5. Writes the sequence to `outputs/skill-signal-to-sequence.md`

## Sequence structure

- Touch 1: Email (day 0) — signal-led opener, value prop, CTA
- Touch 2: LinkedIn connection note (day 2)
- Touch 3: Email follow-up (day 4) — different angle
- Touch 4: LinkedIn message (day 7)
- Touch 5: Break-up email (day 14)

## Output

`outputs/skill-signal-to-sequence.md` — complete sequence, ready to load into Smartlead or Apollo.

## Prerequisites

- `context/sequence-library.md` filled in (at least one proven sequence)
- Phase 05 lesson completed (Outbound Systems)
