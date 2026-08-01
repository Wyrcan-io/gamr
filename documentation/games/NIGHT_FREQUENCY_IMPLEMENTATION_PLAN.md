# Night Frequency — Full Game & Implementation Plan

## Product decision

**Night Frequency is a deterministic, turn-based pirate-radio conspiracy game about deciding who gets the microphone, what the host says, and what fills the silence between calls.** The player runs one illegal overnight broadcast from a moving transmitter. Every broadcast round presents two callers, one or two fast contextual response choices, two fictional tracks, and one off-air station action. Those compact choices alter signal strength, the authorities' trace, the show's credibility, four audience factions, caller safety, and the evidence available for a final citywide broadcast.

The game borrows the immediacy of a Reigns-like binary decision—read a card, understand the directional consequences, choose left or right—but it is not a four-meter survival clone. The audience has distinct needs and capabilities, music creates time and cover for technical work, and the conspiracy can only be exposed by assembling a valid evidence chain. The best ending comes from telling a claim the show can actually prove, not from keeping every meter near the middle.

Version 1 should ship as one authored 35–50 minute night, a 5-minute skippable tutorial, deterministic seeded flavour variation, act checkpoints in memory, six substantially different endings, and a detailed end-of-show broadcast log. Build a three-round vertical slice first. Do not write the full campaign until caller selection, response pacing, the song/action link, and the deduction board work together.

## Research basis and repository fit

The design is based on the requested rapid-choice structure and on the repository's existing patterns. External research is not necessary for Version 1: the important design questions are internal rules, fairness, terminal presentation, and differentiation from games already in Gamr.

Repository precedents to reuse:

- `src/games/dead-letter-department/` demonstrates a pure narrative judgment engine, declarative content, deterministic generation, and evidence-backed debriefs.
- `src/games/time-capsule/` demonstrates authored story dependencies, condition/effect data, content validation, and campaign transcript tests.
- `src/games/signal-noise/` demonstrates an information-dense radio interface, compact `80×28` rendering, and a mystery whose conclusions come from visible evidence.
- `src/games/shared/menu.ts`, `src/games/gameTransitions.ts`, and `src/games/utils.ts` provide the required pause, lifecycle, transition, and theme behavior.

Night Frequency must remain clearly distinct from **Signal//Noise**:

| Signal//Noise | Night Frequency |
|---|---|
| Operate a receiver and triangulate transmissions. | Curate a live show and build a public case. |
| Frequency, bandwidth, modulation, gain, and bearings. | Callers, responses, songs, faction trust, credibility, and trace. |
| Instrument puzzle with a protocol answer. | Editorial strategy game with a social deduction finale. |
| Locate one source per case. | Corroborate four claims across one escalating night. |

They may share Gamr lifecycle helpers and general rendering utilities, but Night Frequency should not reuse the other game's tuner, spectrum, map, or case engine.

## Player promise and design pillars

> “The city thinks it is alone after midnight. I can put the right voices together, prove what is about to happen, and keep the transmitter alive long enough for everyone to hear it.”

1. **Every choice is quick to make but hard to dismiss.** The copy is short, the two actions are concrete, and the immediate systemic direction is visible before commitment.
2. **The show is a coalition, not one audience meter.** Night workers, neighborhood organizers, young couriers and artists, and radio obsessives value different conduct and offer different forms of help.
3. **Signal is reach and exposure.** A stronger transmission unlocks distant witnesses and better corroboration, but it also accelerates triangulation. Going quiet is useful, not automatically cowardly.
4. **Music is an action economy.** Tracks shape the station's identity, affect factions, mask the carrier, and determine how much off-air work the crew can complete.
5. **Claims require proof.** Repeating two copies of the same rumor is not corroboration. The dossier distinguishes source groups, reliability, support, and contradiction.
6. **Plants are detectable.** A deceptive caller always conflicts with an observable fact, uses a compromised source chain, or fails a verification step. There are no invisible coin-flip betrayals.
7. **Consequences are causal.** If the station is jammed, raided, disbelieved, or abandoned by a faction, the report names the calls, choices, thresholds, and incidents that caused it.
8. **The terminal is the studio.** Switchboard lights, cartridge labels, VU-style meters, a paper dossier, and a scrolling transmission log create the fantasy without requiring audio.

## Tone, setting, and cast

The city is **Bellwether**, a dense fictional coastal city whose official radio becomes automated after midnight. The player is the unnamed host of **Night Frequency 91.7**, broadcasting from a converted delivery van that changes rooftops between acts. The show is illegal because it uses abandoned municipal relay space, not because the player is a combatant.

The recurring off-mic producer is **Moth**, who screens calls, checks documents, and translates engine feedback into human language. Moth never solves the case for the player. They explain why a source is weak, remind the host of a promised callback, and warn when the carrier is being traced.

The central conspiracy is civic noir rather than supernatural horror. There may be one unexplained carrier in the epilogue, but the campaign's actual claims have concrete, provable answers. The writing should be humane, tense, occasionally funny, and skeptical without treating every institution or every caller as malicious.

## Session shape

| Section | Rounds | Target time | Purpose |
|---|---:|---:|---|
| Tutorial cold open | 1 guided round | 4–6 min | Choose a caller, answer, play a track, verify a clue, and pin a claim. |
| Act I — Rumor | 3 rounds | 9–12 min | Learn the factions and notice that unrelated reports share a timestamp. |
| Act II — Pattern | 3 rounds | 10–14 min | Endure jamming, identify the delivery system, and test source reliability. |
| Act III — Proof | 3 rounds | 10–14 min | Protect key witnesses, complete the dossier, and prepare a counter-broadcast. |
| Finale and report | 1 multi-step broadcast | 5–8 min | Choose the claim, response plan, and risk posture; see the city react. |

There is no real-time decision timer. “Rapid” means that most screens ask for one binary choice and resolve immediately. The player may pause, inspect the dossier, or reread the log without consuming show time. A 20 FPS render loop is only for restrained indicator pulses and title/static effects; simulation state changes only through commands.

## Core loop

Each of the nine main broadcast rounds follows the same readable rhythm:

1. **Read the board.** See current signal, trace, credibility, faction trust, the next known incident, and the dossier's four claim states.
2. **Pick up one of two callers.** The switchboard shows alias, district, faction, topic, urgency, and a risk cue. Choosing one normally means passing on the other.
3. **Host the call.** Make one or two binary contextual responses: press for detail or protect a source, calm the city or amplify anger, verify a claim or chase spectacle.
4. **Receive consequences.** Apply visible meter/faction changes, caller state, leads, evidence, and any response-specific follow-up.
5. **Choose one of two records.** Each fictional track shows audience affinities, duration, masking, and any special probe effect.
6. **Work during the song.** Spend the track's work capacity on one eligible station action: patch the rig, scrub the trace, verify evidence, call back a lead, or prepare the finale.
7. **Advance the broadcast clock.** Apply passive trace, scheduled incidents, faction perks/complications, signal decay, and threshold events.
8. **Update the dossier.** Review newly supported or contradicted candidates and pin or revise hypotheses for free.

The repeated dramatic question is: **whose voice does the city need, what do I ask of them, and what risk do I take to prove it?**

## The broadcast clock and act structure

The show begins at `00:47` and the hostile emergency transmission is scheduled for `03:17`. Time is expressed as authored round labels rather than simulated minutes.

