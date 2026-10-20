# ai-video-pipeline.md

> song2video: a private studio that turns an MP3 song, a narration track or a written script into a finished, subtitled 16:9 video, built for a client. The same engine now makes realtor-led property tours.

- Status: deployed for the client, property-tour workflow in pilot
- Period: October 2026 - Present
- Role: freelance engineer, sole developer
- Links: private repo and private deployment (client work)

## Problem

A music or story video normally takes a director, an editor and stock footage. The client wanted a studio where they upload a song or a script and get back a watchable video: scenes that follow the lyrics, a singer who actually lip-syncs[^1], subtitles that line up with the words. Later they asked for property tours: a realtor sends listing photos and gets a branded video with an AI presenter.

The hard constraint was money. Every generation step calls paid models. A bug that resubmits a job, or a plan that drifts, costs real dollars on someone else's bill.

## Solution

Three studio modes, plus a property workflow:

- **Narration MP3 + portrait:** transcribe, plan scenes, generate shots.
- **Music MP3 + singer image:** separate the vocals, align the lyrics, generate lip-synced performance shots.
- **Script:** write a screenplay, synthesize speech with word timings, then shots.
- **Property tours:** a public submission form (also exposed as a remote MCP server[^2], so a realtor can submit from a chat assistant), an admin approval queue and a review studio.

Output is an H.264[^3] MP4 of up to five minutes, an SRT file[^4] and the logo overlay.

## Architecture

A Next.js app on Vercel handles the UI, the passphrase gate and uploads straight to private Blob storage[^5]. A durable Vercel Workflow[^6] orchestrates each job. Media and small JSON state documents both live in Blob, and every state write is conditional on its ETag[^7]. There's no SQL database. FFmpeg[^8] runs inside short-lived Vercel Sandbox VMs[^9]. An LLM with structured outputs[^10] plans the screenplay. The generative work goes through the fal.ai queue[^11]: Whisper[^12], TTS with forced alignment[^13], Demucs[^14], image models, video models, lip-sync and a talking presenter.

```text
 Upload ─► private Blob
               │
               ▼
 Workflow (durable, one generation slot)
   ├─► LLM planner (structured output) ─► screenplay
   │                                          │
   │◄─────────────── admin approves ──────────┘
   ├─► fal.ai queue (parallel submit + poll)
   │      ASR · TTS/alignment · stem split ·
   │      image · video · lip-sync · presenter
   ├─► Vercel Sandbox: FFmpeg render + subtitles
   ▼
 Blob ─► signed download link

 State: JSON docs in Blob, compare-and-swap on ETag (no database)
 Intake for tours: web form or remote MCP tools
```

## Engineering decisions

- **Minimal infrastructure, replaceable providers.** Blob doubles as the state store with optimistic concurrency[^15]. The price is a high count of storage operations. That's measured, and a small database stays a fallback if the numbers justify it.
- **A human approves before money is spent.** A screenplay must be approved before any paid generation. Property tours first run a single-segment presenter pilot, and the final video only reaches the realtor after an explicit release.
- **Never pay twice by guessing.** If the response to a paid submission is lost, the job stays in `submitting` until an admin pastes in the provider's request ID. The app deliberately does not retry and charge again.
- **The server owns timing, not the model.** Scenes get fixed slots computed by the server. A language model plans what happens in a scene, never how long it lasts.
- **The AI never touches the property photos.** Tours animate the real photos with fixed pan/zoom moves, and only the presenter inset is generated. A model can't invent a pool the house doesn't have.
- **Untrusted input handled like it is.** URL imports resolve DNS, reject private ranges and pin the checked address against SSRF[^16]. Images are actually decoded to validate them. Tracking links keep their secret in the URL fragment[^17], so it never shows up in request logs or referrers. Upload size and draft creation are rate-limited.

### What broke and how I fixed it

