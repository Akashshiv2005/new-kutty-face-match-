# KuttyStory AI Face Swap: Fallbacks & Resilience Guide

This document explains the fallback mechanisms, error classification, logging architecture, and operator troubleshooting procedures for AI face swapping in KuttyStory.

---

## 1. Overview of Fallback Behaviors

| Fallback | Name | Previous Behavior | Modern Resilience Behavior |
| :--- | :--- | :--- | :--- |
| **F1** | **Body Swap $\rightarrow$ Face Swap** | If `body_swap` failed or returned no output, the system silently tried `face_swap_photo`. | **Explicit & Transparent**: If `body_swap` errors or exhausts retries, it logs `outcome="fallback"` with `fallback_from="body_swap"`, sets `used_fallback=True` on `GeneratedAsset`, and completes via `face_swap_photo`. |
| **F2** | **Unpersonalized Base Artwork** | When `fuse_page()` threw an exception, it caught it, logged a notice, and served the base illustration to the customer. | **Eliminated**: Failed pages are recorded as `generation_status="failed"` with standardized `error_code`. The job is set to `status="needs_attention"`. PDF downloads return **HTTP 409 Conflict** with `{failed_pages: [...]}` instead of delivering unpersonalized books. |
| **F3** | **Provider Misconfiguration** | If `FACE_SWAP_PROVIDER != "magic_hour"` or `MAGIC_HOUR_API_KEY` was missing, the system silently dropped to local OpenCV fusion. | **Safeguards & Gated**: Startup logs emit prominent warnings if misconfigured. `ALLOW_LOCAL_FALLBACK=false` (default) blocks silent degradation with a clear error unless explicitly enabled for offline development. |
| **F4** | **Studio Photo Enhancement** | `ai_image_editor` attempts portrait enhancement; if failed, falls back to `image_background_remover`. | **Logged & Controlled**: Gated by the process-wide concurrency semaphore; structured log emitted with `outcome="fallback"` and `fallback_from="ai_image_editor"`. |

---

## 2. Process-Wide Concurrency Gate & Retries

Magic Hour Creator tier accounts support 3 parallel generations at once. Running concurrent requests beyond the plan limit causes Magic Hour to return `status="error"`.

### Concurrency Semaphore
- **Variable**: `MAGIC_HOUR_MAX_CONCURRENCY=3` (in `.env`).
- **Mechanism**: A process-wide `threading.BoundedSemaphore` regulates all Magic Hour network calls (`face_swap_photo`, `body_swap`, `head_swap`, and `ai_image_editor`) up to the configured concurrency limit.
- Maximizes throughput while preventing race conditions or concurrency drops.

### Exponential Backoff with Jitter
- **Variables**:
  - `MAGIC_HOUR_MAX_RETRIES=3`
  - `MAGIC_HOUR_RETRY_BASE_SECONDS=2.0`
- **Formula**: `delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)`
- **Retryable Error Codes**: Only transient errors are retried:
  - `RATE_LIMIT` (HTTP 429)
  - `CONCURRENCY` (HTTP 500 / account busy)
  - `TIMEOUT` (HTTP 504 / network timeout)
  - `DOWNLOAD` (pre-signed S3 download connection error)
- **Non-Retryable Errors**: Immediately fail without wasting retry budgets:
  - `AUTH` (invalid or expired API key)
  - `CREDITS` (insufficient credit balance)
  - `NO_FACE_SOURCE` (no human face detected in uploaded child photo)
  - `MISSING_INPUT` (missing local file)

---

## 3. Structured Logging (`backend/logs/magic_hour.log`)

Every external AI interaction writes structured key-value log entries to `stdout` and a rotating log file at `backend/logs/magic_hour.log` (10 MB max, 5 backup rotations).

### Log Format
```text
YYYY-MM-DD HH:MM:SS [LEVEL] job_id=<job_id> page=<page_num> provider=magic_hour tool=<tool> attempt=<current>/<max> duration_sec=<seconds> outcome=<outcome> [error_code=<code>] [fallback_from=<prev_tool>] [reason="<truncated_reason>"]
```

### Outcomes
- `success`: Call succeeded, output downloaded.
- `retry`: Transient error encountered; retrying after backoff.
- `fallback`: Tool failed and triggered a transparent fallback (e.g., F1 or F4).
- `failed`: Non-retryable error or retries exhausted.

### Security & Privacy Rules
- **No secrets**: API keys and tokens are never printed.
- **No raw binary data**: Image byte buffers are never logged.
- **Truncated URLs**: Pre-signed URLs are truncated to $\le 60$ characters.
- **Truncated reasons**: Error messages are cleaned and capped at 120 characters.

---

## 4. Diagnostics Endpoint

### `GET /api/v1/ai-health/magic-hour`
Returns real-time health and diagnostic telemetry:

```json
{
  "status": "healthy",
  "provider_configured": "magic_hour",
  "is_magic_hour_active": true,
  "key_present": true,
  "allow_local_fallback": false,
  "concurrency_limit": 1,
  "max_retries": 3,
  "last_success_time": "2026-11-10T09:15:30.123456",
  "stats_last_24h": {
    "completed": 42,
    "failed": 1,
    "fallbacks_used": 3,
    "failures_by_error_code": {
      "NO_FACE_SOURCE": 1
    }
  }
}
```

---

## 5. Operator Resolution Runbook

| Error Code | Meaning | Operator Action |
| :--- | :--- | :--- |
| `AUTH` | Invalid or expired `MAGIC_HOUR_API_KEY`. | Verify the API key in `backend/.env`. Generate a new key in the Magic Hour dashboard if necessary. |
| `CREDITS` | Insufficient credit balance. | Top up credits in the Magic Hour account dashboard. Check `PER_BOOK_BUDGET_USD` settings. |
| `RATE_LIMIT` | Exceeded API rate limits. | System automatically retries. If persistent, increase `MAGIC_HOUR_RETRY_BASE_SECONDS` or upgrade account tier. |
| `CONCURRENCY` | Too many parallel tasks running on account. | Verify `MAGIC_HOUR_MAX_CONCURRENCY=1`. Check if multiple workers or instances share the same key. |
| `NO_FACE_SOURCE` | Magic Hour could not find a face in the child photo. | Ask parent to re-upload a clear, forward-facing photo without sunglasses, heavy shadows, or steep angles. |
| `NO_FACE_TARGET` | Magic Hour could not detect the character face on the page. | Inspect target page illustration and verify character face landmarks or bounding outline points. |
| `TIMEOUT` | Request to Magic Hour API or download timed out. | Retries occur automatically. Inspect server internet connectivity and latency to Magic Hour endpoints. |
| `DOWNLOAD` | Could not download asset from pre-signed S3 URL. | Retries occur automatically. Check firewall / egress rules. |
| `MISSING_INPUT` | Reference photo or base page file missing. | Check MinIO storage connectivity and ensure `normalize_child_reference()` ran successfully. |