```text
Act I     Rounds 1–3     00:47 / 01:03 / 01:21
Act II    Rounds 4–6     01:42 / 02:01 / 02:19
Act III   Rounds 7–9     02:38 / 02:54 / 03:08
Finale    Countercast   03:17
```

Every completed round advances exactly once. Inspecting help, log, callers, records, or dossier candidates is free. A rejected or illegal command never advances time. Scheduled incidents are displayed at least one round ahead unless discovering their existence is itself an authored clue; even then, their mechanical consequence is previewed before the player commits the choice that triggers them.

Act transitions create an in-memory checkpoint before the next act begins. `Retry Act` restores the exact seed and state from that checkpoint. It is available from an ending/report screen, not as an undo during play.

## Rapid-choice contract

Most decisions use a two-card presentation with `Left/A/1` and `Right/D/2`. Each option must contain:

- an action label of at most 28 visible characters;
- one short in-character response or action preview;
- all immediate meter/faction effects as direction and magnitude;
- a risk label when it can expose a caller, consume a one-use resource, or cross a known threshold;
- an optional story consequence marker `◆ CLUE`, `☎ CALLBACK`, or `! SOURCE RISK`.

Magnitude notation is exact enough to plan without turning every card into arithmetic:

| Display | Numeric delta |
|---|---:|
| `↑` / `↓` | 1–4 |
| `↑↑` / `↓↓` | 5–9 |
| `↑↑↑` / `↓↓↓` | 10 or more |

Pressing `Tab` on a choice reveals exact numbers and the rule explanation in an inspection line. Story outcomes may remain unknown, but immediate systemic effects may not. If a modifier changes an effect—such as a faction perk reducing relocation loss—the preview must show the modified result that will actually resolve.

Choices should not be generic `GOOD / BAD`, `AGREE / DISAGREE`, or permanent personality axes. Response labels are authored to the moment, for example:

```text
[A] “Read the work-order number.”       CRED ↑  DEEP DIAL ↑  ◆ CLUE
[D] “Do not name your depot on air.”    BLOCKWATCH ↑↑  TRACE ↓  ☎ CALLBACK
```

## Core resources

### Signal

`signal` is the effective carrier strength and health, from `0` to `100`. Start at `58`.

| Signal | State | Mechanical meaning |
|---:|---|---|
| `0` | OFF AIR | Immediate off-air ending unless a prepared backup transmitter exists. |
| `1–24` | FADING | Distant callers are held rather than destroyed; a recovery call/action is guaranteed next round. |
| `25–69` | LOCAL | Normal offer pool and normal evidence yield. |
| `70–89` | CITYWIDE | Distant witnesses and multi-district corroboration become eligible; passive trace rises. |
| `90–100` | BURNING | All reach gates are open, but the carrier generates an extra trace per round. |

Signal changes through transmitter damage, jamming, power choices, repairs, relocation, caller technical advice, and a few track properties. The game never garbles critical prose. Low signal changes which sources can connect and how much evidence arrives, with explicit labels, rather than hiding words from the player.

### Trace

`trace` represents the authorities' progress locating the mobile studio, from `0` to `100`. Start at `12`. Higher is worse.

After the station action, every completed round adds passive trace:

```text
passiveTrace = 1
             + (signal >= 60 ? 1 : 0)
             + (signal >= 80 ? 1 : 0)
             + (signal >= 95 ? 1 : 0)
             + activeIncidentTrace
             - currentTrack.masking
```

The result is clamped to a minimum of `0` for that round. The UI always shows `END-ROUND TRACE: +N` before the track is confirmed.

One-time threshold incidents resolve when crossed:

| Trace | Incident | Effect and counterplay |
|---:|---|---|
| `35` | Direction finder | Moth reveals the district being searched; Night Shift trust can reveal it one round early. |
| `60` | Narrowband jammer | `signal -12`; patching, a masking track, or the Deep Dial perk can reduce it. |
| `80` | Vans closing | Next round forces `Relocate` or `Hold Position`; both show exact costs. |
| `100` | Raid | Raid ending, unless the single-use decoy was prepared before crossing. The decoy resets trace to `74` and is consumed. |

Trace never falls merely because time passed. Scrubbing, relocation, a decoy, or a specific caller contact must explain the reduction.

### Credibility

`credibility` measures whether listeners believe the show distinguishes reporting from rumor. Start at `50`.

- Below `25`, evidence requests from the audience return fewer leads and the final expose cannot achieve its best result.
- At `50+`, ordinary testimony can mobilize listeners when paired with proof.
- At `70+`, one verified inside source may be safely rebroadcast without an additional public corroborator.
- Credibility never causes an instant loss; a reckless show can still jam the false alert or save sources even if it cannot persuade the whole city.

Credibility rises for corrections, transparent uncertainty, successful verification, protecting source claims, and accurately revisiting an earlier statement. It falls for presenting rumors as facts, outing callers, accepting planted framing after a contradiction is visible, and making an unsupported final claim.

## Audience factions

Each faction has `trust` from `0` to `100`, starting at `45`. Trust represents willingness to call, relay, shelter, verify, and act—not approval of every song. A faction is never “eliminated,” but low trust disables its network help until repaired.

### The Night Shift (`N`)

Drivers, hospital staff, cleaners, dispatchers, dock crews, and all-night shops.

- Values: useful information, calm wording, accurate timing, keeping services running.
- Dislikes: vague panic, treating working callers as scenery, unnecessary disruption.
- `65+` perk — **Route Reports:** show the next trace incident or relocation penalty one round earlier.
- `20 or less` complication — practical infrastructure callbacks will not connect.
- Finale role: distribute the corrected alert through buses, hospitals, and depots.

### The Rooftops (`R`)

Couriers, students, pirate-radio fans, artists, bike crews, and volunteer antenna relays.

- Values: candor, defiance, energetic programming, giving unheard people the mic.
- Dislikes: deference to official intimidation, bloodless fence-sitting, repetitive safe programming.
- `65+` perk — **Second Ring:** once per act, one passed non-urgent caller can return in a later offer.
- `20 or less` complication — no volunteer relay; signal repairs restore `4` less.
- Finale role: rebroadcast the countercast from rooftops after the van moves.

### Blockwatch (`B`)

Tenant captains, caregivers, shopkeepers, mutual-aid kitchens, and neighborhood legal observers.

- Values: source protection, practical safety, solidarity, preventing public panic.
- Dislikes: doxxing, spectacle that endangers a district, abandoning an urgent caller.
- `65+` perk — **Safe Roof:** the first relocation in each act loses `6` less signal.
- `20 or less` complication — safe-house relocation is unavailable; only the costly street move remains.
- Finale role: knock doors, keep Harbor Ward in place, and document security activity.

### Deep Dial (`D`)

Radio hobbyists, repair technicians, archivists, scanner listeners, and signal obsessives.

- Values: precise questions, recordings, source chains, strange details that can be tested.
- Dislikes: destroying tapes, flattening uncertainty into certainty, ignoring contradictions.
- `65+` perk — **Bench Test:** the first evidence verification each act costs `1` less work, minimum `1`.
- `20 or less` complication — technical evidence arrives as unverified until separately checked.
- Finale role: identify and interfere with the hostile alert carrier.

### Trust resolution

Every caller, response, song, and major station action carries authored faction deltas. Apply them after general meters and before checking perk-dependent incidents. Passing on a caller only changes trust if the caller is marked `urgent` or the offer explicitly says the faction is watching; the usual cost is `-2`, never a surprise large penalty.

