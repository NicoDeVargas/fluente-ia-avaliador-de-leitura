# Fluente

A child reads a short passage aloud for one minute; Fluente returns words correct per minute and marks every word the way a trained listener would, with no LLM in the scoring.

**Live:** https://fluente-black.vercel.app (Portuguese: [`?lang=pt`](https://fluente-black.vercel.app/?lang=pt); human-agreement study: [`/estudo`](https://fluente-black.vercel.app/estudo))

## The problem

A second-grade teacher in Brazil has a class of 30, a printed passage and a stopwatch. One child at a time sits next to her and reads aloud. She follows along on her own copy, ticking every word the child gets wrong, stops at sixty seconds, counts, writes the number down, and calls the next child. The rest of the class has to be kept busy while she does it. By the end it has taken most of an afternoon, and the numbers depend on how closely she could listen while also watching the clock.

That number is the metric Brazil's national child-literacy commitment (Compromisso Nacional Criança Alfabetizada) uses for oral reading fluency: **words correct per minute (WCPM)**. Because counting by hand is slow and easy to get wrong, it is measured only a few times a year, which is too rarely to catch a child who is falling behind while there is still time to help.

Fluente does the listening and the counting. The teacher still decides what the number means.

## What it does

1. **Pick a passage.** Six original passages written for the app (Portuguese grades 1 to 4, English grades 2 and 4), no third-party rights. Enter the reader's nickname and grade. No login.
2. **Read.** The passage appears in large type. Tap "Start reading"; the browser records with `MediaRecorder` (webm/opus, or mp4 on Safari) with a visible 60 s countdown and a "Done" button. Recording continues up to 70 s so a child who starts late still gets a full minute; recordings under 5 s are rejected.
3. **Result, in a few seconds:**
   - WCPM in large type, plus words correct, errors, words read and seconds timed.
   - The reader's WCPM on a scale next to a grade reference (Hasbrouck & Tindal 2017, 50th percentile, end of year), labelled as an approximation, not a Brazilian norm.
   - The passage marked word by word: correct, substituted (with what the child actually said shown above the word), skipped, self-corrected, long hesitation (pause over 3 s), plus inline chips for repetitions and insertions, and a "stopped here" flag.
   - **Tap any word to hear that exact moment** of the recording, or play the whole reading. The audio lives only in the browser tab that recorded it.
4. **Manual count (optional).** Whoever listened can type the number of words correct they counted. Those pairs feed the public `/estudo` page.

## Why no LLM grades the child

A score that goes into a child's school record must be reproducible and explainable word by word. Fluente's scorer (`lib/alinhar.ts`) is a pure function: same transcript in, same marks out.

It normalizes both sides (case, accents, punctuation), drops filler hesitations ("hã", "hum", "um", "uh"...), and runs a dynamic-programming minimum-edit alignment between what was heard and the passage, **with a free end** (stopping early costs nothing; unread words are "not read", not errors). The cost model and a small state machine encode the conventions a human rater uses:

- The clock starts at the **first word of the passage**, not at the start of the recording; reading the title aloud or saying "I'm going to start" is not timed.
- Only a **60 s window** from that first word counts.
- **Self-corrections count as correct**, including several attempts before the right word.
- **Repetitions are not errors**, whether one word or a whole phrase.
- **Dialect and ASR variants count as correct:** "pra/pro" for "para", "tá" for "está", "pro" for "para o", numerals for number words, alternative spellings of character names, a word split in two or two words merged by the recognizer.
- **Skipping a whole line** marks those words as skipped instead of turning every following word into a substitution; but one or two coincidental matches ahead do **not** make the reading jump forward.
- **Closing chatter** after the last word ("pronto", "acabei", "tia", "done", "teacher"...), or speech after a pause that is long relative to the child's own pace, is conversation, not reading: it is neither timed nor counted as substitutions.
- b/d/p/q confusions are treated as attempts at the same word.

Each of these is a unit test. `npx vitest run` passes **72 tests**, 63 of them in the alignment suite (`tests/alinhar.test.ts`), including a performance check on a long passage.

## The key design decision: don't tell the recognizer what the child should say

Speech recognizers are very good at hearing what they expect. If the passage were passed as `keyterms_prompt` or `prompt`, the model would lean toward the correct words and quietly "fix" exactly the mistakes a fluency assessment exists to catch. Fluente sends the audio with **no text context at all**, then does the comparison itself.

AssemblyAI usage (`lib/transcrever.ts`):