- **Compare-and-swap read stale state.** Next.js fetch deduplication[^18] plus Blob caching meant a read could return the version from before the last write, so conditional writes kept conflicting. I gave every state read a fresh abort signal to opt out of dedup, added retries with exponential backoff and jitter[^19], and logged every conflict. While at it I built a diagnostics panel into the app.
- **ETags came back weak.** Transport compression returned `W/`-prefixed ETags[^20] that the conditional write rejected. I request identity encoding and normalize the prefix.
- **Lip-sync asked for frames the audio didn't have.** The frame count could exceed the audio slice. I replaced it with an explicit frame formula and a padded audio buffer, and moved to fewer, longer scenes with boundaries fixed by the server.
- **Characters drifted, at one point turning an animal into a person.** Generating a replacement portrait per shot let identity wander. I now use the uploaded image directly as the first frame, the prompt treats it as the authority on identity, and a subtitle-quality check catches stretched or overlapping word timings before anything is paid for.
- **Render tasks stuck in "pending" forever.** Sandbox jobs could hang without failing. I added bounded deadlines for startup, processing and polling, and separate artifact namespaces per attempt, so a late result from an old attempt can't overwrite a newer one.
- **Narration ran past its scene.** The prompt said "keep it short" and the model ignored it. The 30-word / 220-character limit now lives in the output schema. A model can't ignore a schema.

## Outcome

- **Works:** all three studio modes, end to end, in the client's deployment. Property intake via form and MCP, the approval queue, the presenter pilot.
- **Delivered:** about 15 commits over two weeks, about 130 tests (TypeScript plus Python media scripts), a separate dev fork used for experiments such as text-to-song.
- **Still rough:** a narration voice matched to the realtor, placing the presenter inside the scene instead of a picture-in-picture inset, smoother camera moves, and fewer storage operations per job. The property tour app is being split out to run on its own.

## Evidence

- Repository and deployment: private client work, not linked. I can demo it and walk through the code in an interview.
- Architecture: diagram above.

## Stack

`TypeScript` `Next.js` `Vercel Workflow` `Vercel Blob` `Vercel Sandbox` `FFmpeg` `fal.ai` `OpenAI` `MCP` `Python`

## Glossary for nerds

[^1] Lip-sync model: Generates video where a face's mouth movements match a given audio track. Here: the uploaded singer image performs the song.
[^2] Remote MCP server: An MCP (Model Context Protocol) server reached over HTTPS instead of running locally. Here: a realtor can submit a property tour from inside a chat assistant.
[^3] H.264: The most widely supported video codec. Here: the result plays on any phone, browser or social platform.
[^4] SRT: A plain-text subtitle format of numbered, timed lines. Here: subtitles also ship as a separate file for platforms that render their own.
[^5] Vercel Blob: Vercel's file storage, similar to Amazon S3. Here: it holds uploads, renders and the job state, which replaced a database.
[^6] Durable workflow: A long-running job whose steps are saved, so it resumes after a crash or timeout instead of starting over. Here: one video job runs for many minutes across many paid API calls.
[^7] ETag: A version tag the server returns for a file; a write can say "only if the ETag is still X". Here: two processes can't overwrite each other's job state.
[^8] FFmpeg: The standard command-line tool for cutting, encoding and combining audio and video. Here: it assembles the final video with subtitles and the logo.
[^9] Vercel Sandbox: Short-lived, isolated virtual machines for running arbitrary code. Here: FFmpeg needs a real machine and CPU time, which a serverless function doesn't give.
[^10] Structured outputs: Forcing an LLM to answer in JSON that matches a given schema. Here: limits like narration length live in the schema, which the model can't ignore.
[^11] fal.ai: A platform that runs many generative AI models behind one API and job queue. Here: one integration covers speech, music separation, image, video and lip-sync models.
[^12] Whisper / ASR (Automatic Speech Recognition): OpenAI's speech-to-text model. Here: it turns the uploaded song or narration into timed words.
[^13] Forced alignment: Matching a known text to audio to get the exact time of each word. Here: subtitles and scene cuts land on the spoken words.
[^14] Demucs: A model that splits a song into stems such as vocals, drums and bass. Here: lyric alignment and lip-sync need the vocals without the music.
[^15] Compare-and-swap / optimistic concurrency: Read a value, then write only if nobody changed it in between; on a conflict, re-read and retry. Here: it gives database-like safety to plain JSON files.
[^16] SSRF (Server-Side Request Forgery): Tricking a server into fetching internal addresses for the attacker. Here: URL imports could otherwise reach private cloud endpoints.
[^17] URL fragment: The part of a URL after `#`, which browsers never send to the server. Here: secrets in tracking links stay out of server logs and referrer headers.
[^18] Fetch deduplication: Next.js reuses the result of identical fetch calls. Here: it served job state from before the latest write.
[^19] Exponential backoff with jitter: Retrying after waits that double each time, plus a random offset. Here: conflicting writers don't retry in lockstep and collide again.
[^20] Weak ETag (`W/`): An ETag that means "equivalent content", not byte-identical, often added when a response is compressed. Here: the conditional write rejected it until compression was turned off for state reads.