Thresholds are recalculated after each choice. Crossing `65` grants the perk immediately and logs it. Falling below `65` removes the perk after the current choice resolves, so a previewed perk cannot disappear halfway through its own command. Complications become active at `20` or below and are always printed in the faction panel.

There is no opaque “audience share” simulation. Finale network strength is derived from visible trust:

```text
networkStrength = round(average(all four trust values))
                + 8 * count(faction trust >= 65)
                - 8 * count(faction trust <= 20)
```

## Caller system

### Caller offers

Each round offers two eligible callers. The preview includes:

- alias and district;
- faction affiliation;
- topic line of at most 42 visible characters;
- urgency: `ROUTINE`, `TIME-SENSITIVE`, or `IN DANGER`;
- source cue: `FIRSTHAND`, `HEARD SECONDHAND`, `HAS RECORDING`, `OFFICIAL`, or `UNKNOWN`;
- known cost of passing if any.

Offer generation is deterministic and constrained, not a fully random deck:

1. Start with the authored candidates for the current round window.
2. Remove callers whose prerequisite flags are not met, who are resolved, or whose faction complication blocks them.
3. Insert a mandatory incident caller when the campaign schedule requires one.
4. If signal is below a caller's reach requirement, hold that caller for the next valid round and select a local alternative.
5. If the Rooftops' `Second Ring` is active, one eligible passed caller may occupy the designated callback slot.
6. Rank remaining candidates by authored priority, unmet evidence coverage, arc continuity, and a seeded tie-break value.
7. Choose a pair that does not share the same primary faction unless the round is explicitly about a faction conflict.
8. If fewer than two exist, use an authored recovery/filler call that cannot introduce decisive evidence.

The seed changes aliases, greetings, minor song crates, tie order among equivalent callers, and non-decisive flavor. It must not change the true conspiracy, evidence semantics, threshold rules, or scheduled incident order.

### Caller states and safety

```text
queued → offered → aired → resolved
                  ↘ passed → callbackEligible → offered
aired → protected / exposed / disconnected / detained
```

Caller safety affects story and the `People` portion of the final report. Exposing a caller must require an explicit choice with `! SOURCE RISK` in its preview. Caller harm is never rolled randomly. It follows declared rules such as broadcasting a workplace plus real name after trace `60`, failing a promised relocation, or leaving an identified plant unchallenged.

### Response nodes

An aired call has one or two response nodes. Three is the hard maximum for exceptional Act III calls. A node contains short caller text and exactly two authored responses. A response may:

- change meters or faction trust;
- add a lead or evidence item;
- upgrade or compromise evidence;
- set a callback/safety flag;
- branch to one more response node;
- end the call.

There are no arbitrary response-skill checks. If a result depends on a prior fact, the option shows the requirement, such as `◆ Ask about work order [known]`; unavailable evidence-specific questions remain visible but disabled with a reason.

## Song and playlist system

All music is fictional and represented through title, artist, format, mood, and tiny waveform animation. No audio playback or copyrighted lyrics are required.

Each record defines:

```ts
interface TrackDefinition {
  id: TrackId;
  title: string;
  artist: string;
  format: '7-inch' | 'cassette' | 'reel' | 'acetate';
  tags: TrackTag[];
  workUnits: 1 | 2 | 3;
  masking: 0 | 1 | 2 | 3;
  effects: Effect[];
  probe?: ProbeDefinition;
  cooldown: number;
}
```

- **Work units** determine which station action fits under the track.
- **Masking** reduces that round's passive trace, not trace already gained from an on-air choice.
- **Faction effects** express taste and what playing the record means in context.
- **Probe tracks** contain a known tone, phase, or recording that listeners can compare against city infrastructure. They create evidence only after the relevant lead is known.
- **Cooldown** prevents immediate repeats. Repeating the same tag three music breaks in a row causes `format fatigue`: the most aligned faction gets `-3 trust`. The preview shows it.

Initial fictional crate:

| Track | Identity | Work | Mask | Primary effect |
|---|---|---:|---:|---|
| *Night Bus Home* — Marrow FM | warm post-punk | 2 | 1 | Night Shift `+6`, Blockwatch `+2`. |
| *Keep the Hall Light On* — June Harbor | intimate folk | 2 | 1 | Blockwatch `+6`, credibility `+2`. |
| *Teeth of the Antenna* — Static Saints | abrasive punk | 1 | 3 | Rooftops `+7`, immediate trace `+2`. |
| *No Gods on the Dial* — Wires Awake | dance-punk | 2 | 2 | Rooftops `+5`, Deep Dial `+2`. |
| *Carrier Wave Lullaby* — Iona Kett | ambient reel | 3 | 2 | Deep Dial `+6`; enables carrier comparison probe. |
| *Numbers Under Rain* — Pale Index | minimal electronic | 2 | 3 | Deep Dial `+7`, Night Shift `-2`. |
| *Soup at Four A.M.* — Common Room | loose soul | 3 | 0 | Blockwatch `+4`, Night Shift `+4`; long work window. |
| *Union of Strangers* — Coalbirds | garage anthem | 1 | 2 | Night Shift `+4`, Rooftops `+4`, signal `+3`. |
| *City Sleeps Sideways* — Velvet Exit | dream pop | 2 | 1 | all factions `+2`; no specialization. |
| *The Last Honest Weather* — Sable Forecast | spoken forecast | 3 | 0 | tests whether the official “chlorine wind” data is physically possible. |
| *Glass Elevator* — The Understory | clean synth-pop | 1 | 2 | credibility `+1`; safe filler with no clue. |
| *Dead Air Is Still Air* — Aster Vale | damaged acetate | 3 | 3 | signal `-5`, Deep Dial `+4`; excellent cover for trace work. |

Track offers should create a real decision: faction identity versus work time, clean transmission versus masking, or entertainment versus a clue probe. A song may not be a strictly better version of its paired alternative across every displayed value.

## Off-air station actions

After choosing a record, the player may perform one action whose `workCost` is no greater than the track's work units. Unused work does not carry over.

| Action | Cost | Rule |
|---|---:|---|
| Patch transmitter | 1 | `signal +10`; only `+6` if Rooftops trust is `20` or less. |
| Tune power up | 1 | `signal +12`, immediate `trace +5`. |
| Feather power down | 1 | `signal -8`, `trace -4`; cannot reduce signal below `1`. |
| Verify evidence | 2 | Upgrade one eligible evidence item; cost is `1` for the first use in an act with Deep Dial perk. |
| Return a lead | 2 | Resolve a known callback into testimony or a safety result. |
| Scrub the carrier | 2 | `trace -9`; requires a technical lead or Deep Dial trust `45+`. |
| Prepare decoy | 3 | Arm one raid escape; once per show and requires a decoy lead. |
| Relocate | 3 | `trace -28`, `signal -14`; Safe Roof reduces signal loss to `-8`. Clears current jammer. |
| Prepare countercast | 2 | Bank one preparation point used by the finale; maximum `2`. |

Unavailable actions remain visible with their requirement. The preview incorporates track masking, faction perks, current thresholds, and whether the action will trigger an incident. Skipping work is legal and sometimes protects a caller callback that requires the line to stay open.

## The conspiracy: Project Nightglass

At `03:17`, **Halcyon Civic Systems**, aided by a deputy commissioner in Bellwether's emergency office, plans to inject a forged chlorine-leak evacuation order into the municipal alert network. The signal originates from the abandoned **Old Crown Telephone Exchange**. Its real purpose is to empty **Harbor Ward** before a dawn private-security clearance, defeating a court injunction and removing tenant records before they can be served.

