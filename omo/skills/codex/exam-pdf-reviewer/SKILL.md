---
name: exam-pdf-reviewer
description: OCR and reconstruct image-based exam PDFs, board exam reviewers, scanned questionnaires, and answer-marked PDFs into compact verified Markdown. Use when a user wants questions extracted from a PDF/image PDF, circled or marked answers detected, missing answers researched, wrong answers corrected, and a clean review file containing only each question and its verified answer.
---

# Exam PDF Reviewer

## Goal

Create a short searchable Markdown reviewer from an image/scanned exam PDF.

Default output:

```markdown
### 1. Question text...

**Verified answer: (D) answer text**
```

Do not include choices, raw OCR dumps, answer-key tables, or verification-source sections unless the user asks for them. Keep tables, formulas, or figures only when the question cannot be understood without them.

## Workflow

1. Locate the source PDF and create final output under `output/pdf/` using a stable name like `<pdf-stem>_reconstructed.md`.
2. Run high-accuracy OCR:
   - Prefer Datalab/Surya OCR when an API key is available through `DATALAB_API_KEY` or the user provides one.
   - If `DATALAB_API_KEY` is unset, source `$HOME/.config/datalab/env` when that file exists, then check again without printing the key.
   - Use accurate/layout-preserving mode when available.
   - Fall back to local tools (`pdftoppm`, `ocrmypdf`, Tesseract, `pdfplumber`) only when API OCR is unavailable.
3. Render pages to images and visually inspect answer markings. Do not trust OCR checkbox/circle detection by itself.
4. Reconstruct the exam into Markdown:
   - Use numbered question headings.
   - Normalize broken line wraps, spacing, hyphenation, formulas, and table layout.
   - Remove answer choices from final compact output.
   - Preserve multi-row tables or given data needed to solve numeric questions.
5. Determine the answer for every question:
   - Use circled/marked answer as the first candidate.
   - If no answer is marked, search the web.
   - If a circled answer looks wrong, verify and correct it.
   - For calculations, recompute from the given data instead of trusting the circled answer.
6. Verify answers:
   - Use official or primary sources where practical.
   - For formulas and definitions, prefer textbooks, agency pages, standards bodies, or reputable educational references.
   - For numeric problems, show a concise calculation note only when it helps prevent ambiguity.
7. Clean final Markdown:
   - Keep only question, verified answer, essential given data, and brief calculation/correction notes.
   - Remove choices, verification-source lists, raw OCR artifacts, and OCR provenance clutter unless requested.
   - If the verified answer differs from the circled answer, include `_Original circled: (X) text._` only when the user wants auditability; otherwise omit it and keep the verified answer.
8. Validate before finishing:
   - Count questions and verified answers; they must match.
   - Search for leftover `Choices`, `Answer:`, checkbox artifacts, raw source URLs, and OCR garbage.
   - Spot-check early, middle, and late pages against rendered images.
   - Report output path, question count, and any answers that remain uncertain.

## Datalab/Surya Notes

Never hardcode API keys into the skill or output file. Use `DATALAB_API_KEY`, source `$HOME/.config/datalab/env` if present, or use the key supplied in the current task only for that run.

Use curl if Python HTTP clients hit authentication or bot-protection issues. Poll conversion jobs until complete, then save raw OCR only as temporary working material. Delete temporary OCR JSON/Markdown unless the user asks to keep it.

## Answer Verification Rules

- Browse when the user asks for verification or when answer correctness is uncertain.
- Correct wrong circled answers in the final reviewer; do not preserve wrong answers as the answer line.
- Prefer recalculation for math, engineering economy, statistics, operations research, accounting, work measurement, and similar problem types.
- For ambiguous wording with multiple historically valid answers, choose the best listed exam option and add a short note.
- If no confident answer can be verified, mark it `**Verified answer: Unconfirmed - ...**` and explain the blocker briefly.

## Final Response

Keep the final response short:

- Link to the Markdown file.
- State question/answer count.
- State that choices and verification sources were removed if that was requested.
- Mention unresolved items only if any remain.
