"""
test_database.py — Database layer tests: model creation, relationships, constraints.

Covers:
- User model CRUD
- StoryTemplate and StoryPage creation
- PersonalizationJob and ChildProfile relationships
- Order, Feedback, ChildWrittenStory, SiteSettings
- Unique constraint on user email
- Cascade deletes
"""
import uuid
import datetime
import pytest
from sqlalchemy.exc import IntegrityError


class TestUserModel:
    def test_create_user(self, db_session):
        from app.models import User
        u = User(
            id=str(uuid.uuid4()),
            name="dbtest",
            email=f"dbtest_{uuid.uuid4().hex[:6]}@test.com",
            hashed_password="salt$keyhex",
            role="admin",
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        assert u.id is not None
        assert u.role == "admin"

    def test_user_default_role_customer(self, db_session):
        from app.models import User
        u = User(
            id=str(uuid.uuid4()),
            name="defcust",
            email=f"defcust_{uuid.uuid4().hex[:6]}@test.com",
            hashed_password="salt$key",
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        assert u.role == "customer"

    def test_user_email_unique(self, db_session):
        from app.models import User
        email = f"unique_check_{uuid.uuid4().hex[:6]}@test.com"
        u1 = User(id=str(uuid.uuid4()), name="a", email=email, hashed_password="s$k")
        db_session.add(u1)
        db_session.commit()
        u2 = User(id=str(uuid.uuid4()), name="b", email=email, hashed_password="s$k")
        db_session.add(u2)
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_user_created_at_auto(self, db_session):
        from app.models import User
        u = User(id=str(uuid.uuid4()), name="ts_test",
                 email=f"ts_{uuid.uuid4().hex[:6]}@t.com", hashed_password="s$k")
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        assert u.created_at is not None


class TestStoryModels:
    def test_create_story_template(self, db_session):
        from app.models import StoryTemplate
        story = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"db-story-{uuid.uuid4().hex[:8]}",
            title="DB Test Story",
            status="published",
        )
        db_session.add(story)
        db_session.commit()
        db_session.refresh(story)
        assert story.id is not None
        assert story.status == "published"

    def test_story_has_default_prices(self, db_session):
        from app.models import StoryTemplate
        story = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"price-{uuid.uuid4().hex[:8]}",
            title="Price Check",
        )
        db_session.add(story)
        db_session.commit()
        db_session.refresh(story)
        assert story.price_digital == 799.0
        assert story.price_print == 1399.0

    def test_story_slug_unique(self, db_session):
        from app.models import StoryTemplate
        slug = f"unique-slug-{uuid.uuid4().hex[:6]}"
        s1 = StoryTemplate(id=str(uuid.uuid4()), slug=slug, title="S1")
        db_session.add(s1)
        db_session.commit()
        s2 = StoryTemplate(id=str(uuid.uuid4()), slug=slug, title="S2")
        db_session.add(s2)
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_story_page_relationship(self, db_session):
        from app.models import StoryTemplate, StoryPage
        story = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"rel-{uuid.uuid4().hex[:8]}",
            title="Relationship Story",
        )
        db_session.add(story)
        db_session.flush()
        for i in range(3):
            page = StoryPage(
                id=str(uuid.uuid4()),
                story_id=story.id,
                page_index=i,
                page_number=i + 1,
            )
            db_session.add(page)
        db_session.commit()
        db_session.refresh(story)
        assert len(story.pages) == 3

    def test_story_cascade_delete_pages(self, db_session):
        from app.models import StoryTemplate, StoryPage
        story = StoryTemplate(
            id=str(uuid.uuid4()),
            slug=f"cascade-{uuid.uuid4().hex[:8]}",
            title="Cascade Story",
        )
        db_session.add(story)
        db_session.flush()
        page = StoryPage(
            id=str(uuid.uuid4()),
            story_id=story.id,
            page_index=0,
            page_number=1,
        )
        db_session.add(page)
        db_session.commit()
        page_id = page.id
        # Delete the story — pages should cascade delete
        db_session.delete(story)
        db_session.commit()
        orphan = db_session.query(StoryPage).filter(StoryPage.id == page_id).first()
        assert orphan is None


class TestPersonalizationJobModel:
    def test_create_job(self, db_session, published_story):
        from app.models import PersonalizationJob, ChildProfile
        profile = ChildProfile(
            id=str(uuid.uuid4()),
            child_display_name="Test Kid",
            photo_storage_path="child_photos/test.jpg",
            consent_status=True,
            retention_status="active",
        )
        db_session.add(profile)
        db_session.flush()
        job = PersonalizationJob(
            id=str(uuid.uuid4()),
            story_id=published_story.id,
            child_profile_id=profile.id,
            child_name="Test Kid",
            photo_path="child_photos/test.jpg",
            status="queued",
            total_pages=5,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        assert job.id is not None
        assert job.status == "queued"
        assert job.is_paid is False

    def test_job_defaults(self, db_session, published_story):
        from app.models import PersonalizationJob, ChildProfile
        profile = ChildProfile(
            id=str(uuid.uuid4()),
            child_display_name="Def Kid",
            photo_storage_path="p.jpg",
            consent_status=True,
            retention_status="active",
        )
        db_session.add(profile)
        db_session.flush()
        job = PersonalizationJob(
            id=str(uuid.uuid4()),
            story_id=published_story.id,
            child_name="Def Kid",
            photo_path="p.jpg",
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        assert job.outfit_mode == "story"
        assert job.language == "english"
        assert job.format_type == "digital"


class TestFeedbackModel:
    def test_create_feedback(self, db_session):
        from app.models import Feedback
        fb = Feedback(
            id=str(uuid.uuid4()),
            name="DB Feedback User",
            place="DB City",
            rating=4,
            review_text="Good book",
            status="pending",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(fb)
        db_session.commit()
        db_session.refresh(fb)
        assert fb.id is not None
        assert fb.status == "pending"

    def test_feedback_rating_stored(self, db_session):
        from app.models import Feedback
        fb = Feedback(
            id=str(uuid.uuid4()),
            name="Star Test",
            place="Anywhere",
            rating=3,
            status="pending",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db_session.add(fb)
        db_session.commit()
        db_session.refresh(fb)
        assert fb.rating == 3


class TestSiteSettingsModel:
    def test_create_site_settings(self, db_session):
        from app.models import SiteSettings
        import json
        row = SiteSettings(
            key="test_setting_key",
            value=json.dumps({"test": True, "value": 42}),
        )
        db_session.add(row)
        db_session.commit()
        result = db_session.query(SiteSettings).filter(SiteSettings.key == "test_setting_key").first()
        assert result is not None
        assert json.loads(result.value)["value"] == 42

    def test_site_settings_key_is_primary_key(self, db_session):
        from app.models import SiteSettings
        row1 = SiteSettings(key="duplicate_key_test", value="{}")
        db_session.add(row1)
        db_session.commit()
        row2 = SiteSettings(key="duplicate_key_test", value='{"b": 2}')
        db_session.add(row2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestOrderModel:
    def test_create_order(self, db_session, personalization_job):
        from app.models import Order
        order = Order(
            id=str(uuid.uuid4()),
            order_number=f"ORD-TEST-{uuid.uuid4().hex[:4].upper()}",
            job_id=personalization_job.id,
            customer_name="Test Customer",
            customer_email="cust@test.com",
            format_type="digital",
            amount=799.0,
            currency="INR",
            status="Paid",
            payment_status="paid",
        )
        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)
        assert order.id is not None
        assert order.amount == 799.0
        assert order.currency == "INR"