The four required dossier slots are:

| Slot | Correct candidate | Plausible alternatives |
|---|---|---|
| Operator | Halcyon Civic Systems | Emergency Office alone; rival pirate Bellwether Voice; transit union. |
| Method | Forged chlorine emergency alert | Grid overload; poisoned reservoir; experimental calming tone. |
| Origin | Old Crown Telephone Exchange | North Reservoir; Metro Control; Harbor radio tower. |
| Objective | Empty Harbor Ward for the dawn clearance | Cover a prisoner transfer; manipulate utility markets; conduct a harmless drill. |

The exact `03:17` activation time is tracked as a timeline fact rather than a fifth hypothesis. It becomes confirmed by two independent clues and determines whether a finale preparation is timely.

The scheme is fictional. Help and end copy should not imply that real emergency systems work this way or provide operational instructions for interfering with them.

## Evidence and deduction system

### Evidence model

Every evidence item has player-facing text and engine-facing claims:

```ts
type Reliability = 1 | 2 | 3; // rumor, direct testimony, hard record

interface EvidenceItem {
  id: EvidenceId;
  title: string;
  summary: string;
  sourceGroup: SourceGroupId;
  reliability: Reliability;
  status: 'unverified' | 'verified' | 'compromised';
  supports: ClaimRef[];
  contradicts: ClaimRef[];
  verifyLead?: LeadId;
  publicSafe: boolean;
  acquiredRound: number;
}
```

`sourceGroup` prevents false corroboration. A caller quoting a leaked memo and another caller repeating that first caller are the same group. A paper work order, a firsthand technician, and an independent carrier recording can be separate groups.

Evidence weight is:

```text
compromised       = 0
unverified        = 1
verified rumor    = 1
verified testimony= 2
verified hard record = 3
```

### Candidate confidence

For each candidate:

```text
supportWeight     = sum(highest supporting weight in each source group)
contradictWeight  = sum(highest contradicting weight in each source group)
netScore          = supportWeight - contradictWeight
sourceCount       = unique non-compromised supporting source groups
```

The displayed state is:

- `OPEN`: net score below `2`.
- `PLAUSIBLE`: net score `2+`.
- `SUPPORTED`: net score `4+`, two independent source groups, and at least one verified item of reliability `2+`.
- `PROVEN`: the `SUPPORTED` conditions, contradiction weight at most `1`, and a margin of at least `2` over every rival candidate in the same slot.
- `CONTESTED`: the candidate otherwise qualifies as supported but has contradiction weight `2+` or lacks the required margin.

The player may pin any candidate at any time for free. Pinning is a statement of belief, not a destructive lock. The dossier shows which evidence supports and contradicts the pinned candidate, source-group count, and the nearest rival. It never exposes raw hidden tags without corresponding readable evidence text.

### Fairness contract

1. Every correct claim has at least three available evidence routes and at least two independent source groups that cannot both be lost in the same caller offer.
2. A normal successful run can prove all four claims while passing on at least four conspiracy-related callers.
3. Every false candidate receives at least one readable contradiction before the finale.
4. No plant can permanently destroy evidence; at worst it costs credibility, trace, or a verification opportunity.
5. Faction-gated evidence has a second route outside that faction.
6. Low signal defers decisive callers or substitutes a local route; it never silently deletes the only proof.
7. The final broadcast screen names missing proof conditions and does not label a merely plausible claim as fact.

### How player choices create evidence

- **Pressing a caller** may extract a work-order number but expose their location.
- **Protecting a caller** may delay the clue into a callback that costs work during a song.
- **Correcting the record** can compromise an earlier rumor and raise credibility.
- **Playing a probe track** can generate independent technical evidence if the relevant lead is known.
- **Verifying evidence** changes its status and may reveal that two items share one source group.
- **Maintaining faction trust** makes the faction's final witness or relay available.

This makes deduction part of broadcasting rather than a separate multiple-choice quiz.

## Authored campaign content

The exact offer pair may vary among equivalent optional calls, but the main arc should use the following content map.

| Round | Call candidates and clue role | New pressure |
|---:|---|---|
| Tutorial | A depot cleaner hears a maintenance burst; a rooftop listener relays it. | Learn source cues, song work, verification, and pinning. |
| 1 | Bus driver reports every route display showing `03:17`; rooftop photographer sees Halcyon vans at Old Crown. | First choice between timing and place/operator evidence. |
| 2 | Harbor tenant has a preprinted evacuation leaflet; hospital operator says no chlorine protocol is scheduled. | Introduce urgent pass cost and mechanism contradiction. |
| 3 | Meter technician found an illegal alert bridge; city spokesperson offers a polished “routine drill” explanation. | First observable plant and trace `35` pressure. |
| 4 | Court clerk has the unserved clearance injunction; rival pirate blames the transit union without a source. | Establish objective versus sensational false candidate. |
| 5 | Former Halcyon audio engineer recognizes the handshake; sanitation worker confirms chlorine sensors are normal. | Strong method evidence and first jammer response. |
| 6 | Night train dispatcher traces a leased line to Old Crown; Deep Dial listener triangulates the same carrier from recordings. | Independent origin routes; false alert rehearsal. |
| 7 | Security guard describes private clearance crews; Harbor organizer needs the show to protect residents, not panic them. | Source safety and Blockwatch mobilization. |
| 8 | Emergency operator reports a stolen authorization code; anonymous caller urges immediate violence using a contradicted detail. | High-trace plant with explicit tell. |
| 9 | Halcyon whistleblower can authenticate the order; archive callback can independently match contract and carrier records. | Final proof route and countercast preparation trade-off. |
| Finale | Moth opens the mic at `03:17`. | Name the claim, choose response, choose whether to stay live. |

At least eight optional character calls should add texture without being evidence vending machines: a baker dedicating a song, a sleepless child asking whether the city is safe, a cab dispatcher correcting street names, a hostile late-night presenter, an amateur poet, a lonely bridge operator, a nurse requesting calm, and an old listener who remembers the frequency's previous owner. Optional calls still interact with trust, credibility, safety, or callback economy.

## Finale and endings

The finale is three fast decisions, each with requirements shown:

1. **Claim:** air the currently pinned four-part dossier, narrow it to only proven claims, or state that the evidence is incomplete.
2. **Response:** expose and correct the alert, jam the hostile carrier, mobilize Harbor Ward directly, or preserve source safety and go dark.
3. **Risk posture:** stay live from the van, burst the message and relocate, or hand the rebroadcast to faction relays.

### Route requirements

| Route | Strong-success requirements | Failure mode |
|---|---|---|
| Expose and correct | All four correct, at least three `PROVEN`, credibility `50+`, network `55+`, signal `35+`. | Unsupported parts are challenged; partial public warning. |
| Jam carrier | Correct Method and Origin at `SUPPORTED+`, signal `65+`, Deep Dial or Night Shift `65+`, one preparation. | Jam covers only part of the city or burns out the transmitter. |
| Mobilize Harbor | Correct Objective at `PROVEN`, Blockwatch and Night Shift `55+`, credibility `40+`. | Ward response is fragmented but some callers are protected. |
| Go dark / protect sources | Always available. Better if callers are protected and trace is below `100`. | The official alert proceeds, but the human network survives. |

Candidate endings:

