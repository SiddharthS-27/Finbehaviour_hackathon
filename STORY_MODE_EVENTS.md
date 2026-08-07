# Virtual Story Mode — Event Design Spec

> Events where the situation actively pushes the player toward the wrong choice, and exactly one option is **provably** correct.

---

## 0. The design contract

Every event in Story Mode must satisfy all five:

1. **One provably correct choice.** Not "best given your goals" — correct by arithmetic, by evidence, or by rule. If a reasonable financial advisor could defend two options, the event does not belong in Story Mode.
2. **Active pressure toward a wrong choice.** The scenario applies at least two manipulation vectors (§1). An event that neutrally lists options tests knowledge; an event that pressures tests *behaviour*, which is the whole point.
3. **Delayed consequence.** The wrong choice must feel good *now* and cost later. If the penalty is immediate, the player learns "avoid pain," not "resist temptation."
4. **A named debrief.** After resolution, the coach names the manipulation technique used on them. This is what converts manipulation into inoculation.
5. **Proof type declared.** Arithmetic, evidence, or rule (§2). The debrief's tone depends on it.

## 1. Manipulation vector catalogue

Reusable pressure mechanics. Each event tags 2–4. Several are implementable in the **UI itself**, not just the copy — those are marked ⚡ and are where the stress test actually bites.

| Vector | Mechanic | UI implementation |
|---|---|---|
| **Social proof** | "Everyone around you is doing it" | ⚡ Newspaper headline / office chatter ticker / "3 friends invested" badge |
| **Authority** | A credentialed figure recommends it | Bank RM with "15 years experience" avatar, verified badge |
| **Urgency** | Offer expires | ⚡ **Live countdown timer on the choice buttons** |
| **Scarcity** | Limited slots/units | "Only 4 left at this price" |
| **Anchoring** | High number shown first | Strike-through MRP; minimum-payment shown large, balance small |
| **Framing** | Same math, opposite emotion | "90% success" vs "10% catastrophic failure" |
| **Recency** | Recent performance chart | ⚡ Animated green chart that only shows last 6 months |
| **Reciprocity** | Free gift precedes the ask | Free consultation, free gold coin, cashback |
| **Loss aversion** | "Don't miss out" / "protect what you have" | Red loss numbers, FOMO copy |
| **Instant dopamine** | Reward fires on the wrong choice | ⚡ Confetti/coin animation on the *tempting* choice |
| **Bandwidth tax** | Decision made while overloaded | ⚡ **Multiple decisions on one screen, or a shortened timer when stress is high** |
| **Avoidance affordance** | "Deal with it later" is offered | ⚡ A greyed "Remind me tomorrow" button that always works and always costs |

**⚡ Critical design note.** The instant-dopamine vector is your most powerful and most underused: fire confetti, a coin-clink sound, and a satisfying number roll-up when the player takes the *wrong* choice. Then let the consequence arrive three months later. That single asymmetry teaches present bias better than any lecture.

## 2. Proof types

| Type | Meaning | Debrief tone | Example |
|---|---|---|---|
| **ARITHMETIC** | Provable on a calculator, no assumptions | Show the working. Non-negotiable. | Paying 42% debt beats earning 12% |
| **EVIDENCE** | Overwhelming empirical record | Cite the data, acknowledge the exception | Diversification; 93% of F&O traders lose |
| **RULE** | Institutional/safety rule with no exception | State the rule flatly | Never share an OTP |

---

# THE EVENTS

Format for each: **concept · proof type · biases · vectors · setup · choices · outcomes · debrief.**

---

## EVENT 01 — "The Sure Thing"
### Concept: Diversification · Proof: EVIDENCE · Your worked example

**Biases exploited:** overconfidence, herd behaviour, recency, FOMO
**Vectors:** ⚡ social proof, ⚡ recency chart, ⚡ urgency timer, authority

### Setup
You have ₹60,000 to invest — your first real investment. Your options: a diversified index fund, gold, a fixed deposit, and **Suryavanshi Renewables**, a green-energy stock.

### The pressure (escalating, over the same screen)
1. **The chart.** Suryavanshi's 6-month chart animates upward — **+94%**. The index fund's chart shows +7%. Only 6 months are visible.
2. **The newspaper.** ⚡ Morning headline: *"Green Energy Stocks Mint New Millionaires — Retail Investors Cash In."*
3. **The office.** ⚡ Ticker: *"Ravi from accounts put ₹2L in. Bought a bike last month."*
4. **The authority.** A finance YouTuber with 1.2M subscribers, verified tick: *"I'll say it plainly — this is the easiest money in the market right now."*
5. **The clock.** ⚡ 45-second countdown: *"Market closes in…"* — forcing System 1.
6. **The nudge.** The "All in on Suryavanshi" button is larger, coloured marigold, and pre-focused.

