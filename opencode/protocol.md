# Troubleshooting & Investigation Protocol

When investigating issues using AI agents (e.g., opencode), adhere to the following protocol to utilize the available system credentials and tools:

1.  **Google Workspace (Gmail & Drive):**
    *   Use `keys.google.json` to authenticate.
    *   If the file is missing, inform the user immediately.
    *   Use `googleapis` (Gmail API, Drive API) to inspect email contents, folder structures, and file metadata directly.

2.  **Clio Integration:**
    *   Use `keys.clio.json` to authenticate with Clio API.
    *   Verify matter details, folder mappings, and contact information directly against the Clio source of truth.

3.  **Firebase / Firestore:**
    *   Use `keys.firebase.json` to authenticate.
    *   Query Firestore collections (`matters`, `tasks`, etc.) to verify data integrity and state.

4.  **System Logs & Cloud Functions:**
    *   Use the `gcloud` CLI to investigate logs and function status.
    *   Example: `gcloud logging read ...` or `gcloud functions logs read ...` to trace execution paths and identify errors.

5.  **Code Integrity Check:**
    *   Always verify if the relevant code has been modified from the "Initial Commit" or known stable state.
    *   Identify recent changes that might correlate with the reported issue.