- **THE CITY ANSWERS BACK** — complete proven expose, corrected alert, broad relay, and protected key sources.
- **HARBOR HOLDS** — the ward is protected through mobilization or a local jam, but the conspiracy is not fully broken.
- **TRUTH IN THE STATIC** — most facts are correct, yet weak credibility or reach limits public effect.
- **SAVE THE VOICES** — the station goes dark deliberately and preserves its sources for another night.
- **DEAD AIR** — signal collapse, unescaped raid, or a failed burn; the report still shows what was learned.
- **PANIC FREQUENCY** — an unsupported accusation or reckless alert causes harm and discredits the show.

No single meter alone decides the best ending. A high-signal, high-trace run can succeed through rooftop relays; a quiet run can succeed through Blockwatch mobilization; a low-credibility run can still prevent the forged alert by proving its carrier and origin.

## Scoring and end report

The main reward is the ending and causal report. A score supports replay and balancing without replacing the fiction.

```text
score = 1,000
      + 200 × correct pinned claims
      + 150 × proven correct claims
      + 40  × protected named callers
      + 25  × factions at trust 65+
      + 20  × unused preparation/decoy resources
      - 10  × exposed caller incidents
      - 5   × final trace
      - 200 × wrong pinned claims aired as fact
```

Clamp score at zero. Report four named dimensions before the numeric score:

- **Truth:** correct, proven, contested, and false claims.
- **People:** protected, exposed, detained, and successfully called back.
- **Network:** each faction's final trust and contribution.
- **Air:** final signal, trace, relocations, jamming, and whether the station survived.

The report also prints the seed, full playlist, callers aired/passed, evidence source chains, pivotal threshold incidents, and the final response. Each negative result names a cause such as `TRACE CROSSED 80 AFTER BOOSTING DURING A ZERO-MASK TRACK`, never a generic “bad choice.”

## Interface and controls

### Minimum layout: `80×28`

```text
 NIGHT FREQUENCY 91.7  ◉ LIVE   02:19   ROUND 6/9   NEXT: JAMMER @ TRACE 60
 ≈ SIGNAL  [######---] 64   ▲ TRACE [#####----] 57   ◆ CRED [######---] 61
 AUDIENCE  N 72 ROUTES  R 58 —  B 66 SAFE ROOF  D 63 —
┌─ SWITCHBOARD ───────────────────────────────────────────────────────────┐
│ [1] LINE SEVEN / NIGHT TRAIN / N / FIRSTHAND                           │
│     “The leased circuit terminates under Old Crown.”                   │
│ [2] SUNDIAL / DEEP DIAL / D / HAS RECORDING                            │
│     “I can compare bearings if you play the carrier reel.”             │
└────────────────────────────────────────────────────────────────────────┘
┌─ DOSSIER ───────────────────────────┐┌─ ON AIR / PREVIEW ───────────────┐
│ OPERATOR  ● HALCYON       SUPPORTED ││ [A] TAKE LINE SEVEN              │
│ METHOD    ● FORGED ALERT  PROVEN    ││ N ↑  CRED ↑  ◆ ORIGIN            │
│ ORIGIN    ● OLD CROWN     PLAUSIBLE ││                                 │
│ OBJECTIVE ○ UNPINNED      OPEN      ││ [D] TAKE SUNDIAL                 │
│ TIME      03:17           CONFIRMED ││ D ↑↑  TRACE ↑  ☎ PROBE           │
└─────────────────────────────────────┘└───────────────────────────────────┘
 LOG  MOTH: Passive trace after this round is +2. Track masking can lower it.
 [A/←/1] Left  [D/→/2] Right  [Enter] Confirm  [I] Dossier  [L] Log
 [Tab] Exact effects  [H] Help  [Esc] Pause
```

The same frame changes its central panels by phase:

- **Switchboard:** two caller cards.
- **On Air:** transcript and two responses.
- **Music:** two cartridge cards, playlist, masking, and work units.
- **Workbench:** eligible station actions and exact resolution preview.
- **Dossier:** candidates on the left, evidence/source chain on the right.
- **Incident:** threshold event and two responses.
- **Finale:** pinned case, route requirements, and risk posture.
- **Report:** causal timeline and ending.

At `96×30` or wider, keep the status bar and choice positions fixed, show the last three log entries, and display full evidence summaries beside the dossier. Do not add more decisions merely because space is available.

Below `80×28`, freeze game input except pause/quit and show the standard resize message with required and current dimensions.

### Input map

| Context | Keys | Action |
|---|---|---|
| Binary choice | `A/Left/1`, `D/Right/2` | Select option; `Enter` confirms. |
| Lists/dossier | arrows or `WASD` | Move selection. |
| Any play screen | `I` | Open/close dossier; inspection is free. |
| Any play screen | `L` | Open/close full transmission log. |
| Music/workbench | `1–9` | Select record/action where numbered. |
| Inspection | `Tab` | Toggle concise versus exact effect/rule text. |
| Any | `H` | Context help. |
| Any non-modal | `Esc` | Shared pause menu. |
| Title/report | `T/P/R/N/Q` | Tutorial, play, retry, next game, quit as labelled. |

Selection and confirmation are separate for choices that expose a caller, cross trace `80/100`, spend the decoy, or air an unsupported accusation. Ordinary low-risk choices may use the number key once to select and `Enter` to commit; an accessibility option may require confirmation for every choice.

## Semantic visual language

Use a small consistent vocabulary with an ASCII fallback. Glyphs must be tested for one-cell width.

| Concept | Preferred | ASCII | Use |
|---|---|---|---|
| Live carrier | `●` | `O` | live status and selected/pinned item |
| Signal | `≈` | `~` | signal meter and carrier events |
| Trace/risk | `▲` | `!` | tracking meter and threshold warnings |
| Caller | `☎` | `C` | switchboard and caller log |
| Record | `♫` | `M` | song cards and playlist |
| Evidence | `◆` | `E` | verified/supporting evidence |
| Unverified | `◇` | `?` | rumor or unchecked item |
| Verified | `✓` | `+` | completed verification/proven claim |
| Contradiction | `×` | `x` | candidate conflict |
| Callback | `↩` | `<` | lead or returning caller |
| Protected | `□` | `P` | source-safety status |
| Exposed | `!` | `!` | source at risk |
| Left/right choice | `←/→` | `</>` | response direction |

Faction identity should use stable letters `N`, `R`, `B`, and `D` in addition to color. Do not rely on four similar pictograms.

Visual treatment:

- theme color for selected cards, borders, and normal carrier state;
- yellow/bright for imminent thresholds, contested claims, and time-sensitive callers;
- red/magenta equivalent for exposed sources, crossed trace thresholds, false final claims, and raid state;
- cyan/blue equivalent for evidence, verification, and Deep Dial technical events;
- dim text for passed calls, exhausted tracks, and superseded evidence;
- a restrained two-line glitch title, a one-frame carrier tear when jammed, a switchboard blink on new calls, and a brief stamp on `PROVEN`;
- no continuous static over text, random horizontal movement during choices, or animation that changes readable content.

Manually inspect dark and light themes at `80×28`, `96×30`, and a wide terminal. Strip ANSI before measuring visible width and centering.

## Tutorial and accessibility

### Tutorial cold open

The tutorial uses a harmless municipal maintenance transmission before the main night. It teaches one idea at a time:

1. choose between a firsthand caller and a secondhand rumor;
2. make a response with visible directional effects;
3. pick a long masking track;
4. spend its work on `Verify evidence`;
5. see two items share a source group and therefore fail to corroborate;
6. acquire an independent recording and pin a `PROVEN` practice claim;
7. watch signal create passive trace and feather power down.

Tutorial thresholds cannot cause failure. Moth's prompts explain the exact rule, highlight the relevant panel, and can be dismissed after the first successful completion. The main campaign begins from fresh default meters, so tutorial experimentation cannot damage the run.

### Accessibility requirements

- No audio-dependent information and no real-time input deadline.
- Every color meaning has a label, symbol, or meter value.
- ASCII glyph fallback mode.
- Optional confirm-every-choice mode.
- Reduced motion disables title jitter, pulses, and incident flashes.
- Full log preserves caller and choice text for rereading.
- Exact effect mode replaces arrow buckets with signed numbers.
- Help explains faction thresholds, passive trace, evidence weight, and finale requirements using current-state examples.
- Copy should avoid tiny all-caps paragraphs; reserve caps for labels and short radio stamps.

## Technical architecture

Keep the rules engine pure and deterministic. The terminal controller maps keys to commands, owns overlays/pause/alternate-buffer lifecycle, and renders the returned state/events. Content uses serializable condition/effect data rather than embedded behavior closures.

```text
src/games/night-frequency/
├── index.ts             # controller, lifecycle, key mapping, pause/transitions
├── types.ts             # state, commands, content schemas, event types
├── seed.ts              # deterministic PRNG and independent stream helpers
├── content.ts           # campaign schedule, incidents, endings, shared copy
├── callers.ts           # caller arcs and dialogue nodes
├── tracks.ts            # fictional records, crates, probe definitions
├── audience.ts          # trust thresholds, perks, network calculation
├── deduction.ts         # evidence weights, candidate confidence, finale proof
├── schedule.ts          # caller eligibility, offer pairing, round/act progression
├── engine.ts            # command reducer and ordered resolution pipeline
├── validate.ts          # static content and campaign-route validation
├── render.ts            # ANSI layouts, panels, overlays, semantic glyphs
├── engine.test.ts       # command, thresholds, progression, ending transcripts
├── deduction.test.ts    # source independence, contradictions, proof/finale rules
├── schedule.test.ts     # offer constraints, deferral, callback and seed tests
├── content.test.ts      # IDs, graph, copy bounds, evidence-route validation
└── render.test.ts       # visible width, minimum layout, fallback and resize tests
```

Start flat as above. Split rendering helpers into a subfolder only if `render.ts` becomes hard to navigate.

### Core state

```ts
type Phase =
  | 'title'
  | 'tutorial'
  | 'actBrief'
  | 'switchboard'
  | 'onAir'
  | 'music'
  | 'workbench'
  | 'incident'
  | 'dossier'
  | 'finaleClaim'
  | 'finaleResponse'
  | 'finaleRisk'
  | 'report'
  | 'ending';

type FactionId = 'nightShift' | 'rooftops' | 'blockwatch' | 'deepDial';
type ClaimSlot = 'operator' | 'method' | 'origin' | 'objective';

interface FactionState {
  trust: number;
  perkActive: boolean;
  complicationActive: boolean;
  secondRingUsedThisAct?: boolean;
}

interface CallerState {
  id: CallerId;
  status: 'queued' | 'offered' | 'aired' | 'passed' | 'resolved' | 'disconnected';
  safety: 'unknown' | 'protected' | 'exposed' | 'detained';
  currentNode?: DialogueNodeId;
  callbackEligible: boolean;
  offerCount: number;
}

interface DossierState {
  evidence: EvidenceItem[];
  leads: LeadId[];
  pinned: Partial<Record<ClaimSlot, CandidateId>>;
  timelineFacts: Record<TimelineFactId, 'unknown' | 'plausible' | 'confirmed'>;
  selectedSlot: ClaimSlot;
  selectedEvidence?: EvidenceId;
}

interface GameState {
  version: 1;
  contentVersion: 1;
  seed: number;
  mode: 'tutorial' | 'campaign' | 'replay';
  phase: Phase;
  act: 0 | 1 | 2 | 3;
  round: number;
  clockLabel: string;
  signal: number;
  trace: number;
  credibility: number;
  factions: Record<FactionId, FactionState>;
  callers: Record<CallerId, CallerState>;
  currentOffer: [CallerId, CallerId] | null;
  currentCaller?: CallerId;
  currentChoices?: [ChoiceView, ChoiceView];
  currentTrackOffer: [TrackId, TrackId] | null;
  currentTrack?: TrackId;
  workUnitsRemaining: number;
  playlist: TrackId[];
  dossier: DossierState;
  flags: Record<string, boolean>;
  incidentFlags: Record<IncidentId, boolean>;
  countercastPreparation: number;
  decoyPrepared: boolean;
  actCheckpoint?: GameStateSnapshot;
  reports: RoundReport[];
  eventLog: GameEvent[];
  pendingConfirmation?: PendingConfirmation;
  selectedIndex: number;
  overlay: 'none' | 'help' | 'log' | 'dossier';
  outcome?: EndingId;
  notice: string;
}
```

All durable state is composed of primitives, arrays, and plain records. Candidate confidence, active perks, choice previews, display lines, and network strength can be recomputed, but storing threshold flags and incident history is necessary to prevent double resolution.

### Commands

```ts
type Command =
  | { type: 'startTutorial' }
  | { type: 'startCampaign'; seed?: number }
  | { type: 'dismissBrief' }
  | { type: 'selectChoice'; index: 0 | 1 }
  | { type: 'confirmChoice' }
  | { type: 'chooseCaller'; index: 0 | 1 }
  | { type: 'chooseResponse'; index: 0 | 1 }
  | { type: 'chooseTrack'; index: 0 | 1 }
  | { type: 'chooseWorkAction'; action: WorkActionId; target?: string }
  | { type: 'skipWork' }
  | { type: 'pinCandidate'; slot: ClaimSlot; candidateId: CandidateId }
  | { type: 'selectDossier'; direction: -1 | 1 }
  | { type: 'toggleOverlay'; overlay: 'help' | 'log' | 'dossier' }
  | { type: 'chooseFinaleClaim'; mode: 'full' | 'provenOnly' | 'uncertain' }
  | { type: 'chooseFinaleResponse'; response: FinaleResponseId }
  | { type: 'chooseFinaleRisk'; risk: FinaleRiskId }
  | { type: 'continue' }
  | { type: 'retryAct' }
  | { type: 'restartShow'; seed?: number };

interface CommandResult {
  state: GameState;
  events: GameEvent[];
  rejection?: { code: string; message: string };
}
```

`applyCommand(state, command)` returns a new state/result and never writes to the terminal, reads wall-clock time, calls `Math.random`, or starts a timer. `previewCommand` uses the same validation and effect-resolution helpers against a clone, so the displayed result cannot disagree with commitment.

### Declarative content grammar

