from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "admin"

class UserRegister(BaseModel):
    name: str
    phone: Optional[str] = None
    email: str
    password: str
    confirm_password: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str  # Can be username or email
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str
    confirm_password: str

class UserOut(UserBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Story Page Schemas
class StoryPageBase(BaseModel):
    page_index: int
    page_number: int
    page_type: str = "story"
    story_text: str = ""
    translations: Optional[str] = "{}"
    scene_description: str = ""
    character_guidance: str = ""
    prompt_template: str = ""
    personalization_required: bool = True
    allow_illustration_generation: bool = True
    face_outline_points: Optional[str] = ""
    text_x: Optional[float] = 50.0
    text_y: Optional[float] = 89.5
    font_size: Optional[int] = 15
    font_family: Optional[str] = "Sans (DejaVu Bold)"
    font_color: Optional[str] = "#000000"
    letter_spacing: Optional[int] = 0
    stroke_color: Optional[str] = "#FFFFFF"
    stroke_width: Optional[int] = 0
    has_shadow: Optional[bool] = False
    soft_line_break: Optional[bool] = True
    has_background_box: Optional[bool] = True
    box_layout: Optional[str] = "banner"
    box_bg_color: Optional[str] = "#FAF4E6"
    box_border_color: Optional[str] = "#E8DEC8"
    box_border_width: Optional[int] = 1
    box_border_radius: Optional[int] = 16
    box_bg_opacity: Optional[float] = 0.90
    text_align: Optional[str] = "center"
    warp_style: Optional[str] = "None"
    gender_variant: Optional[str] = "boy"

class StoryPageUpdate(BaseModel):
    story_text: Optional[str] = None
    translations: Optional[str] = None
    page_type: Optional[str] = None
    scene_description: Optional[str] = None
    character_guidance: Optional[str] = None
    prompt_template: Optional[str] = None
    personalization_required: Optional[bool] = None
    allow_illustration_generation: Optional[bool] = None
    original_image_path: Optional[str] = None
    face_outline_points: Optional[str] = None
    text_x: Optional[float] = None
    text_y: Optional[float] = None
    font_size: Optional[int] = None
    font_family: Optional[str] = None
    font_color: Optional[str] = None
    letter_spacing: Optional[int] = None
    stroke_color: Optional[str] = None
    stroke_width: Optional[int] = None
    has_shadow: Optional[bool] = None
    soft_line_break: Optional[bool] = None
    has_background_box: Optional[bool] = None
    box_layout: Optional[str] = None
    box_bg_color: Optional[str] = None
    box_border_color: Optional[str] = None
    box_border_width: Optional[int] = None
    box_border_radius: Optional[int] = None
    box_bg_opacity: Optional[float] = None
    text_align: Optional[str] = None
    warp_style: Optional[str] = None
    gender_variant: Optional[str] = None

class StoryPageOut(StoryPageBase):
    id: str
    story_id: str
    original_image_path: str
    original_image_url: Optional[str] = None
    extracted_text: str = ""
    class Config:
        from_attributes = True

# Story Template Schemas
class StoryTemplateBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    category: str = "Fairytale & Adventure"
    age_range: str = "3-8 years"
    language: str = "English"
    price_digital: float = 14.99
    price_print: float = 29.99
    currency: str = "USD"
    status: str = "draft"
    target_gender: Optional[str] = "both"
    min_age: Optional[int] = 2
    max_age: Optional[int] = 13
    highlight: Optional[str] = None
    in_hero_carousel: Optional[bool] = False

class StoryTemplateCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    category: str = "ADVENTURE"
    min_age: Optional[int] = 3
    max_age: Optional[int] = 7
    age_range: Optional[str] = None
    price_digital: float = 799.0
    price_print: float = 1399.0
    currency: str = "INR"
    page_count: int = 28
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    cover_image_path: Optional[str] = None
    status: str = "published"
    target_gender: Optional[str] = "both"
    highlight: Optional[str] = None
    in_hero_carousel: Optional[bool] = False
    hardcover_cover_image_path: Optional[str] = None
    hardcover_cover_image_url: Optional[str] = None
    hardcover_cover_face_points: Optional[str] = None

class StoryTemplateUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    age_range: Optional[str] = None
    language: Optional[str] = None
    price_digital: Optional[float] = None
    price_print: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    cover_image_url: Optional[str] = None
    cover_image_path: Optional[str] = None
    page_count: Optional[int] = None
    target_gender: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    highlight: Optional[str] = None
    in_hero_carousel: Optional[bool] = None
    hardcover_cover_image_path: Optional[str] = None
    hardcover_cover_image_url: Optional[str] = None
    hardcover_cover_face_points: Optional[str] = None

class StoryTemplateOut(StoryTemplateBase):
    id: str
    page_count: int
    cover_image_path: Optional[str] = None
    cover_image_url: Optional[str] = None
    hardcover_cover_image_path: Optional[str] = None
    hardcover_cover_image_url: Optional[str] = None
    hardcover_cover_face_points: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    pages: Optional[List[StoryPageOut]] = []
    class Config:
        from_attributes = True

# Generated Asset Schemas
class GeneratedAssetOut(BaseModel):
    id: str
    job_id: str
    story_page_id: str
    page_number: int
    asset_version: int
    storage_path: str
    image_url: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    prompt_used: str
    story_text: Optional[str] = ""
    text_x: Optional[float] = 50.0
    text_y: Optional[float] = 89.5
    font_size: Optional[int] = 15
    font_family: Optional[str] = "Sans (DejaVu Bold)"
    font_color: Optional[str] = "#000000"
    has_background_box: Optional[bool] = True
    box_layout: Optional[str] = "banner"
    box_bg_color: Optional[str] = "#FAF4E6"
    box_border_color: Optional[str] = "#E8DEC8"
    box_border_width: Optional[int] = 1
    box_border_radius: Optional[int] = 16
    box_bg_opacity: Optional[float] = 0.90
    text_align: Optional[str] = "center"
    generation_status: str
    review_status: str
    cost_estimate: Optional[float] = None
    generation_time_sec: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class AssetReviewUpdate(BaseModel):
    review_status: str  # "approved", "rejected"
    comment: Optional[str] = None

# Personalization Job Schemas
class PersonalizationCreate(BaseModel):
    story_id: str
    child_name: str
    guardian_consent: bool
    outfit_mode: Optional[str] = "story"
    language: Optional[str] = "english"

class PersonalizationOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    story_id: str
    story_title: Optional[str] = "Storybook"
    story_slug: Optional[str] = ""
    child_name: str
    photo_path: str
    photo_url: Optional[str] = None
    outfit_mode: Optional[str] = "story"
    language: Optional[str] = "english"
    status: str
    current_stage: str
    total_pages: int
    completed_pages: int
    failed_pages: int
    retry_count: int
    error_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    pages_label: Optional[str] = "4 free"
    is_purchased: Optional[bool] = False
    is_paid: Optional[bool] = False
    paid_at: Optional[datetime] = None
    created_formatted: Optional[str] = None
    pdf_download_url: Optional[str] = None
    print_pdf_url: Optional[str] = None
    format_type: Optional[str] = "digital"
    cover_asset_path: Optional[str] = None
    cover_asset_url: Optional[str] = None
    cover_download_url: Optional[str] = None
    assets: Optional[List[GeneratedAssetOut]] = []
    class Config:
        from_attributes = True

# Book Schemas
class BookOut(BaseModel):
    id: str
    job_id: str
    book_type: str
    version: int
    pdf_storage_path: str
    pdf_download_url: Optional[str] = None
    page_count: int
    validation_status: str
    validation_details: str
    created_at: datetime
    class Config:
        from_attributes = True

# Provider Settings & POC Schemas
class AISettingsOut(BaseModel):
    active_story_provider: str
    active_image_provider: str
    active_model: str
    preview_page_limit: int
    max_retries: int
    concurrency_limit: int
    per_book_budget: float
    is_paid_enabled: bool
    hardware_acceleration: str = "CPU (No dedicated CUDA GPU detected)"
    class Config:
        from_attributes = True

class AISettingsUpdate(BaseModel):
    active_story_provider: Optional[str] = None
    active_image_provider: Optional[str] = None
    active_model: Optional[str] = None
    preview_page_limit: Optional[int] = None
    max_retries: Optional[int] = None
    concurrency_limit: Optional[int] = None
    per_book_budget: Optional[float] = None
    is_paid_enabled: Optional[bool] = None

# Order & Admin Dashboard Schemas
class OrderBase(BaseModel):
    order_number: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    book_id: Optional[str] = None
    job_id: Optional[str] = None
    format_type: str = "print_hardcover"
    amount: float = 1299.0
    currency: str = "INR"
    status: str = "Pending"
    payment_status: str = "paid"
    payment_intent_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_carrier: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None

class OrderCreate(OrderBase):
    pass

class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    shipping_carrier: Optional[str] = None
    tracking_url: Optional[str] = None

class OrderOut(OrderBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class DashboardStatsOut(BaseModel):
    revenue: float
    revenue_formatted: str
    currency_symbol: str
    currency: str
    paid_orders: int
    previews_created: int
    live_stories: int
    recent_orders: List[OrderOut]
    status_counts: Dict[str, int]


# Payment Gateway Schemas
class ValidateCouponRequest(BaseModel):
    code: str
    format_type: str = "digital"  # "digital" | "print_hardcover"

class ValidateCouponResponse(BaseModel):
    valid: bool
    code: str
    discount_percent: float
    original_amount: float
    discount_amount: float
    discounted_amount: float
    message: str

class CreatePaymentOrderRequest(BaseModel):
    job_id: str
    format_type: str = "digital"  # "digital" | "print_hardcover"
    shipping_address: Optional[Dict[str, Any]] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    coupon_code: Optional[str] = None
    language: Optional[str] = "english"
    is_gift_wrap: Optional[bool] = False

class CreatePaymentOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int  # in paise
    currency: str = "INR"
    razorpay_key: str
    amount_display: float
    format_type: str
    story_title: str
    child_name: str
    discount_amount: Optional[float] = 0.0
    coupon_code: Optional[str] = None
    original_amount: Optional[float] = None
    language_surcharge: Optional[float] = 0.0
    gift_wrap_fee: Optional[float] = 0.0
    is_gift_wrap: Optional[bool] = False

class VerifyPaymentRequest(BaseModel):
    job_id: str
    format_type: str = "digital"
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    shipping_address: Optional[Dict[str, Any]] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    coupon_code: Optional[str] = None
    language: Optional[str] = "english"
    is_gift_wrap: Optional[bool] = False

class VerifyPaymentResponse(BaseModel):
    success: bool
    order_number: str
    order_id: str
    job_id: str
    format_type: str
    amount: float
    status: str
    message: str

class PaymentTransactionOut(BaseModel):
    id: str
    order_id: Optional[str] = None
    job_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    status: str
    method: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    format_type: str = "digital"
    story_title: Optional[str] = None
    child_name: Optional[str] = None
    order_number: Optional[str] = None
    error_description: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Customer Feedback Schemas
class FeedbackCreate(BaseModel):
    name: str
    place: str
    rating: int = 5
    review_text: Optional[str] = None

class FeedbackBase(BaseModel):
    name: str
    place: str
    rating: int = 5
    review_text: Optional[str] = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: str = "pending"

class FeedbackUpdate(BaseModel):
    name: Optional[str] = None
    place: Optional[str] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    status: Optional[str] = None

class FeedbackStatusUpdate(BaseModel):
    status: str  # "approved", "rejected", "pending"

class FeedbackOut(BaseModel):
    id: str
    name: str
    place: str
    rating: int = 5
    review_text: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: str = "pending"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