- Pre-recorded API: `POST /v2/upload`, `POST /v2/transcript`, then polling.
- `speech_models: ["universal-3-5-pro"]`, `language_code` `pt` or `en`, `disfluencies: true` (keeps "um", "hã" and false starts, which the aligner needs to see and then discard).
- Word-level `start`/`end` timestamps drive the 60 s window, hesitation marks, the pace-relative chatter detection and tap-to-listen.
- The audio is never stored. The server keeps the transcript words with timings and the scoring result (Supabase Postgres); `/estudo` excludes readers nicknamed "teste"; 30 readings per hour per hashed IP.

## Measured

### Synthetic benchmark (`npm run benchmark`, results in `bench/resultados.json`)

Each of the six passages (first ~70 words) is read by a TTS voice in five scripted scenarios with a known answer key: clean read; two substitutions (one real foreign word, one made-up non-word); a skipped phrase; a repetition plus a self-correction; a hesitation, a substitution and an early stop. The audio goes through the same AssemblyAI call and aligner as the app.

| Metric (n = 30 readings) | Result |
| --- | --- |
| Mean \|app − answer key\| in words correct | 0.27 |
| Exact match | 23 / 30 |
| Within ±1 word | 96.7% |
| Within ±3 words | 100% |
| Error precision (flagged errors that were real) | 97.4% (37 of 38) |
| Error recall (real errors that were flagged) | 88.1% (37 of 42) |

Caveat: these are **adult synthetic voices** (Windows System.Speech, Maria pt-BR and Zira en-US), not children. The benchmark measures the pipeline, not real child reading.

### The limitation we measured and chose not to hide

The benchmark isolates what the recognizer does to reading errors. Real-word substitutions mostly survive (8 of 12 transcribed literally), repetitions always survive (6 of 6). But **made-up misreadings get normalized into the real word**: in 5 of 6 cases (e.g. "coma" read for "cima", "goardava" for "guardava") the transcript came back with the correct word, so the app scored it correct. Those 5 account for every error the benchmark missed.

We tested whether AssemblyAI's per-word confidence could flag these for the teacher to check. It cannot: 3 of the 5 normalized non-words had confidence at or above 0.98, inside the range of correctly read words, and the best threshold found reached only about 10% precision. A "check this word" flag at that precision would train teachers to ignore it, so we did not ship one.

### Human agreement

`/estudo` compares the app's words-correct count with the count typed in by the person who listened: mean |app − human|, share within ±3 words, Pearson correlation, number of readings and readers, plus every pair in a table. It is computed live from the database and is being collected with volunteers; the numbers live there, not here.

## Limits

- Not yet validated on a large set of real child recordings; the synthetic benchmark uses adult TTS voices.
- Non-word misreadings are often normalized by the recognizer into the correct word, so WCPM can be slightly high for readers who guess made-up words.
- Six passages; Portuguese and English only.
- One reading at a time: no classes, no teacher accounts, no history per child across days.
- The grade reference is a US norm used as an approximation.
- Tap-to-listen works only on the device that recorded, because audio is never uploaded for storage.

## How it was built

Fluente was built with Claude Code over a short hackathon window, starting from a written design spec and an implementation plan (`docs/superpowers/`), executed task by task with a code review after each task. The alignment got the most attention: it went through five review rounds in which it was probed with transcripts of how children actually read (title read aloud, false starts, skipped lines, chatter at the end, pace changes) and checked against what a human rater would count; every disagreement that was fixed became a unit test. The benchmark was then added to measure the full pipeline end to end, including the recognizer behaviour described above.

## Run locally

Requirements: Node 22.15+, a Postgres database (the app uses Supabase), an AssemblyAI API key.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run migrar                # creates the leituras table from db/schema.sql
npm run dev                   # http://localhost:3000
npm test                      # vitest
npm run benchmark             # synthesizes audio, transcribes, scores; writes bench/resultados.json
```

`.env.local`:

| Variable | Purpose |
| --- | --- |
| `ASSEMBLYAI_API_KEY` | Transcription |
| `DATABASE_URL` | Postgres connection string |
| `IP_SALT` | Salt for hashing client IPs (rate limit) |

The benchmark synthesizes speech with Windows System.Speech through PowerShell, so it runs on Windows; generated audio and cached transcripts go to `bench/audio/` (not committed). Pass `--novo` to regenerate everything.

Stack: Next.js 16 (App Router), React 19, Tailwind 4, Zod, `postgres`, Vitest; deployed on Vercel.

## License

MIT, see [LICENSE](LICENSE).