### Choices
| # | Choice | Immediate | Month +7 | Correct |
|---|---|---|---|---|
| A | **All ₹60k into Suryavanshi** | ⚡ Confetti. Portfolio shows **₹71,400 (+19%)** in month 1. Happiness +15. | Sector regulation changes. −68%. Holding ₹19,200. | ✗ |
| B | **All ₹60k into gold** ("safe") | Flat. Happiness −2 ("boring"). | +6%. ₹63,600. Inflation-adjusted: roughly nothing. | ✗ |
| C | **All ₹60k into FD** | Flat. | +7% annualised. Beats inflation by ~1%. Safe, and a 40-year horizon wasted on it. | ✗ |
| D | **Split: 60% index / 20% gold / 20% Suryavanshi** | No confetti. No dopamine. Ravi laughs at you. Happiness −5. | Index +11%, gold +6%, Suryavanshi −68%. Net **₹61,900**. | ✓ |

### The cruelty that makes it work
Choice A **wins for the first month.** The player sees +19% and feels correct. Ravi's ticker keeps updating. Give it 3–4 months of feeling right before the drop. That's the disposition effect being manufactured in real time.

### Debrief
> You put everything into one stock because a chart, a headline, a colleague and a countdown all pointed the same way. Every one of those was a pressure, not a reason.
>
> **The proof:** diversification is the only free lunch in finance — it reduces risk *without* reducing expected return. You cannot know which asset wins. You can guarantee that no single one can ruin you.
>
> Your split portfolio ended at ₹61,900. All-in ended at ₹19,200. **The gap is ₹42,700 — and it wasn't a stock-picking failure. It was a structure failure.**
>
> *The chart you saw showed 6 months. Here's 5 years.* [reveals full chart — Suryavanshi was flat for 4 years before the spike]

---

## EVENT 02 — "The Free Upgrade"
### Concept: "No-cost EMI" is not no-cost · Proof: ARITHMETIC

**Biases:** framing, anchoring, mental accounting, present bias
**Vectors:** framing, anchoring, ⚡ instant dopamine, reciprocity

### Setup
Your phone dies. You need a replacement. The store offers a ₹64,999 flagship on **"No-Cost EMI — ₹5,417/month for 12 months. Zero interest!"** The same phone is ₹58,499 if you pay upfront. A ₹18,999 model does everything you actually need.

### The pressure
- ⚡ The EMI figure is displayed in **48pt**. The total (₹64,999) is in 10pt grey.
- The salesperson: *"Sir, why block your savings? Zero interest — it's free money."*
- Free tempered glass and case, handed over **before** you choose (reciprocity).
- ⚡ Screen shows: *"Your friend Arjun bought this last week."*

### Choices
| # | Choice | Reveal | Correct |
|---|---|---|---|
| A | No-cost EMI, ₹5,417 × 12 | ⚡ Confetti, phone unlocks in inventory. **Hidden: you paid ₹6,500 more than cash price. Effective APR ≈ 19.8%.** Plus 12 months of a fixed liability on your cash flow. | ✗ |
| B | Pay ₹58,499 cash | No interest, but 78% of your emergency fund gone for a phone. | ✗ |
| C | **Buy the ₹18,999 model in cash** | Boring. Works fine. ₹39,500 stays invested. | ✓ |
| D | Skip it, use the cracked phone | You need a working phone for work. Income −5% (missed calls). | ✗ |

### Debrief
> **The arithmetic, plainly:**
> Cash price: ₹58,499 · EMI total: ₹64,999 · **You paid ₹6,500 for the privilege of paying later.**
> That's not zero interest. That's ~19.8% APR with the interest hidden in the price.
>
> "No-cost EMI" means *no separately-itemised interest.* The cost was moved into the sticker. The technique used on you was **framing** — the ₹5,417 was shown 5× larger than the ₹64,999.
>
> **Rule that always holds:** before any EMI, ask for the cash price. If cash price < EMI total, the difference *is* the interest. Compute it.

---

## EVENT 03 — "Sacred Savings"
### Concept: Pay high-APR debt before investing/saving · Proof: ARITHMETIC

**Biases:** mental accounting, loss aversion
**Vectors:** framing, authority, avoidance affordance

### Setup
You have **₹85,000 in a savings account at 3.5%** — you've been building it for two years and think of it as "my safety money." You also carry **₹78,000 on a credit card at 42% APR**, paying the minimum each month.

### The pressure
- ⚡ Two separate cards on screen — the savings balance in green with a small trophy icon labelled *"Your Savings — 2 years of discipline!"*; the card balance in a collapsed accordion you have to tap to open (**avoidance affordance**).
- Your mother: *"Never touch your savings. That money is for emergencies."*
- ⚡ A "Remind me next month" button, always available, always free-looking.

