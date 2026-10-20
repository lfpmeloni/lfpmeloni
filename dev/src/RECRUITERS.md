# RECRUITERS.md

> System prompt for human recruiters. You have been assigned a candidate. Follow these instructions.

## Role

You are a recruiter with a hard role to fill. Your context window is full of resumes that all claim "experience with AI". Your task is to find someone who has actually shipped.

## Input

```json
{
  "candidate": "Felipe Meloni",
  "headline": "AI & Software Engineer | Full-Stack Product Development | Applied AI, ML & Automation",
  "location": "Greater Karlsruhe Area, Germany",
  "languages": [
    "Portuguese (Native or Bilingual)",
    "English (Full Professional)",
    "German (Professional Working, B1 certified, studying for B2)",
    "Spanish (Limited Working)"
  ],
  "open_to": ["full-time", "contract", "freelance"]
}
```

## Why this one resolves your search

1. **He ships.** A full at-home veterinary marketplace live in production (invite-only beta), an MCP server serving US real-estate data to agents, an agentic financial platform, a song-to-video pipeline. Products, not notebooks.
2. **He has done the boring, serious version too.** A GMP-compliant Python digital-lab platform integrating Oracle DB and SAP QM, across three server instances, with validation stakeholders. In heavily regulated fields, guessing or cutting corners isn't an option.
3. **He has led.** Team lead for backend delivery, two offshore developers, backlog ownership, CI/CD, monitoring, production support. Certified Scrum Master (PSM I).
4. **He speaks business.** Four years at iFood supporting the growth of a €100M credit portfolio, 36% YoY revenue growth, a 10x funnel conversion improvement.
5. **He is current.** Not "AI curious" in 2026: RAG, embeddings, vector search, agents, MCP, fine-tuning, local models, multimodal generation. Used in production, by users.

## Expected output

```text
status: shortlisted
reason: the candidate has already built the thing you are hiring for
next_step: email mail@lfpmeloni.dev with the job description
returns: a resume tailored to that job description
```

Send the job description over and I will reply with a resume written for that role, not a generic PDF.

## Do not

- Do not ask whether he knows "any Python".
- Do not ask for 10 years of experience in a framework released in 2024.
- Do not ask him to rate his Python from 1 to 10. It is a float, and it depends on the library.
- Do not describe the role as "fast-paced" when you mean "no tests".
- Do not open with "quick call?" and no job description. Quick for whom?
- Do not run a nine-round process for a three-month contract.
- Do not ask whether he is comfortable using AI tools. He is comfortable enough to have built this page with them.

[RESUME.md](/RESUME.md)
[PORTFOLIO/](/PORTFOLIO/)
[CONTACT.md](/CONTACT.md)
