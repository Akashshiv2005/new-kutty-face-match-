import asyncio
import concurrent.futures
import datetime
import functools
import json
import os
import tempfile
import time
from pathlib import Path
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.config import settings
from app.models import PersonalizationJob, StoryPage, GeneratedAsset, Book, StoryTemplate
from app.services.storage import storage
from app.services.pdf_composer import PDFComposerService
from app.services.ai.diffusers_provider import diffusers_provider
from app.services.ai.gemini_provider import gemini_provider
from app.services.ai.consistency_engine import CharacterConsistencyEngine
from app.services.ai.cartoon_fusion import cartoon_fusion_engine
from app.services.ai.errors import classify_error
from app.database import SessionLocal

class JobRunner:
    """
    Background job pipeline manager for personalizing storybooks and composing PDFs.
    """

    @staticmethod
    async def process_preview_job(job_id: str):
        """
        Asynchronously process preview generation:
        1. Select representative pages for preview (e.g. Cover, Page 3, Page 6, Page 7, Page 10)
        2. Normalize child photo with solid studio backdrop
        3. Seamlessly fuse child cartoon face into storybook artwork preserving unicorn
        4. Assemble preview PDF
        5. Mark job complete
        """
        db: Session = SessionLocal()
        try:
            job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
            if not job:
                return

            story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
            story_slug = story.slug if story else "unicorn-story"
            story_title = story.title if story else "Storybook"

            # Remove previous assets and books if re-running this job
            db.query(GeneratedAsset).filter(GeneratedAsset.job_id == job.id).delete()
            db.query(Book).filter(Book.job_id == job.id).delete()
            job.completed_pages = 0
            job.failed_pages = 0

            job.status = "analyzing"
            job.current_stage = f"Analyzing {story_title} scenes & preparing character reference"
            db.commit()

            # Normalize child reference photo
            print(f"[JobRunner] Personalizing with child reference photo_path: {job.photo_path}")
            norm_ref = CharacterConsistencyEngine.normalize_child_reference(job.photo_path)
            print(f"[JobRunner] Normalized child reference file created: {norm_ref}")

            # Get story pages
            story_pages = db.query(StoryPage).filter(StoryPage.story_id == job.story_id).order_by(StoryPage.page_index).all()
            
            # Choose pages to personalize for preview (strictly 3 images)
            from app.models import AISettings
            ai_conf = db.query(AISettings).filter(AISettings.id == "default").first()
            limit_val = ai_conf.preview_page_limit if ai_conf and ai_conf.preview_page_limit else settings.PREVIEW_PAGE_LIMIT
            preview_limit = min(limit_val, 3, len(story_pages))

            # Filter for pages that actually contain a personalizable character (strictly skip empty sceneries to save credits)
            def _is_page_personalizable(p: StoryPage) -> bool:
                if not getattr(p, "personalization_required", True):
                    return False
                pts = getattr(p, "face_outline_points", "")
                if not pts:
                    return False
                pts_clean = str(pts).strip().lower()
                if pts_clean in ("", "empty", "[]", "none", "false", "no_face", "null"):
                    return False
                try:
                    parsed = json.loads(pts) if isinstance(pts, str) else pts
                    if isinstance(parsed, list) and len(parsed) < 3:
                        return False
                except Exception:
                    pass
                return True

            pers_pages = [p for p in story_pages if _is_page_personalizable(p)]
            # Pick only pages that actually contain character faces. If none have faces, fallback to top pages (which will safely preserve original plate)
            target_pages = pers_pages[:preview_limit] if pers_pages else story_pages[:preview_limit]

            job.total_pages = len(target_pages)
            job.status = "generating"
            job.current_stage = f"Weaving {len(target_pages)} personalized storybook pages..."
            db.commit()

            generated_pages_data = []

            # ---------- Pre-compute per-page text + prompt in job's selected language ----------
            job_lang = (getattr(job, "language", "english") or "english").lower().strip()
            page_tasks = []
            for page in target_pages:
                if page.story_text is not None:
                    raw_text = page.story_text
                else:
                    raw_text = page.extracted_text or ""

                personalized_text = raw_text
                if personalized_text and personalized_text.strip() != "":
                    for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}"]:
                        personalized_text = personalized_text.replace(tag, job.child_name)

                    if job_lang not in ["english", "en"]:
                        custom_trans = {}
                        if getattr(page, "translations", None):
                            try:
                                custom_trans = json.loads(page.translations) if isinstance(page.translations, str) else page.translations
                            except Exception:
                                custom_trans = {}
                        if custom_trans and custom_trans.get(job_lang):
                            personalized_text = custom_trans[job_lang]
                            for tag in ["[Name]", "[name]", "{name}", "[child_name]", "{child_name}", "{{name}}"]:
                                personalized_text = personalized_text.replace(tag, job.child_name)
                        else:
                            from app.services.translation_service import translation_service
                            personalized_text = translation_service.translate_text(personalized_text, job_lang, child_name=job.child_name)
                else:
                    personalized_text = ""

                prompt = page.prompt_template or f"Children's book illustration for {story_title}, page {page.page_number}"
                expanded = await gemini_provider.expand_prompt(prompt, job.child_name)
                page_tasks.append((page, personalized_text, expanded))

            # ---------- Run all face-swap / fusion calls with Page 1 Canonical Anchor ----------
            import concurrent.futures

            def _fuse_one(args, ref_override=None):
                """Blocking face-swap worker — runs in a thread pool."""
                page, personalized_text, expanded = args
                page_img = page.original_image_path or f"source_pages/{story_slug}/page_{page.page_number:02d}.png"
                target_ref = ref_override or norm_ref
                if settings.ACTIVE_IMAGE_PROVIDER == "huggingface" and settings.HF_TOKEN:
                    # huggingface is async-native; run synchronously in thread as fallback
                    import asyncio as _asyncio
                    loop = _asyncio.new_event_loop()
                    gen_res = loop.run_until_complete(
                        diffusers_provider.generate_illustration(
                            prompt=expanded,
                            reference_image_path=target_ref,
                            width=1024,
                            height=1024,
                        )
                    )
                    loop.close()
                else:
                    gen_res = cartoon_fusion_engine.fuse_page(
                        page_number=page.page_number,
                        child_reference_path=target_ref,
                        story_slug=story_slug,
                        page_image_path=page_img,
                        face_outline_points=page.face_outline_points,
                        prefer_local=getattr(settings, "PREFER_LOCAL_FUSION", False),
                        outfit_mode=getattr(job, "outfit_mode", "story") or "story",
                    )
                return (page, personalized_text, gen_res)

            # Direct parallel face-swap using authentic child reference for 100% identity accuracy and cross-page consistency
            concurrency_limit = max(1, int(getattr(settings, "MAGIC_HOUR_MAX_CONCURRENCY", 3) or os.getenv("MAGIC_HOUR_MAX_CONCURRENCY", "3")))
            max_workers = min(len(page_tasks), concurrency_limit)
            loop = asyncio.get_event_loop()
            print(f"[JobRunner] Concurrently generating {len(page_tasks)} story pages with authentic child reference (workers={max_workers})...")
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [loop.run_in_executor(executor, _fuse_one, task) for task in page_tasks]
                results = await asyncio.gather(*futures, return_exceptions=True)

            # ---------- Save results to MinIO + DB (back on main thread, safe) ----------
            for i, result in enumerate(results):
                task_page, task_text, _ = page_tasks[i]
                if isinstance(result, Exception):
                    job.failed_pages += 1
                    job.error_details = str(result)
                    job.status = "needs_attention"
                    code, msg, _ = classify_error(result)
                    asset = GeneratedAsset(
                        job_id=job.id,
                        story_page_id=task_page.id,
                        page_number=task_page.page_number,
                        storage_path="",
                        provider="Magic Hour",
                        model="face_swap_photo",
                        prompt_used=task_text,
                        generation_status="failed",
                        review_status="rejected",
                        error_code=code.value,
                        attempts=1,
                    )
                    db.add(asset)
                    db.commit()
                    continue
                page, personalized_text, gen_res = result
                try:
                    asset_filename = f"job_{job.id}_p{page.page_number:02d}_{int(time.time())}.{gen_res.format}"
                    asset_path = storage.save_bytes(
                        data=gen_res.image_bytes,
                        category="generated_assets",
                        custom_name=f"{job.id}/{asset_filename}",
                    )
                    asset = GeneratedAsset(
                        job_id=job.id,
                        story_page_id=page.id,
                        page_number=page.page_number,
                        storage_path=asset_path,
                        provider=gen_res.provider,
                        model=gen_res.model,
                        prompt_used=personalized_text,
                        generation_status="completed",
                        review_status="approved",
                        cost_estimate=gen_res.cost_estimate_usd,
                        generation_time_sec=gen_res.generation_time_sec,
                        error_code=gen_res.error_code,
                        attempts=gen_res.attempts,
                        used_fallback=gen_res.used_fallback,
                        fallback_from=gen_res.fallback_from,
                    )
                    # Commit with automatic retry on transient PostgreSQL lock contention / deadlock
                    committed = False
                    for db_attempt in range(5):
                        try:
                            db.add(asset)
                            job.completed_pages += 1
                            db.commit()
                            committed = True
                            break
                        except Exception as db_err:
                            try:
                                db.rollback()
                            except Exception:
                                pass
                            if "deadlock" in str(db_err).lower() and db_attempt < 4:
                                time.sleep(0.3 * (db_attempt + 1))
                                continue
                            raise
                    generated_pages_data.append({
                        "page_number": page.page_number,
                        "page_type": page.page_type,
                        "image_path": asset_path,
                        "story_text": personalized_text,
                        "text_x": getattr(page, "text_x", 50.0) if getattr(page, "text_x", None) is not None else 50.0,
                        "text_y": getattr(page, "text_y", 89.5) if getattr(page, "text_y", None) is not None else 89.5,
                        "font_size": getattr(page, "font_size", 20) or 20,
                        "font_family": getattr(page, "font_family", "Sans (DejaVu Bold)") or "Sans (DejaVu Bold)",
                        "font_color": getattr(page, "font_color", "#000000") or "#000000",
                        "has_background_box": getattr(page, "has_background_box", False) or False,
                        "box_bg_color": getattr(page, "box_bg_color", "#FFFFFF") or "#FFFFFF",
                        "box_border_color": getattr(page, "box_border_color", "#E5E7EB") or "#E5E7EB",
                        "box_border_width": getattr(page, "box_border_width", 1) if getattr(page, "box_border_width", None) is not None else 1,
                "box_bg_opacity": getattr(page, "box_bg_opacity", 0.85) if getattr(page, "box_bg_opacity", None) is not None else 0.85,
                        "text_align": getattr(page, "text_align", "center") or "center",
                        "box_layout": getattr(page, "box_layout", "banner") or "banner",
                        "box_border_radius": getattr(page, "box_border_radius", 14) if getattr(page, "box_border_radius", None) is not None else 14,
                    })
                except Exception as e:
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    job.failed_pages += 1
                    job.error_details = str(e)
                    job.status = "needs_attention"
                    try:
                        db.commit()
                    except Exception:
                        pass

            # Sort pages in order after parallel gather
            generated_pages_data.sort(key=lambda x: x["page_number"])

            # Assemble Preview PDF
            if job.failed_pages > 0:
                job.status = "needs_attention"
                job.current_stage = f"Preview generated with {job.failed_pages} failed page(s)"
                db.commit()
            else:
                job.status = "assembling_preview"
                job.current_stage = "Composing deterministic preview PDF with ReportLab"
                db.commit()

            job_lang = (getattr(job, "language", "english") or "english").lower().strip()
            preview_filename = f"preview_{job.id}_{job_lang}.pdf"
            pdf_path, validation = PDFComposerService.compose_storybook_pdf(
                pages_data=generated_pages_data[:3],
                output_filename=preview_filename,
                book_type="preview",
                child_name=job.child_name,
                story_title=story_title,
                language=job_lang
            )

            import json
            book = Book(
                job_id=job.id,
                book_type="preview",
                pdf_storage_path=pdf_path,
                page_count=min(len(generated_pages_data), 3),
                validation_status="valid" if validation["validation_passed"] else "flagged",
                validation_details=json.dumps(validation)
            )
            db.add(book)

            job.status = "completed"
            job.current_stage = "Preview generated successfully"
            db.commit()

        except Exception as ex:
            print(f"[JobRunner] Error during preview job {job_id}: {ex}")
            try:
                db.rollback()
            except Exception:
                pass
            try:
                db.close()
                db = SessionLocal()
                failed_job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
                if failed_job:
                    failed_job.status = "failed"
                    failed_job.current_stage = "Preview generation encountered an error"
                    failed_job.error_details = str(ex)[:500]
                    db.commit()
            except Exception as update_err:
                print(f"[JobRunner] Could not persist preview failure state for job {job_id}: {update_err}")
        finally:
            try:
                db.close()
            except Exception:
                pass

    @staticmethod
    async def regenerate_single_page(asset_id: str) -> Optional[GeneratedAsset]:
        """
        Regenerate a single rejected or failed page asset without discarding other pages.
        """
        db: Session = SessionLocal()
        try:
            asset = db.query(GeneratedAsset).filter(GeneratedAsset.id == asset_id).first()
            if not asset:
                return None

            job = db.query(PersonalizationJob).filter(PersonalizationJob.id == asset.job_id).first()
            page = db.query(StoryPage).filter(StoryPage.id == asset.story_page_id).first()
            if not job or not page:
                return None

            story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
            story_slug = story.slug if story else "unicorn-story"
            story_title = story.title if story else "Storybook"

            if page.story_text is not None:
                raw_text = page.story_text
            else:
                raw_text = page.extracted_text or ""

            personalized_text = raw_text
            if personalized_text and personalized_text.strip() != "":
                for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}"]:
                    personalized_text = personalized_text.replace(tag, job.child_name)
            else:
                personalized_text = ""

            prompt = page.prompt_template or f"Children's book illustration for {story_title}, page {page.page_number}"
            expanded = await gemini_provider.expand_prompt(prompt, job.child_name)

            if settings.ACTIVE_IMAGE_PROVIDER == "huggingface" and settings.HF_TOKEN:
                gen_res = await diffusers_provider.generate_illustration(
                    prompt=expanded,
                    reference_image_path=job.photo_path,
                    width=1024,
                    height=1024
                )
            else:
                page_img = page.original_image_path
                if not page_img or not os.path.exists(page_img):
                    cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page.page_number:02d}.png"
                    if cand.exists():
                        page_img = str(cand)
                norm_ref = CharacterConsistencyEngine.normalize_child_reference(job.photo_path) if job.photo_path else None
                gen_res = cartoon_fusion_engine.fuse_page(
                    page_number=page.page_number,
                    child_reference_path=norm_ref or job.photo_path,
                    story_slug=story_slug,
                    page_image_path=page_img,
                    face_outline_points=page.face_outline_points,
                    outfit_mode=getattr(job, "outfit_mode", "story") or "story",
                )

            asset_filename = f"job_{job.id}_p{page.page_number:02d}_v{asset.asset_version + 1}_{int(time.time())}.{gen_res.format}"
            new_path = storage.save_bytes(
                data=gen_res.image_bytes,
                category="generated_assets",
                custom_name=f"{job.id}/{asset_filename}"
            )

            asset.storage_path = new_path
            asset.asset_version += 1
            asset.generation_status = "completed"
            asset.review_status = "pending_review"
            asset.prompt_used = personalized_text or expanded
            asset.generation_time_sec = gen_res.generation_time_sec
            asset.cost_estimate = gen_res.cost_estimate_usd
            db.commit()
            db.refresh(asset)
            return asset
        except Exception as ex:
            print(f"[JobRunner] Error regenerating single page asset {asset_id}: {ex}")
            try:
                db.rollback()
            except Exception:
                pass
            return None
        finally:
            try:
                db.close()
            except Exception:
                pass

    @staticmethod
    def get_or_generate_full_storybook_pages(
        job_id: str,
        target_lang: str = "english"
    ) -> List[Dict[str, Any]]:
        """
        Retrieves or dynamically completes ALL pages of the storybook for full print production:
        - Resolves all pages in sequence from the uploaded PDF.
        - Preserves existing preview plates that were already personalized.
        - Dynamically generates face-fused character artwork for all remaining personalizable pages.
        - Translates narrative text if target_lang is not English.
        - Returns complete pages_data array for all pages (e.g. 1 to 26).
        """
        db: Session = SessionLocal()
        try:
            job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
            if not job:
                raise ValueError("Personalization job not found")

            story = job.story or db.query(StoryTemplate).filter(StoryTemplate.id == job.story_id).first()
            if not story:
                raise ValueError("Story template not found")

            story_slug = story.slug or "unicorn-story"
            story_title = story.title or "Personalized Story"

            story_pages = db.query(StoryPage).filter(StoryPage.story_id == story.id).order_by(StoryPage.page_index).all()
            if not story_pages:
                raise ValueError("No story pages configured for this story template")

            existing_assets = {}
            for a in db.query(GeneratedAsset).filter(GeneratedAsset.job_id == job.id, GeneratedAsset.generation_status == "completed").all():
                if a.storage_path:
                    existing_assets[a.page_number] = a

            norm_ref = None
            if job.photo_path:
                try:
                    norm_ref = CharacterConsistencyEngine.normalize_child_reference(job.photo_path)
                except Exception as e:
                    print(f"Notice: Error preparing child photo for full book generation: {e}")

            # Pre-fuse all pages needing face swap concurrently (up to MAGIC_HOUR_MAX_CONCURRENCY)
            concurrency_limit = max(1, int(getattr(settings, "MAGIC_HOUR_MAX_CONCURRENCY", 3) or os.getenv("MAGIC_HOUR_MAX_CONCURRENCY", "3")))
            tasks_to_fuse = []
            prepared_pages = []

            for page in story_pages:
                page_num = page.page_number
                page_type = page.page_type or ("cover" if page_num == 1 else "story")

                job_lang = (getattr(job, "language", "english") or "english").lower().strip()
                effective_lang = target_lang if (target_lang and target_lang.lower() != "english") else job_lang
                effective_lang = (effective_lang or "english").lower().strip()

                if page.story_text is not None:
                    raw_text = page.story_text
                else:
                    raw_text = page.extracted_text or ""

                personalized_text = raw_text

                if personalized_text and personalized_text.strip() != "":
                    if effective_lang not in ["english", "en"]:
                        custom_trans = {}
                        if getattr(page, "translations", None):
                            try:
                                custom_trans = json.loads(page.translations) if isinstance(page.translations, str) else page.translations
                            except Exception:
                                custom_trans = {}
                        if isinstance(custom_trans, dict) and custom_trans.get(effective_lang):
                            personalized_text = custom_trans[effective_lang]
                        else:
                            from app.services.translation_service import translation_service
                            personalized_text = translation_service.translate_text(personalized_text, effective_lang, child_name=job.child_name)

                    for tag in ["[Name]", "[name]", "{name}", "{{name}}", "[child_name]", "{child_name}", "{{child_name}}", "{குழந்தை_பெயர்}", "[குழந்தை_பெயர்]"]:
                        personalized_text = personalized_text.replace(tag, job.child_name)
                else:
                    personalized_text = ""

                pts = getattr(page, "face_outline_points", "")
                pts_clean = str(pts or "").strip().lower()
                has_character = bool(
                    pts and pts_clean not in ("", "empty", "[]", "none", "false", "no_face", "null")
                )
                if has_character:
                    try:
                        parsed = json.loads(pts) if isinstance(pts, str) else pts
                        if isinstance(parsed, list) and len(parsed) < 3:
                            has_character = False
                    except Exception:
                        pass
                is_page_personalizable = bool(page.personalization_required and has_character)

                page_img = None
                if is_page_personalizable and page_num not in existing_assets and norm_ref and os.path.exists(norm_ref):
                    page_img = storage.resolve_path(page.original_image_path) if page.original_image_path else None
                    if not page_img or not os.path.exists(page_img):
                        cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page_num:02d}.png"
                        if cand.exists():
                            page_img = str(cand)
                        else:
                            page_img = storage.resolve_path(f"source_pages/{story_slug}/page_{page_num:02d}.png")
                    tasks_to_fuse.append((page, page_img))

                prepared_pages.append({
                    "page": page,
                    "page_num": page_num,
                    "page_type": page_type,
                    "personalized_text": personalized_text,
                    "is_page_personalizable": is_page_personalizable,
                    "page_img": page_img,
                })

            fused_results = {}
            if tasks_to_fuse:
                def _fuse_full_page(task_item):
                    p, p_img = task_item
                    try:
                        res = cartoon_fusion_engine.fuse_page(
                            page_number=p.page_number,
                            child_reference_path=norm_ref,
                            story_slug=story_slug,
                            page_image_path=p_img,
                            face_outline_points=p.face_outline_points,
                            prefer_local=getattr(settings, "PREFER_LOCAL_FUSION", False),
                            outfit_mode=getattr(job, "outfit_mode", "story") or "story",
                        )
                        return (p.page_number, res, None)
                    except Exception as ex:
                        return (p.page_number, None, ex)

                with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(tasks_to_fuse), concurrency_limit)) as executor:
                    for p_num, gen_res, err in executor.map(_fuse_full_page, tasks_to_fuse):
                        fused_results[p_num] = (gen_res, err)

            pages_data = []
            for item in prepared_pages:
                page = item["page"]
                page_num = item["page_num"]
                page_type = item["page_type"]
                personalized_text = item["personalized_text"]
                is_page_personalizable = item["is_page_personalizable"]

                img_path = None
                if page_num in existing_assets and is_page_personalizable:
                    img_path = existing_assets[page_num].storage_path
                elif is_page_personalizable and norm_ref and os.path.exists(norm_ref) and page_num in fused_results:
                    gen_res, fuse_err = fused_results[page_num]
                    if gen_res is not None:
                        asset_filename = f"job_{job.id}_p{page_num:02d}_{int(time.time())}.{gen_res.format}"
                        asset_path = storage.save_bytes(
                            data=gen_res.image_bytes,
                            category="generated_assets",
                            custom_name=f"{job.id}/{asset_filename}"
                        )

                        asset = GeneratedAsset(
                            job_id=job.id,
                            story_page_id=page.id,
                            page_number=page_num,
                            storage_path=asset_path,
                            provider=gen_res.provider,
                            model=gen_res.model,
                            prompt_used=personalized_text,
                            generation_status="completed",
                            review_status="approved",
                            cost_estimate=gen_res.cost_estimate_usd,
                            generation_time_sec=gen_res.generation_time_sec,
                            error_code=gen_res.error_code,
                            attempts=gen_res.attempts,
                            used_fallback=gen_res.used_fallback,
                            fallback_from=gen_res.fallback_from,
                        )
                        db.add(asset)
                        existing_assets[page_num] = asset
                        img_path = asset_path

                        # Update live job progress in database
                        job.completed_pages = len(existing_assets)
                        job.total_pages = len(story_pages)
                        pct = int((len(existing_assets) / len(story_pages)) * 100)
                        job.status = f"Rendering · {pct}%"
                        job.current_stage = f"Rendering HD page {page_num} of {len(story_pages)}..."
                        db.commit()
                    else:
                        print(f"Notice: Face fusion error on full render page {page_num}: {fuse_err}")
                        code, msg, _ = classify_error(fuse_err)
                        failed_asset = GeneratedAsset(
                            job_id=job.id,
                            story_page_id=page.id,
                            page_number=page_num,
                            storage_path="",
                            provider="Magic Hour",
                            model="face_swap_photo",
                            prompt_used=personalized_text,
                            generation_status="failed",
                            review_status="rejected",
                            error_code=code.value,
                            attempts=1,
                        )
                        db.add(failed_asset)
                        job.failed_pages = (job.failed_pages or 0) + 1
                        job.status = "needs_attention"
                        job.current_stage = f"Page {page_num} personalization failed: {code.value}"
                        job.error_details = str(fuse_err)
                        db.commit()

                        cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page_num:02d}.png"
                        img_path = (str(cand) if cand.exists() else None) or (storage.resolve_path(page.original_image_path) if page.original_image_path else None) or page.original_image_path
                else:
                    cand = settings.SOURCE_PAGES_DIR / story_slug / f"page_{page_num:02d}.png"
                    img_path = (str(cand) if cand.exists() else None) or (storage.resolve_path(page.original_image_path) if page.original_image_path else None) or page.original_image_path

                pages_data.append({
                    "page_number": page_num,
                    "page_type": page_type,
                    "image_path": img_path,
                    "story_text": personalized_text
                })

            job.total_pages = len(pages_data)
            job.completed_pages = len(pages_data)
            if job.status != "needs_attention" and (job.failed_pages or 0) == 0:
                job.status = "completed"
                job.current_stage = "All HD pages generated successfully"
            else:
                job.status = "needs_attention"
                job.current_stage = f"Full book rendered with {job.failed_pages} unpersonalized page(s)"
            db.commit()

            return pages_data
        except Exception as ex:
            print(f"[JobRunner] Critical error generating full storybook for job {job_id}: {ex}")
            try:
                db.rollback()
            except Exception:
                pass
            try:
                failed_job = db.query(PersonalizationJob).filter(PersonalizationJob.id == job_id).first()
                if failed_job:
                    failed_job.status = "failed"
                    failed_job.current_stage = "Full book generation encountered an error"
                    failed_job.error_details = str(ex)[:500]
                    db.commit()
            except Exception as update_err:
                print(f"[JobRunner] Could not persist failure state for job {job_id}: {update_err}")
            raise
        finally:
            try:
                db.close()
            except Exception:
                pass

    @staticmethod
    def recover_stuck_jobs(timeout_minutes: int = 15) -> int:
        """
        Background Watchdog:
        Recovers jobs stuck in active rendering or processing states caused by
        unexpected server crashes, OOM restarts, or killed background worker tasks.
        Transitions abandoned jobs to 'needs_attention' with an actionable reason.
        """
        db: Session = SessionLocal()
        recovered_count = 0
        try:
            cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=timeout_minutes)
            candidates = db.query(PersonalizationJob).filter(
                PersonalizationJob.status.not_in(["completed", "failed", "needs_attention"]),
                PersonalizationJob.created_at < cutoff
            ).all()

            for job in candidates:
                st = (job.status or "").lower()
                if "rendering" in st or "generating" in st or "analyzing" in st or "assembling" in st or st == "processing":
                    job.status = "needs_attention"
                    job.current_stage = f"Process timed out after {timeout_minutes}m (recovered by Watchdog)."
                    job.error_details = "Generation was interrupted by a server restart or process timeout. Please retry."
                    recovered_count += 1

            if recovered_count > 0:
                db.commit()
                print(f"[Watchdog] Successfully recovered {recovered_count} abandoned/stuck jobs.")
        except Exception as e:
            print(f"[Watchdog] Error executing stuck job recovery: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            try:
                db.close()
            except Exception:
                pass
        return recovered_count

job_runner = JobRunner()