```ts
type Condition =
  | { kind: 'flag'; id: string; value: boolean }
  | { kind: 'meterAtLeast'; meter: 'signal' | 'trace' | 'credibility'; value: number }
  | { kind: 'meterAtMost'; meter: 'signal' | 'trace' | 'credibility'; value: number }
  | { kind: 'factionAtLeast'; faction: FactionId; value: number }
  | { kind: 'hasLead'; leadId: LeadId }
  | { kind: 'hasEvidence'; evidenceId: EvidenceId; status?: EvidenceItem['status'] }
  | { kind: 'claimAtLeast'; slot: ClaimSlot; candidateId: CandidateId; level: ConfidenceLevel }
  | { kind: 'callerStatus'; callerId: CallerId; status: CallerState['status'] }
  | { kind: 'all' | 'any'; conditions: Condition[] }
  | { kind: 'not'; condition: Condition };

type Effect =
  | { kind: 'meter'; meter: 'signal' | 'trace' | 'credibility'; delta: number }
  | { kind: 'trust'; faction: FactionId; delta: number }
  | { kind: 'addEvidence'; evidenceId: EvidenceId }
  | { kind: 'setEvidenceStatus'; evidenceId: EvidenceId; status: EvidenceItem['status'] }
  | { kind: 'addLead'; leadId: LeadId }
  | { kind: 'setFlag'; id: string; value: boolean }
  | { kind: 'setCallerSafety'; callerId: CallerId; safety: CallerState['safety'] }
  | { kind: 'makeCallback'; callerId: CallerId }
  | { kind: 'queueIncident'; incidentId: IncidentId }
  | { kind: 'preparation'; delta: number };
```

Every effect must have corresponding public explanation copy. Avoid arbitrary script functions inside caller definitions; they make validation, save/replay, and causal reporting unreliable.

## Engine resolution order

For every committed caller, response, track, work, or incident choice:

1. Validate phase, selection, prerequisites, costs, and pending confirmation.
2. Clone state and capture a `before` summary for the report.
3. Resolve the selected content effects in declared order.
4. Resolve explicit consequences of the rejected option, if that offer declares any.
5. Clamp signal, trace, credibility, and trust to `0…100`.
6. Add/upgrade/compromise evidence and rebuild candidate confidence.
7. Recalculate faction perk/complication transitions and log crossings.
8. Resolve caller node/safety transitions.
9. If this closes the workbench, apply track masking and passive trace exactly once.
10. Apply scheduled incidents, then crossed trace thresholds in ascending order.
11. Check decoy interception, signal `0`, trace `100`, act completion, and finale conditions in that priority.
12. Generate the next deterministic offer or phase.
13. Store a structured event/report with causes and return the new state.

Priority matters. A workbench repair can prevent signal failure before end-of-round decay. A prepared decoy intercepts a raid before the raid ending. If one command crosses both signal `0` and trace `100`, the report uses the explicit content event first, then raid, then off-air as the documented tie order.

Illegal commands return a rejection without mutation, time advance, passive trace, or seed consumption.

## Determinism, replay, and debugging

- Use a small repository-local seeded PRNG in `seed.ts`; never call `Math.random` in engine/content selection.
- Derive independent streams such as `offer`, `track`, and `flavour` from the master seed so adding a greeting variant does not reorder callers.
- Record commands, content version, and seed. A replay is the initial state plus command transcript, not a recording of ANSI frames.
- Retrying an act restores its checkpoint and PRNG stream positions.
- Structured events include `choiceId`, applied effects, modifiers, evidence changes, threshold crossings, and ending checks.
- A developer debug view may show IDs, seed streams, claim weights, and eligible-offer ranks; it is excluded from normal play.

The same seed and command transcript must produce byte-equivalent serializable state and events.

## Content validation

`validateCampaign()` should run in tests and fail with actionable IDs. It must check:

1. All caller, node, choice, track, candidate, evidence, lead, incident, and ending IDs are unique and referenced IDs exist.
2. Every non-terminal dialogue node has exactly two valid choices; every branch terminates within three response nodes and contains no cycle.
3. Choice labels and critical summaries fit declared visible-width budgets after ANSI stripping.
4. Every effect has public explanation copy, uses a valid range, and cannot spend unavailable work/resources.
5. Every correct candidate has at least three acquisition routes, two independent source groups, one reliability `2+` item, and a scripted path to `PROVEN`.
6. No single offer pair contains the only two routes to the same required claim.
7. Every false candidate has a reachable contradiction and every plant has an observable tell or verification failure.
8. Low-signal substitutions and low-trust faction complications still leave a recovery route to finish at least one non-failure ending.
9. Track pairs are not strictly dominated and always offer at least one usable action at the current phase.
10. Trace/signal scheduled incidents cannot create an unavoidable failure immediately after an unpreviewed transition.
11. Finale route requirements reference obtainable state and each intended ending has at least one golden transcript.
12. All fictional song and caller copy is original and contains no real emergency access procedure.

Use authored golden transcripts for the best expose, successful jam, successful neighborhood mobilization, deliberate go-dark, raid/decoy recovery, and panic ending. A bounded abstract search over round-level decisions can supplement these transcripts to detect dead offer schedules, but it should not replace human review of narrative coherence.

## Test plan

### Core engine

- Commands mutate only in legal phases; rejected commands are exact no-ops.
- Each completed round applies passive trace once and only once.
- Meter clamps, signal states, act checkpoints, retry, and finale progression.
- Trace thresholds fire once in ascending order and the decoy intercepts only `100`.
- Relocation, power, repair, masking, and faction modifiers match previews.
- Same seed/transcript yields identical state/events.

### Audience

- Trust crossing `65` grants a perk after the choice and falling below removes it after current resolution.
- Complications activate/deactivate at `20` with correct offer/action effects.
- Second Ring returns only eligible passed callers and only once per act.
- Safe Roof and Bench Test modify the actual action and preview equally.
- Network strength and finale contribution use visible values.

### Callers and schedule

- Prerequisites, reach gates, held decisive callers, mandatory incidents, callback slots, and filler fallback.
- Pair diversity constraint and seeded tie stability.
- Passing urgent versus routine callers.
- Caller safety transitions are deterministic and risk-labelled.
- Dialogue graphs terminate and disabled evidence questions explain why.

### Songs and workbench

- Cooldown, three-tag fatigue, masking, probe prerequisites, and playlist log.
- Work cost, unused work discard, skip behavior, and Deep Dial discount.
- All generated pairs have a meaningful non-dominated trade-off.
- End-round trace preview equals committed trace.

### Deduction and finale

- Same-source evidence contributes only the strongest item in that group, preventing repeated copies of one rumor from inflating confidence.
- Compromised evidence contributes zero.
- `PLAUSIBLE`, `SUPPORTED`, `PROVEN`, and `CONTESTED` boundaries and rival margin.
- Pinning/revising is free and does not alter confidence.
- Each finale route accepts and rejects boundary values exactly.
- `provenOnly` never airs unsupported pinned details.

### Rendering and lifecycle

- ANSI-stripped lines fit `80` columns and important panels fit `28` rows.
- Exact/concise modes, light theme, ASCII fallback, reduced motion, and resize screen.
- Start, each phase, help/log/dossier overlays, incident, pause, report, and every ending.
- `stop()` clears render interval/listener, restores cursor, and exits the alternate buffer once.
- Restart, quit, games menu, and next-game transitions leave no stale key listener.

Required verification:

```text
npm run typecheck
npm test
npm run build
```

## Balance targets and instrumentation

Target first-play behavior:

- 18 caller offers, 9 aired calls, and 9 passed calls in the main campaign.
- 12–18 response decisions, 9 track decisions, and 9 workbench decisions.
- A successful expose obtains 9–13 evidence items from 7+ source groups.
- At least four callers can be passed while retaining a full-proof route.
- Typical final signal `30–75`; typical final trace `60–90`; reaching `100` should follow at least two ignored warnings.
- Two factions commonly reach perk level; all four should require deliberate broad programming and have an opportunity cost.
- One early reckless choice is recoverable. Repeated unsupported sensationalism should close the best expose before it causes an instant game over.
- Average call scene is 45–90 seconds; no non-finale dialogue chain exceeds three player decisions.

