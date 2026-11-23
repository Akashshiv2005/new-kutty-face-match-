# 🦄 KuttyStory — Personalized AI Children's Storybook Platform

KuttyStory is an AI-powered storybook platform that turns children into the illustrated heroes of personalized, archival picture books. Parents upload a child's photo, select an heirloom story, and the AI engine personalizes story illustrations while preserving the original artistic style, narrative, poses, and outfits.

---

## ✨ Key Features

- **Child Likeness Personalization**: High-resolution face and body fusion powered by Magic Hour API (`flux-2-klein` & AI Image Editor).
- **Interactive 3D Book Preview**: Parents flip through watermarked spread previews directly in the browser before purchasing.
- **Secure Payment & Print PDF Generation**: Integrated with Razorpay; upon payment verification, ReportLab deterministically renders a print-ready 8×8 mm ,300 DPI vector PDF.
- **Cloud Object Storage (MinIO)**: All story templates, child reference photos, and final print PDFs are securely stored and streamed via MinIO (S3-compatible).
- **Multi-Language Support**: Seamless story translation and typography rendering across English, Tamil, and other regional languages.
- **Admin Dashboard**: Comprehensive order tracking, story page editor, AI settings panel, and instant print file download.

---

## 🛠️ Architecture & Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, HTML5 Flipbook |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy, Alembic, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL |
| **Object Storage** | MinIO (S3-compatible) for asset plates, uploads, and PDFs |
| **AI Personalization** | Magic Hour API (Face Swap Photo & AI Image Editor), Local OpenCV fusion fallback |
| **Document Engine** | PyMuPDF (`fitz`) for asset ingestion, ReportLab for print-ready PDF composition |
| **Payments** | Razorpay (HMAC SHA-256 server-side signature verification) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python** 3.11 or higher
- **Node.js** 18+ and **npm**
- **PostgreSQL** database running locally or in cloud
- **MinIO** server (local standalone or Docker)

---

### Step 1: MinIO Storage Setup

KuttyStory stores all story pages, uploaded photos, and print-ready PDFs in MinIO.

#### Option A: Run MinIO with Docker (Recommended)
```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name kuttystory-minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

#### Option B: Run Standalone MinIO (Windows / macOS / Linux)
1. Download the MinIO binary from [MinIO Docs](https://min.io/download).
2. Start the server:
   ```bash
   minio server C:\minio-data --console-address ":9001"
   ```

* **MinIO API Endpoint**: `http://127.0.0.1:9000`
* **MinIO Web Console**: `http://127.0.0.1:9001` (User: `minioadmin`, Password: `minioadmin`)
* **Bucket**: The application automatically creates the `kuttystory` bucket on startup if it does not already exist.

---

### Step 2: Backend Setup

```bash
cd backend

# 1. Create and activate a Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL database URL, MinIO credentials, and Magic Hour API key

# 4. Run database migrations
alembic upgrade head

# 5. Seed initial admin user and story catalog
python seed.py

# 6. (Optional) Sync sample story assets into MinIO
python sync_to_minio.py

# 7. Start FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

- **Backend API**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Health Check Endpoint**: `http://127.0.0.1:8000/api/v1/health`

---

### Step 3: Frontend Setup

```bash
cd frontend

# 1. Install npm packages
npm install

# 2. Start Vite development server
npm run dev
```

- **Web Application**: `http://localhost:5173`
- The frontend proxies `/api` calls directly to the FastAPI backend running at `http://127.0.0.1:8000`.

---

## ⚙️ Configuration Reference

### Backend (`backend/.env`)

```ini
# Application Environment
APP_ENV=development
SECRET_KEY=your_secret_key_here

# PostgreSQL Database
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/kuttystory

# MinIO Object Storage
STORAGE_BACKEND=minio
MINIO_ENDPOINT=127.0.0.1:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kuttystory
MINIO_SECURE=false

# Magic Hour AI Engine
MAGIC_HOUR_API_KEY=mhk_live_your_key_here
MAGIC_HOUR_SWAP_MODE=face_swap
MAGIC_HOUR_RESOLUTION=1024px
MAGIC_HOUR_MAX_CONCURRENCY=3

# Razorpay Payments (Live / Test)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# CORS Allowed Origins
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend (`frontend/.env`)

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🗂️ Application Routes

### Customer Experience
| Route | Description |
| :--- | :--- |
| `/` | Homepage showcasing featured stories and hardcover editions |
| `/stories` | Catalog of available personalized storybooks |
| `/personalize/:slug` | Interactive personalization wizard, photo upload & live flipbook preview |
| `/how-it-works` | Atelier print process, binding details, and safety standards |
| `/about` | Our atelier mission and storybook heritage |
| `/privacy` | Strict child privacy charter and data protection policies |
| `/terms` | Terms of service and order fulfillment terms |

### Admin Experience
| Route | Description |
| :--- | :--- |
| `/admin_login` | Secure administrative authentication |
| `/admin_dashboard` | Orders, job progress, story templates, asset inspector & PDF downloads |

---

## 🔒 Child Privacy & Security Charter

1. **Explicit Guardian Consent**: Child photos are processed strictly upon explicit parental confirmation.
2. **Encrypted Storage**: Reference photos and personalized page plates are stored in isolated MinIO buckets and served via authenticated streaming endpoints.
3. **No Model Training**: Customer photos are never used to train public or foundation AI models.
4. **Secure Payment Gateways**: PDF downloads strictly require cryptographic HMAC-verified payment status (`is_paid == True`) or authenticated administrator session tokens.

---

## 📄 License

Proprietary © KuttyStory. All rights reserved.