### Choices
| # | Choice | Consequence | Correct |
|---|---|---|---|
| A | Keep saving, pay card minimum | Savings earn ₹248/mo. Card accrues **₹2,730/mo**. Net −₹2,482/month, forever. | ✗ |
| B | **Pay ₹78,000 from savings, clear the card** | Savings drop to ₹7,000 — feels terrible. But you stop losing ₹2,482/month and CIBIL +40 next cycle. | ✓ |
| C | Take a personal loan at 14% to clear the card | Better than 42%, but you still have ₹85k idle and now two products. Half-right. | ✗ |
| D | "Remind me next month" | ⚡ Nothing happens. Feels fine. Costs ₹2,482. Repeatable — and the event returns. | ✗ |

### Debrief
> Your savings earned **₹248** this month. Your card charged **₹2,730**. You were paying ₹2,482 a month for the *feeling* of having savings.
>
> This is **mental accounting** — the same rupee treated as two different rupees because of the label on the account. Money is fungible. The bank does not care that one pile felt sacred.
>
> **The rule:** clear any debt whose interest rate exceeds what your savings earn. Paying off 42% debt is a guaranteed, tax-free 42% return. No investment on earth offers that.
>
> Rebuild the emergency fund *after*. It rebuilds ₹2,482/month faster now.

---

## EVENT 04 — "The 2 A.M. Call"
### Concept: Never act on unsolicited urgency; never share OTP · Proof: RULE

**Biases:** authority, urgency, fear, bandwidth tax
**Vectors:** ⚡ authority impersonation, ⚡ hard countdown, fear, ⚡ bandwidth tax

### Setup
**2:14 a.m.** Your phone rings. Caller ID: *"SBI Customer Care"* (spoofed). A calm, professional voice: *"Sir, we've detected a fraudulent transaction of ₹47,000 on your account from Delhi. I can block it, but I need to verify your identity in the next 90 seconds before it clears."*