Development-only run metrics:

- choice selection rate by node;
- callers offered/aired/passed/returned;
- meter and trust values after each round;
- threshold crossing rounds and recovery action usage;
- tracks chosen, work units wasted, actions used, and format fatigue;
- evidence obtained/verified/compromised by source group;
- claim confidence per round, final pins, route, ending, and retry count.

Instrumentation stays local and opt-in. Its purpose is balance, not online telemetry.

## Implementation milestones

### 0 — Rules and content contract

Finalize meters, thresholds, factions, work actions, four claim matrices, source groups, Act I caller graph, six tracks, one incident, and the Help copy. Create paper transcripts for one careful and one reckless three-round run.

**Done when:** another developer can resolve every Act I choice and candidate confidence by hand from this document/data.

### 1 — Pure three-round engine

Implement `types`, `seed`, `audience`, `deduction`, `schedule`, and `engine` for the tutorial and Act I. Add choice preview, deterministic offers, caller dialogue, track/work flow, trace `35`, and structured reports.

**Done when:** tests replay a complete tutorial and two distinct Act I transcripts with exact final state.

### 2 — Terminal vertical slice

Implement `index.ts` and the compact renderer for title, act brief, switchboard, response, music, workbench, dossier, incident, pause, and act report. Add exact-effects mode, resize handling, and alternate-buffer cleanup.

**Done when:** a new player can complete the tutorial and Act I at `80×28` without external instructions.

### 3 — Full systems

Add all faction perks/complications, callbacks, caller safety, evidence verification/compromise, power/relocation/decoy actions, trace thresholds, track fatigue/probes, act checkpoints, and all finale calculations.

**Done when:** synthetic state tests cover every threshold and every finale route boundary.

### 4 — Complete campaign content

Write Acts II–III, all main/optional callers, twelve or more records, planted calls, scheduled incidents, four candidate matrices, evidence copy, source chains, finale text, and six ending families. Add content validation and golden transcripts.

**Done when:** best-expose, jam, mobilize, go-dark, and failure transcripts all reach their intended reports without hand-mutating state.

### 5 — Visual language, onboarding, and balance

Add the semantic glyph vocabulary, title/carrier effects, light-theme and ASCII passes, reduced motion, complete Help, causal report, local metrics, and balance adjustments from playtests.

**Done when:** every important state is understandable without color, every loss names a cause, and no choice pair has an obvious dominant option across repeated runs.

### 6 — Integration and release hardening

Register/export the game, run all verification commands, manually test controller cleanup and all shared pause actions, review copy originality/safety, and run the production readiness checklist.

**Done when:** typecheck, all tests, and build pass; the game is readable at minimum size; and every exit restores the terminal correctly.

## Scope estimate

Expected Version-1 scope:

- 12–15 TypeScript modules/tests;
- roughly 2,500–3,500 lines of engine, schedule, controller, and renderer code;
- roughly 1,500–2,500 lines of declarative caller, evidence, track, incident, and ending content;
- 45–70 focused unit/content/transcript tests;
- 18–24 substantial callers plus 8 optional flavor callers;
- 12–16 fictional tracks;
- 8–12 development days for one experienced contributor after the rules/content contract, with writing and balance likely the largest variable.

If scope must shrink, keep the full engine and cut optional callers, cosmetic variants, and ending prose first. Do not cut evidence independence, consequence previews, source safety labels, deterministic tests, or the song/work connection.

## Gamr integration

- Export `runNightFrequencyGame(terminal)` returning `{ stop, isRunning }`.
- Use `getCurrentThemeColor`, `dispatchGameQuit`, `dispatchGameSwitch`, `dispatchGamesMenu`, `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu`.
- Use alternate buffer and hidden cursor only while the controller is running; restore both exactly once on all exits.
- Register the game in `src/games/index.ts` as:

  ```ts
  {
    id: 'night-frequency',
    name: 'Night Frequency',
    description: 'Take the calls. Build the case. Stay on the air.',
    maturity: 'workshop',
    pace: 'turn-based',
    difficulty: 2,
    session: 'campaign',
    run: runNightFrequencyGame,
  }
  ```

- Render at 20 FPS only for small visual accents; do not run a separate simulation interval.
- Use shared effects sparingly for a switchboard pulse, proof stamp, jammer tear, and ending flash. Effects may not obscure choices, evidence, or meters.
- Use the shared pause menu exactly. `Esc` closes a local overlay first; otherwise it opens pause.

## Risks and decisions to protect

### Risk: too many meters obscure the fast choices

Keep only signal, trace, and credibility as global meters. Factions use one trust value each; listener count, mood, and popularity are deliberately omitted. Show only affected faction rows on a choice card.

### Risk: narrative choices feel like spreadsheet optimization

Write contextual response labels and show short caller reactions before numbers settle. Let some choices exchange immediate advantage for a callback, protection, or better proof instead of only moving meters.

### Risk: there is one obvious “correct” faction strategy

Give every faction a distinct finale contribution and at least two evidence routes outside it. Pair offers across factions, make broad trust useful, and ensure specialized jam/mobilize paths remain viable.

### Risk: mystery becomes guesswork

Keep evidence text specific, source groups visible, false candidates contradicted, and proof rules stable. Never make the correct candidate depend on the seed.

### Risk: optimal play means selecting every clue caller

Make caller safety, credibility, and faction support necessary for strong endings. Validate that all four claims can be proven while passing several conspiracy calls, and include strong non-clue calls that matter to the network.

### Risk: songs are decorative stat cards

Protect the work-unit and masking link. At least three story clues should be obtainable through probe tracks, and track duration must materially change available off-air actions.

### Risk: conspiracy scope produces too much prose

Limit calls to two response nodes on average, keep one four-slot dossier, reuse visible source-chain language, and move optional context into the log. Do not add lore encyclopedias or long cutscenes.

## Explicit Version-1 non-goals

- Real audio playback, voice acting, microphone input, speech recognition, or rhythm mechanics.
- Real-time response timers, twitch tuning, manual frequency-spectrum simulation, or radio-technical realism.
- Procedurally generated mysteries, language-model-generated callers, or a seed-dependent culprit.
- Licensed songs, quoted lyrics, real radio stations, real emergency codes, or actionable interference instructions.
- Open-world city movement, combat, inventory crafting, staff-management simulation, or station construction.
- Online multiplayer, live audience voting, leaderboards, cloud saves, or streaming integration.
- A branching campaign longer than one night before the core show proves replayable.
- Hidden personality axes, random betrayal rolls, or endings based on undisclosed thresholds.

## Definition of done

Night Frequency is ready when a new player can select a caller, understand the immediate trade-off in their response, choose a record for both audience identity and off-air work, use two independent sources to prove a dossier claim, and explain why their final broadcast succeeded or failed. The full night must remain solvable through more than one caller/evidence route; signal and trace must create visible risk without deleting critical information; each audience faction must change both strategy and finale capability; every plant and harmful consequence must have an observable cause; all layouts must remain readable at `80×28` in dark, light, reduced-motion, and ASCII modes; lifecycle cleanup must be exact; and `npm run typecheck`, `npm test`, and `npm run build` must pass before the registry entry ships.
