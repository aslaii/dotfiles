# Troubleshooting & Investigation Protocol

When investigating issues using AI agents (e.g., opencode), adhere to the following protocol to utilize the available system credentials and tools:

1.  **Google Workspace (Gmail & Drive):**
    *   Use `keys.google.json` to authenticate.
    *   If the file is missing, inform the user immediately only if it is deemed needed for the investigation.
    *   Use `googleapis` (Gmail API, Drive API) to inspect email contents, folder structures, and file metadata directly.

2.  **Clio Integration:**
    *   Use `keys.clio.json` to authenticate with Clio API.
    *   If the file is missing, inform the user immediately only if it is deemed needed for the investigation.
    *   Verify matter details, folder mappings, and contact information directly against the Clio source of truth.

3.  **Firebase / Firestore:**
    *   Use `keys.firebase.json` to authenticate.
    *   If the file is missing, inform the user immediately only if it is deemed needed for the investigation.
    *   Query Firestore collections (`matters`, `tasks`, etc.) to verify data integrity and state.

4.  **System Logs & Cloud Functions:**
    *   Use the `gcloud` CLI to investigate logs and function status.
    *   Example: `gcloud logging read ...` or `gcloud functions logs read ...` to trace execution paths and identify errors.

5.  **Code Integrity Check:**
    *   Always verify if the relevant code has been modified from the "Initial Commit" or known stable state.
    *   Identify recent changes that might correlate with the reported issue.

6.  **Pre-Change Repository Check:**
    *   Check for uncommitted changes in the repository before performing any modifications.
    *   Ask the user if they wish to commit these changes first.

7.  **Investigation Discipline:**
    *   For investigation, do not do code changes right away.
    *   Focus on gathering evidence, reproducing the issue, and identifying the root cause before attempting any fixes.

8.  **Bug Investigation Report:**
    *   After completing an investigation, provide a report using the following structure:

    **Bug Fix**
    **Goal:** Stop the bug at its starting point using the simplest possible change. Do not handle, catch, or silence the error. Prevent it.

    **1. Problem:**
    What is broken, in 1 sentence. No causes or fixes.

    **2. Impact:**
    Who or what is affected, and how. Include scope and frequency if known.

    **3. Steps to reproduce:**
    Steps a user takes to encounter the issue, without changing code.

    **4. Expected vs actual:**
    What should happen vs what happens.

    **5. Root cause:**
    Where the problem starts. This is the first wrong behavior.

    **6. Evidence supporting the root cause:**

    **7. Temporary fix:**
    Only applicable if the permanent fix takes long to implement and the issue is urgent.

    **8. Permanent fix:**
    Change applied at the root cause location. Fix must prevent the error from happening at all, ANYWHERE. Catching, ignoring, or masking the error is not acceptable.

    **9. Proof the error no longer occurs:**

9.  **Build Mode:**
    *   When in build mode, do not do the fix right away.
    *   It has to be approved first by the user before proceeding.