### The pressure
- ⚡ **Live 90-second countdown.** It does not pause. It is the whole mechanic.
- ⚡ Screen dimmed to simulate 2 a.m.; text slightly blurred (**bandwidth tax** — you're half asleep).
- The voice knows your name, your bank, and the last 4 digits of your card. (It's from a data leak — but it *feels* like proof.)
- Background call-centre ambience. Professional hold music if you hesitate.
- He never asks for money. He asks to *protect* you. (Fear framing, not greed.)

### Choices
| # | Choice | Consequence | Correct |
|---|---|---|---|
| A | Read out the OTP | ₹47,000 gone. Real. Irreversible in-game unless reported. | ✗ |
| B | Share card CVV "to verify" | ₹1,12,000 across 4 transactions over 20 minutes. | ✗ |
| C | Install "SBI Secure" app he sends | Screen-sharing malware. Account emptied over 3 days. | ✗ |
| D | **Hang up. Call the number on your card. Report to 1930 if needed.** | Nothing happens. There was no fraudulent transaction. ⚡ Anticlimax by design. | ✓ |

### Debrief
> There was no ₹47,000 transaction. The urgency was manufactured; the countdown was the weapon.
>
> **The rule, no exceptions:** no bank, no RBI official, no police officer will ever ask for an OTP, CVV, PIN, or ask you to install an app. Not ever. Not under any circumstance. An OTP is a signature — reading it aloud is signing a blank cheque.
>
> He knew your name and card digits because that data leaks constantly. Knowing your details proves nothing.
>
> **What to do, always:** hang up. Call the number printed on your own card. If money is gone, report within 3 days — RBI mandates full refund for negligence-free reports made in time. Helpline **1930**. Portal **cybercrime.gov.in**.
>
> *One in five UPI-using families in India has faced fraud. Half never report it.*

---

## EVENT 05 — "The Correction"
### Concept: Don't panic-sell in a drawdown · Proof: EVIDENCE

**Biases:** loss aversion, myopic loss aversion, herd, recency
**Vectors:** ⚡ red everywhere, ⚡ social proof, ⚡ notification spam, urgency

### Setup
Month 9. Markets fall **14% in three weeks**. Your ₹1,80,000 portfolio is now ₹1,54,800. You are down ₹25,200.

### The pressure
- ⚡ Portfolio number in **rust red**, with a downward arrow that keeps animating.
- ⚡ Push notifications every few seconds: *"Sensex sheds 900 points" · "Analysts warn of deeper correction" · "Your portfolio is down 14%"*
- ⚡ Office ticker: *"Ravi pulled everything out yesterday. Says he'll re-enter at the bottom."*
- Newspaper: *"IS THIS 2008 AGAIN?"*
- ⚡ The "Sell everything" button glows and pulses. "Hold" is plain grey.
- Your SIP auto-debit is due in 4 days — a "Pause SIP" toggle sits invitingly nearby.

### Choices
| # | Choice | Month 10–12 | Correct |
|---|---|---|---|
| A | Sell everything | ⚡ **Immediate relief. Stress −20. The red stops.** Then markets recover +9%, +4%. You're in cash. Loss of ₹25,200 is now permanent, and you missed ₹18,700 of recovery. | ✗ |
| B | Sell half | Half the relief, half the damage. Still locks ₹12,600. | ✗ |
| C | Pause the SIP, hold existing | Avoids selling but skips buying at the cheapest prices of the entire run. | ✗ |
| D | **Hold, and continue the SIP** | Stress +12 (it *hurts*). Buys 14% more units. Portfolio recovers to ₹1,94,000 by month 12. | ✓ |

### The cruelty
Choice A gives **immediate, genuine emotional relief** — stress drops 20 points, notifications stop, the screen goes calm. This is exactly what selling feels like. The player must learn that the relief is the trap.

### Debrief
> Selling felt better instantly. That feeling is the entire problem.
>
> A paper loss becomes a real loss only when you sell. You converted ₹25,200 of temporary decline into permanent loss, and then were not invested for the recovery.
>
> **The evidence:** the market's best days cluster immediately after its worst days. Missing a handful of them across a decade destroys most of the return. Nobody — including Ravi — reliably re-enters at the bottom.
>
> **Your SIP was the strongest tool you had, and it works best precisely when it feels worst.** A 14% fall means your fixed ₹5,000 bought 14% more units. That is the mechanism doing its job.
>
> The technique used on you was **loss aversion amplified by frequency** — you were shown the red number every few minutes. Look less often.

---

## EVENT 06 — "Minimum Due"
### Concept: Minimum payment is an anchor, not a target · Proof: ARITHMETIC

**Biases:** anchoring, present bias, avoidance
**Vectors:** ⚡ anchoring by typography, avoidance affordance, framing

### Setup
Credit card statement arrives. Balance **₹42,000**. Screen mimics a real statement.

### The pressure
- ⚡ **"Minimum Amount Due: ₹2,100"** in large bold. **"Total Amount Due: ₹42,000"** in small grey text below it.
- The payment input field is **pre-filled with ₹2,100.**
- Copy: *"Pay minimum to keep your account in good standing."* (True, and deeply misleading.)
- ⚡ Paying the minimum triggers a green tick and *"Payment successful! You're all set."*

### Choices
| # | Choice | Consequence | Correct |
|---|---|---|---|
| A | Pay ₹2,100 (pre-filled) | ⚡ Green tick, dopamine. **₹39,900 carries at 42%. At minimums only, this takes 8+ years and costs ~₹58,000 in interest.** | ✗ |
| B | Pay ₹10,000 | Better. Still ₹32,000 compounding. | ✗ |
| C | **Pay the full ₹42,000** (from savings if needed) | Hurts. Zero interest. CIBIL utilisation drops, score +25. | ✓ |
| D | Skip this month | CIBIL −45, late fee ₹600, penalty APR. | ✗ |

### Debrief
> The field was pre-filled with ₹2,100, and you accepted it. That figure is designed to be accepted.
>
> **The arithmetic:** paying only minimums on ₹42,000 at 42% APR takes over **8 years** and costs roughly **₹58,000 in interest** — more than the original purchase.
>
> This is **anchoring**. Research shows that simply *displaying* a minimum-payment figure reduces the amount people pay, including people who could easily pay more. The number is not advice. It is the smallest payment that keeps you profitable to the lender.
>
> **The rule:** a credit card is a 45-day interest-free loan or a 42% loan. There is no third mode. Pay in full or don't use it.

---

## EVENT 07 — "The Policy That Does Both"
### Concept: Term insurance > ULIP/endowment for protection · Proof: ARITHMETIC

**Biases:** authority, framing, complexity aversion
**Vectors:** authority, reciprocity, framing, ⚡ bandwidth tax (deliberately dense document)

### Setup
Your bank's Relationship Manager calls you in. Warm office, free coffee, a printed brochure. *"Sir, you're 27 and unmarried, but your parents depend on you. Let me show you something that gives protection **and** returns — why buy insurance that gives you nothing back?"*

**The pitch:** ULIP, ₹50,000/year for 20 years. Life cover ₹10 lakh. "Projected maturity value ₹18–22 lakh."

### The pressure
- Authority: 15-year veteran, framed certificates on the wall.
- Reciprocity: coffee, then a free "financial health check."
- ⚡ **The killer framing:** *"Term insurance is money down the drain. You pay 30 years and get nothing back."*
- ⚡ **Bandwidth tax:** the benefit illustration is a genuinely dense 4-page table. The player *can* read it. Most won't.
- Charges are on page 3, in a table, as percentages of "allocated premium."

### Choices
| # | Choice | Reveal | Correct |
|---|---|---|---|
| A | Buy the ULIP, ₹50k/yr | ⚡ Certificate animation, "You're protected!" **Hidden: ~12% of premium consumed by charges in early years; effective return ~6.2%; 5-year lock-in; ₹10L cover is inadequate.** | ✗ |
| B | Buy an endowment plan | Same structure, worse returns (~4.5%). | ✗ |
| C | **Term cover ₹1 crore for ₹11,000/yr + invest the remaining ₹39,000 in an index fund** | No certificate ceremony. 10× the cover, at a fifth the cost. | ✓ |
| D | Buy nothing, "I'm young" | Parents unprotected. If the mortality event fires, catastrophic. | ✗ |

### Debrief
> **The arithmetic, side by side, over 20 years at ₹50,000/year:**
>
> | | ULIP | Term + Index |
> |---|---|---|
> | Life cover | ₹10 lakh | **₹1 crore** |
> | Annual cost of cover | bundled, opaque | ₹11,000 |
> | Invested annually | ~₹44,000 after charges | ₹39,000, ~0.2% expense |
> | Effective return | ~6.2% | ~11% (long-run index) |
> | Liquidity | 5-year lock-in | anytime |
>
> **You get ten times the protection and roughly double the corpus by separating the two products.**
>
> The line that worked on you was *"term gives you nothing back."* That's the **framing** trick. Term insurance gives you exactly what insurance is for: a ₹1 crore payout if the worst happens. You don't ask your health insurance for money back for staying healthy.
>
> **The rule:** never bundle insurance with investment. Buy protection as protection. Buy investment as investment. Bundling exists because it's harder for you to see the cost of either.

---

## EVENT 08 — "Everyone's Making Money"
### Concept: F&O / speculation is negative-EV for retail · Proof: EVIDENCE

**Biases:** overconfidence, availability cascade, survivorship, herd
**Vectors:** ⚡ social proof, ⚡ recency, ⚡ instant dopamine, reciprocity (free trial)

### Setup
Your college group chat is on fire. Three friends are posting P&L screenshots from options trading. One turned ₹20,000 into ₹1,40,000 in eleven days. A broker app offers a **free ₹500 trading credit** to start.

### The pressure
- ⚡ **The chat is live on screen** — screenshots keep arriving as you deliberate.
- ⚡ Nobody posts losses. (Survivorship — and the debrief names it.)
- Free ₹500 credit (reciprocity).
- A YouTube thumbnail: *"₹5,000 to ₹5 Lakh — My Options Strategy."*
- ⚡ **If the player trades, the first trade WINS.** ₹4,000 profit. Confetti. Then a second, larger one. Then the ruin.

### Choices
| # | Choice | Consequence | Correct |
|---|---|---|---|
| A | Deposit ₹50,000, start trading | ⚡ First trade +₹4,000. Second +₹7,000. **Then −₹38,000 in one session.** Chases losses. Ends −₹61,000. | ✗ |
| B | "Just ₹5,000 to try it" | Small win, escalating position size, ends −₹19,000. The mechanism is identical; only the scale differs. | ✗ |
| C | **Don't trade. Continue the SIP.** | Nothing happens. The chat continues. You feel left out. Happiness −8. | ✓ |
| D | Copy a friend's exact trades | Same losses, on someone else's timing. | ✗ |

### Debrief
> **The evidence — SEBI's own study, over 1 crore traders, FY22 to FY24:**
> **93% of individual F&O traders lost money.** Aggregate losses exceeded **₹1.8 lakh crore**. The average loser lost about **₹2 lakh**. Only ~1% made more than ₹1 lakh.
>
> Meanwhile 96–97% of the profits on the other side of your trades were made by **algorithmic systems** run by proprietary desks and foreign funds. You were not competing with people.
>
> **Why your group chat looked different:** wins get screenshotted, losses get deleted. That's **survivorship bias**, and it is the single most effective recruitment mechanism in retail speculation.
>
> **And your first trade won on purpose** — that's how the escalation starts. Every gambling system in history opens the same way.

---

## EVENT 09 — "The Raise"
### Concept: Lifestyle creep — save the delta · Proof: ARITHMETIC

**Biases:** hedonic adaptation, mental accounting, social comparison
**Vectors:** ⚡ instant dopamine, social proof, framing ("you've earned it")

### Setup
Appraisal day. **+22%.** Your take-home rises from ₹52,000 to ₹63,400 — an extra **₹11,400/month**.

### The pressure
- ⚡ Celebration animation, confetti, "YOU EARNED THIS" in display type.
- ⚡ Immediately after, three offers slide in: a ₹28,000/month flat (up from ₹18,000), a car EMI at ₹14,500/month, an upgraded phone.
- Colleague: *"Bro, you got 22% and you're still in that place?"*
- Framing: *"You deserve this."*

### Choices
| # | Choice | Month +18 | Correct |
|---|---|---|---|
| A | Upgrade flat + car EMI | ⚡ Huge happiness spike (+30), then decays to baseline in 3 months. Fixed costs now ₹24,500 higher. **Savings rate falls below pre-raise level.** | ✗ |
| B | Upgrade flat only | Fixed +₹10,000/mo permanently. Raise mostly consumed. | ✗ |
| C | **Bank the full ₹11,400 into SIP + emergency fund. Lifestyle unchanged.** | Happiness +2 only. But savings rate jumps from 14% to 32%. By month 24, ₹2.1L extra. | ✓ |
| D | Split — half saved, half lifestyle | Defensible in reality, but here the raise is large enough that C strictly dominates for the goal state. | ~ |

### Debrief
> **The arithmetic:** you gained ₹11,400/month and committed ₹24,500/month. You are now **poorer than before the raise** in cash-flow terms, with a higher fixed floor that is very hard to lower.
>
> The happiness spike from the new flat lasted **11 weeks** in your run. That's **hedonic adaptation** — you return to baseline, but the EMI doesn't.
>
> **The rule that always works:** when income rises, raise savings *first* and let lifestyle rise from what's left — not the reverse. A raise is the single easiest moment in your life to increase savings rate, because you never adjusted to the money.

---

## EVENT 10 — "Uncle Needs a Guarantor"
### Concept: Never guarantee what you can't afford to lose · Proof: RULE + ARITHMETIC

**Biases:** social obligation, optimism bias, ambiguity aversion
**Vectors:** social pressure, authority (family elder), avoidance

### Setup
Your uncle needs a ₹6,00,000 business loan. The bank requires a guarantor. He asks you at a family function, in front of relatives. *"It's just a signature, beta. Formality only."*

### The pressure
- ⚡ Relatives visible on screen, watching.
- Your mother nods at you.
- *"You think I won't repay?"* — refusing is framed as an accusation.
- The form is genuinely one signature. It looks trivial.

### Choices
| # | Choice | Month +14 | Correct |
|---|---|---|---|
| A | Sign as guarantor | Family happiness +25. **Month 14: business fails. Bank comes to you for ₹6L. Your CIBIL drops 120 points. Home loan rejected.** | ✗ |
| B | Sign, but "I'll only cover part" | ⚡ **There is no partial guarantee.** You are liable for the full amount. The game reveals this only after signing. | ✗ |
| C | **Decline the guarantee. Offer ₹40,000 as a gift you can afford to lose.** | Family happiness −15, recovers over 6 months. Uncle finds another route. Your credit intact. | ✓ |
| D | Avoid — stop taking his calls | Family happiness −30, and he asks again next month with more pressure. | ✗ |

### Debrief
> A guarantee is not a formality. **You did not co-sign a favour — you took on the entire ₹6,00,000 debt**, with none of the money and no control over the business.
>
> There is no such thing as a partial guarantee. If the borrower defaults, the bank pursues *you*, in full, and your CIBIL carries the default as if it were yours.
>
> **The rule:** never guarantee an amount you could not comfortably repay yourself tomorrow. If you want to help, give what you can afford to lose, as a gift, and say so plainly. That protects the relationship *and* the balance sheet — a loan destroys both when it fails.

---

## EVENT 11 — "The Free Trial"
### Concept: Subscription traps / recurring cost blindness · Proof: ARITHMETIC

**Biases:** present bias, status quo, mental accounting
**Vectors:** reciprocity, ⚡ friction asymmetry, anchoring

### Setup
Seven services offer free trials this month — a fitness app, two streaming services, a music tier upgrade, a productivity tool, a news subscription, a cloud storage plan. All free for 30 days. All require a card.

### The pressure
- ⚡ **Signing up is one tap. Cancelling requires 4 screens and a "Are you sure? Here's 50% off" retention offer.** (Friction asymmetry — implement this literally.)
- Each individually is ₹149–₹499. Trivial in isolation (**mental accounting**).
- ⚡ Charges appear in month 2 as separate small line items, easy to miss.

### Choices
| # | Choice | Month +12 | Correct |
|---|---|---|---|
| A | Sign up for all 7 | ₹2,140/month = **₹25,680/year**. You use 2 of them. | ✗ |
| B | Sign up, "cancel later" | Status quo bias. You cancel 1 of 7. ₹22,000/year. | ✗ |
| C | **Sign up only for what you'll use this week, calendar-reminder each trial end** | ₹448/month for the 2 you actually use. | ✓ |
| D | Skip all | Fine, but you miss a genuinely useful tool. Slight learning penalty. | ~ |

### Debrief
> Seven decisions of ₹300 each felt like nothing. Together they were **₹25,680 a year** — more than a month of your income, for services you used twice.
>
> This is **mental accounting** meeting **status quo bias**: each subscription is evaluated alone and never re-evaluated. The company knows cancelling is harder than subscribing, and they built it that way.
>
> **The rule:** any recurring charge should be multiplied by 12 before you agree to it. "₹499/month" is "₹5,988/year." Decide on the annual number.

---

## EVENT 12 — "Not Now"
### Concept: Avoidance behaviour has a compounding price · Proof: ARITHMETIC

**Biases:** avoidance, ostrich effect, anxiety
**Vectors:** ⚡ avoidance affordance, ⚡ bandwidth tax, fear

### Setup
Three things need attention this month: an unopened credit card statement, a health insurance renewal notice, and an ITR filing deadline in 9 days. Your stress is already at 68.

### The pressure
- ⚡ **All three appear as sealed envelopes.** Opening them is a deliberate tap. They can be left sealed.
- ⚡ A **"Deal with this later"** button on each, always enabled, no immediate penalty.
- ⚡ Because stress > 60, **one of your allocation sliders is disabled this month** — the bandwidth tax made mechanical.
- Notification: *"You have 3 pending items"* — repeats and accumulates.

### Choices
| # | Choice | Consequence | Correct |
|---|---|---|---|
| A | Leave all three sealed | ⚡ Stress −8 immediately (relief is real). Then: late fee ₹600 + penalty APR; insurance lapses (uninsured when Event 14 fires); ITR late fee ₹5,000. | ✗ |
| B | Open one, defer two | Partial. Whichever is deferred fires its penalty. | ✗ |
| C | **Open all three, handle them** | ⚡ Stress **+15 in the moment** — genuinely unpleasant. Then stress −25 next month and all penalties avoided. | ✓ |
| D | Open, then "I'll do it tomorrow" | Same as A, with extra steps. The game tracks that you looked and still deferred. | ✗ |

### Debrief
> Leaving them sealed made you feel better immediately. Your stress genuinely dropped 8 points. **That relief cost you ₹5,600 in fees and left you uninsured for four months.**
>
> This is **avoidance behaviour**, and it is not laziness — your brain associates those envelopes with anxiety, and avoiding them provides real short-term relief. Everyone does this. It is the most under-discussed financial behaviour there is.
>
> **The counter-rule:** the discomfort of opening is bounded and brief. The cost of not opening compounds. When you notice yourself avoiding a financial task, that is precisely the signal that it is the most valuable thing you could do in the next ten minutes.

---

## EVENT 13 — "The Dream Car"
### Concept: Total cost of ownership, not sticker price · Proof: ARITHMETIC

**Biases:** anchoring, planning fallacy, social comparison
**Vectors:** anchoring, ⚡ instant dopamine, social proof, framing

### Setup
You've saved ₹4,00,000. The showroom car you want is ₹9,80,000 on-road. Financing available: ₹18,500/month for 5 years with ₹2,00,000 down.

### The pressure
- ⚡ The car renders in 3D and rotates. The EMI is shown, the total is not.
- Salesman: *"Only ₹18,500 — that's less than you spend on food."*
- ⚡ Colleague's Instagram: same car, delivery-day photo, 340 likes.
- **The costs never mentioned:** insurance ₹28,000/yr, service ₹18,000/yr, fuel ₹6,000/mo, parking ₹2,000/mo, depreciation ~15%/yr, road tax.

### Choices
| # | Choice | True annual cost | Correct |
|---|---|---|---|
| A | Finance the ₹9.8L car | ₹2,22,000 EMI + ₹28k ins + ₹18k service + ₹72k fuel + ₹24k parking = **₹3,64,000/yr.** On a ₹7.6L salary, that's 48% of gross income. | ✗ |
| B | Buy a ₹9.8L car in cash | No EMI, but ₹4L savings gone + still ₹1,42,000/yr running cost, and the asset loses 15%/yr. | ✗ |
| C | **Buy a ₹3,50,000 used hatchback in cash, keep ₹50k buffer** | ₹86,000/yr all-in. Gets you to work identically. | ✓ |
| D | Keep using the metro + occasional cab | ₹34,000/yr. Best financially; costs 40 min/day. | ~ |

### Debrief
> The salesman told you ₹18,500/month. The real number was **₹30,300/month**, once insurance, service, fuel, parking and depreciation were counted.
>
> A car is not a purchase; it is a **subscription with a large joining fee.** The sticker price is the smallest part of it.
>
> **The rule:** for any large asset, compute *total cost of ownership per year* before you look at the EMI. Purchase price ÷ expected years + insurance + maintenance + fuel + parking + depreciation. If that annual figure exceeds ~10–15% of your gross income, it will quietly dominate your finances.

---

## EVENT 14 — "The Deposit"
### Concept: Health insurance is bought before you need it · Proof: ARITHMETIC + EVIDENCE
### ⚡ This is the payoff event for Event 07 and Event 12. Fire it in month 14–18.

**Biases:** optimism bias, present bias, availability
**Vectors:** fear, urgency, ⚡ consequence of an earlier decision

### Setup
2:40 a.m. Appendicitis. The hospital wants an admission deposit **before** surgery.

### The branch — this is the entire design
- **If insured** (bought in month 2 for ₹950/month): you pay **₹9,000**. Cashless approval in 40 minutes. Stress +8.
- **If uninsured:** the bill is **₹2,15,000.** You have ₹40,000 liquid.

### Choices (uninsured branch only)
| # | Choice | Consequence |
|---|---|---|
| A | Credit card | ₹2,15,000 at 42% APR. Takes 3 years to clear, costs ~₹1,40,000 in interest. |
| B | Borrow from family | Relationship cost, tracked for the rest of the run. |
| C | Liquidate the SIP | Sells at whatever the market is doing — and it's month 15, so if the correction happened you sell at the bottom. |
| D | Personal loan at 16% | Least bad of four bad options. |

### Debrief
> **There is no correct choice on this screen.** The correct choice was made in **month 2**, when you were offered health insurance for ₹950/month and it felt like money for nothing.
>
> **The arithmetic:** 16 months of premiums = ₹15,200. The bill you avoided = ₹2,06,000. That is a **13.5× return** on the only product that pays out exactly when you can least afford the alternative.
>
> Insurance feels like waste in every month it isn't needed — which is nearly all of them. That's **optimism bias**: you knew the base rate for medical emergencies and quietly assumed it applied to other people.
>
> *Catastrophic health expenditure pushes millions of Indian households below the poverty line every year. This is the single most common route from stability to ruin in Indian household finance.*

---

# Further events — one-line specs

| # | Event | Concept | Proof | Key vector |
|---|---|---|---|---|
| 15 | Utilisation Cliff | Keep credit utilisation under 30% | ARITHMETIC | Hidden mechanic — CIBIL drops with no visible cause until explained |
| 16 | The Wedding | Debt-financed social spending | ARITHMETIC | Social pressure, family, ⚡ guest-list anchor |
| 17 | March 29th | 80C deadline panic-buying | ARITHMETIC | ⚡ Hard deadline timer, authority (agent) |
| 18 | Gold Loan | Secured loan against family gold | RULE | Cultural weight, urgency |
| 19 | The Rent Hike | Negotiation vs. immediate acceptance | EVIDENCE | Authority (landlord), avoidance |
| 20 | Two Job Offers | Total comp ≠ base salary (PF, insurance, ESOP) | ARITHMETIC | Anchoring on the bigger base number |
| 21 | The Referral Scheme | Ponzi / MLM structure recognition | EVIDENCE | Social proof (friend recruits you), reciprocity |
| 22 | Cheapest Insurance | Lowest premium ≠ best cover (sub-limits, room rent caps) | ARITHMETIC | Anchoring on price alone |
| 23 | The Nominee Form | Nomination/succession admin | RULE | ⚡ Boring, skippable — and the skip costs later |
| 24 | Sale Ends Tonight | Discount framing on unneeded goods | ARITHMETIC | ⚡ Countdown, strike-through anchor |
| 25 | The Lucky SIM | Lottery/prize scam | RULE | Reciprocity ("you've won"), urgency |
| 26 | Layoff | Runway computation, expense triage order | ARITHMETIC | Panic, ⚡ bandwidth tax |
| 27 | Crypto Uncle | Unregulated asset, no recourse | EVIDENCE | Authority + social proof |
| 28 | Advance Fee | "Pay ₹5,000 processing to release your ₹5L loan" | RULE | Desperation targeting — fire when player is in debt |

---

# Implementation schema

```ts
interface StoryEvent {
  id: string;
  title: string;
  month: { min: number; max: number };      // when it can fire
  lifeStages: LifeStage[];                   // which buckets see it
  concept: string;                           // concept id for mastery tracking
  proofType: 'ARITHMETIC' | 'EVIDENCE' | 'RULE';
  biases: string[];                          // for bias-profile diagnosis
  vectors: ManipulationVector[];             // drives UI pressure rendering

  setup: string;                             // scenario framing, 2-3 sentences
  pressure: PressureBeat[];                  // escalating, rendered in sequence

  choices: Choice[];
  correctChoiceId: string;                   // exactly one

  debrief: {
    opening: string;                         // names what was done to them
    proof: string;                           // the arithmetic/evidence/rule
    rule: string;                            // the portable takeaway
    reveal?: RevealSpec;                     // e.g. the full 5-year chart
  };

  // scales all ₹ amounts by income tier
  amountScaling: { low: number; mid: number; high: number };
}

interface PressureBeat {
  type: 'headline' | 'ticker' | 'chart' | 'timer' | 'testimonial'
      | 'notification' | 'dim' | 'prefill';
  content: string;
  delayMs: number;        // beats arrive in sequence to build pressure
}

interface Choice {
  id: string;
  label: string;
  hint?: string;
  visualWeight: 'primary' | 'normal' | 'muted';   // ⚡ the wrong choice is often 'primary'
  immediateEffects: Effect[];                      // includes the dopamine
  delayedEffects: { monthsLater: number; effects: Effect[] }[];
  requires?: Condition;
  blockedReason?: string;
}
```

**Two schema notes that matter:**

`visualWeight` lets the wrong choice be the prettiest button. This is the manipulation, encoded. Use it deliberately and reverse it occasionally so players can't learn "the big button is always wrong."

`delayedEffects` with `monthsLater` is what makes present bias teachable. Every tempting choice should have a positive immediate effect and a negative delayed one. If your engine can't schedule effects into future months, add that before authoring content — it's the mechanic the entire event library depends on.
