# Kutty Story / Magic Hour integration (opt-in)

This repository creates **personalized storybook pages**, not a standalone face-swap gallery. The existing `CartoonCharacterFusionEngine.fuse_page()` is called for previews, page regeneration, and full-book pages. The Magic Hour branch has been added at that shared point, after the explicit no-face page guard.

## Enable on staging

1. Back up the database, application and storage. Use a staging copy of the site.
2. Install backend dependencies in the existing virtualenv: `pip install -r requirements.txt`.
3. Set `FACE_SWAP_PROVIDER=magic_hour` and `MAGIC_HOUR_API_KEY=...` in a backend-only environment file (mode 0600), or inject via systemd `EnvironmentFile=`. Restart the worker/backend process.
4. Run one preview with a single-face target illustration and a consented source portrait. Check the stored `GeneratedAsset.provider` is `Magic Hour`, that all pages retain artwork, and the PDF uses the new image.
5. Test one page regeneration, then a full book. Review output visually: face identity, age appropriateness, alignment, blending, background, and image dimensions. Review failed jobs and costs before enabling production.
6. If results are unsatisfactory, set `FACE_SWAP_PROVIDER=local` and restart. Do not ship a fallback as a paid successful swap.

## Important limitations

- Magic Hour's `all-faces` mode may replace multiple faces. This integration is suitable **only for target pages with one intended human face**. Multi-person target pages need explicit face selection/masking before launch.
- SDK method arguments should be verified against the installed Magic Hour SDK version and your account. This patch has **not** been exercised against a live API account.
- Existing `process_preview_job` performs synchronous fusion inside an async function; Magic Hour `wait_for_completion=True` blocks that worker. Run jobs in a separate worker process; for scale, replace with async submit/poll/webhook architecture.
- Provider pricing and commercial usage rights, especially use with minors' images, must be confirmed in your signed plan. Require parent/guardian authorization, retention limits, secure storage and deletion.
- The output quality gate checks file decodability, output count, and minimum resolution. It **cannot** automatically guarantee face identity, face count, or acceptable compositing; use manual QA and expand tests.
- `cost_estimate_usd=0` is a placeholder, not a claim of zero billing. Integrate actual provider usage accounting before charging customers.
- Existing project config contains insecure default secrets; replace defaults and rotate any credentials that have been deployed. Do not commit `.env`.
