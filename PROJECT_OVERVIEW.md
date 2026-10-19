# 🏠 Noyo (Appzeto / DoorMeets) — Master Architecture & Project Knowledge Base

> **Platform Type:** Enterprise Multi-Tenant On-Demand Home & Field Services Template  
> **Target Market:** White-label B2B Software Template (comparable to Urban Company, TaskRabbit, Housejoy)  
> **Ecosystem:** Customer Portal, Vendor Management System, Field Worker App, Master Admin Governance Console, and Real-Time Dispatch Backend.

---

## 📋 Table of Contents
1. [Executive Summary & Business Model](#1-executive-summary--business-model)
2. [High-Level System Topology & Technology Stack](#2-high-level-system-topology--technology-stack)
3. [The 4 Ecosystem Personas & Portals](#3-the-4-ecosystem-personas--portals)
4. [Database & Domain Model Architecture (59 Models)](#4-database--domain-model-architecture-59-models)
5. [Core Algorithmic Engines & Real-Time Workflows](#5-core-algorithmic-engines--real-time-workflows)
   - [5.1 Wave-Based Geospatial Dispatch (`bookingScheduler.js`)](#51-wave-based-geospatial-dispatch)
   - [5.2 Real-Time Socket Architecture & Live GPS Tracking](#52-real-time-socket-architecture--live-gps-tracking)
   - [5.3 End-to-End Booking Lifecycle & State Machine](#53-end-to-end-booking-lifecycle--state-machine)
   - [5.4 Itemized Billing, Commission & Cash Settlement Engine](#54-itemized-billing-commission--cash-settlement-engine)
   - [5.5 Partner Onboarding, Verification & LMS Training Pipeline](#55-partner-onboarding-verification--lms-training-pipeline)
6. [Frontend Modular Monolith Structure](#6-frontend-modular-monolith-structure)
7. [API Route Catalog & Communication Protocols](#7-api-route-catalog--communication-protocols)
8. [White-Labeling, Customization & Re-Selling Roadmap](#8-white-labeling-customization--re-selling-roadmap)
9. [Configuration & Environment Reference](#9-configuration--environment-reference)

---

## 1. Executive Summary & Business Model

Noyo (Appzeto) is an end-to-end marketplace engine designed for companies offering on-demand localized services (cleaning, salon, appliance repair, plumbing, electrical, painting, scrap pickup, consulting). 

### How This Template Generates Revenue:
1. **Platform Commission on Services**: Retains an administrative percentage (typically 20% to 30%) on every booked service.
2. **Margin on Spare Parts / Consumables**: Retains up to 90% of markup on vendor-provided replacement parts and materials.
3. **Vendor Subscription Plans**: Fixed monthly/yearly membership tiers offering lower commission cuts or priority lead visibility (`SubscriptionPlan.js`).
4. **Convenience & Visiting Fees**: Base inspection fees and transportation tariffs charged to consumers.
5. **100% Tax/GST Retention**: Taxes are calculated and retained platform-side for statutory compliance, never disbursed to contractors.

---

## 2. High-Level System Topology & Technology Stack

```mermaid
graph TD
    subgraph Clients ["Client Applications (React 19 + Vite PWA)"]
        UserApp["👤 Customer Web/PWA (/user)"]
        VendorApp["🏪 Vendor Portal (/vendor)"]
        WorkerApp["👷 Field Worker App (/worker)"]
        AdminPanel["🛠️ Master Admin Console (/admin)"]
        FlutterMobile["📱 Flutter Mobile Codebase"]
    end

    subgraph API_Layer ["API & Communication Gateway"]
        ExpressGateway["Express.js Server (Port 5000)"]
        SocketServer["Socket.io Real-Time Engine (v4.8)"]
        FCMService["Firebase Cloud Messaging (Push Notifications)"]
    end

    subgraph Core_Engines ["Automation & Domain Engines"]
        WaveDispatch["Wave Dispatch Scheduler (bookingScheduler.js)"]
        LocationTracking["Live Geo Tracker & Redis Cache"]
        BillingEngine["VendorBill & Commission Engine"]
        PaymentEngine["Razorpay Webhook & Escrow Handler"]
        PDFGenerator["Invoice & GST Generator (invoiceService.js)"]
    end

    subgraph Persistence ["Persistence & External Cloud Services"]
        MongoDB[("MongoDB Atlas (59 Schemas)")]
        RedisDB[("Redis (Geospatial & Session Cache)")]
        CloudinaryCDN[("Cloudinary Media CDN")]
        RazorpayGateway[("Razorpay Payment Gateway")]
    end

    UserApp & VendorApp & WorkerApp & AdminPanel & FlutterMobile --> ExpressGateway
    UserApp & VendorApp & WorkerApp & AdminPanel <--> SocketServer
    ExpressGateway --> WaveDispatch & LocationTracking & BillingEngine & PaymentEngine & PDFGenerator
    WaveDispatch & LocationTracking <--> SocketServer
    WaveDispatch --> FCMService
    ExpressGateway --> MongoDB
    LocationTracking <--> RedisDB
    PaymentEngine <--> RazorpayGateway
    ExpressGateway --> CloudinaryCDN
```

### Full Technology Stack Table

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+), Express.js (v4.22) | HTTP REST API, webhook receivers, business logic |
| **Primary Database** | MongoDB (v6+), Mongoose (v8.20) | Document store, geospatial queries (`2dsphere`) |
| **In-Memory Cache** | Redis (v5+) | Live technician coordinates, token blacklisting, rapid session lookup |
| **Real-Time Layer** | Socket.io (v4.8) | Bi-directional private channel alerts, continuous live tracking |
| **Push Notifications** | Firebase Admin SDK (v13.6), Firebase Web Client (v12.7) | High-priority background alerts for bookings and jobs |
| **Payments & Escrow** | Razorpay Node SDK (v2.9) | Cards, UPI, Netbanking, automatic webhooks, refunds |
| **Media & Storage** | Cloudinary (v1.41), Multer | KYC identity proofs, service icons, training video hosting |
| **Frontend UI** | React (v19.2), Vite (v7.2), Tailwind CSS (v4.1) | Modular single-page app and progressive web application |
| **Navigation & State**| React Router (v7.10), Context API (`Cart`, `Socket`, `City`, `Theme`) | Client-side routing, global state hydration |
| **Visuals & Maps** | Framer Motion (v12), GSAP, Leaflet (v1.9), Google Maps API | Micro-interactions, route visualization, driver marker updates |
| **Documents & Email**| PDFKit, Nodemailer | Automated GST invoices, booking confirmation emails |

---

## 3. The 4 Ecosystem Personas & Portals

### 1. Customer Portal (`/user`)
* **Regional Discovery**: Automatic detection or manual selection of operating city with polygon boundary validation.
* **Service Browsing**: Nested categories, subcategories, dynamic pricing, and brand-specific options (e.g., AC Repair -> Daikin Split AC -> Gas refill).
* **Multi-Service Cart & Checkout**: Add multiple items across categories, apply promotional vouchers, and schedule date/time slots.
* **Live Interactive Tracking**: Watch the assigned technician approach on an interactive map.
* **Security Checkpoints**: Displays 4-digit **Start OTP** and **End OTP** to control the technician's job state transitions.

### 2. Vendor Partner Portal (`/vendor`)
* **Loud Audio Dispatch Alerts**: Full-screen modal with audible ringtone when a new wave booking lands nearby.
* **Job Delegation**: Solo vendors can execute jobs themselves; enterprise vendors can assign jobs to specific registered workers.
* **Digital Parts Catalog & Quotation**: On-site addition of extra spare parts or additional services via `VendorBill`.
* **Financial Ledger & Anti-Theft Guard**: Displays real-time earnings, withdrawal requests, and a **Cash Limit Modal** that freezes new orders if un-deposited cash-on-delivery exceeds the safety threshold.

### 3. Field Worker App (`/worker`)
* **Lightweight Mobile UI**: Designed specifically for low-end mobile devices and one-handed operation.
* **GPS Streamer**: Broadcasts current latitude, longitude, and heading every 2 seconds during transit.
* **Job Progress Stepper**: Transit -> Arrive at customer -> Enter Start OTP -> Log Parts -> Enter Completion OTP.
* **Cash Collection Reconciliation**: Records exact cash collected from customers on completion.

### 4. Master Administration Console (`/admin`)
* **Multi-City Operating Control**: Define cities, draw service coverage zones, set local taxes and currencies.
* **Catalog CMS & Dynamic Template Builder**: Configure custom form fields and steps for custom service verticals.
* **Manual Dispatch Dispatcher**: Real-time queue for `pending_admin` bookings where automated waves timed out without partner pickup.
* **Compliance & Safety**: SuperAdmin review of police verification documents, KYC Aadhaar/PAN, and emergency **SOS Alert** triggers.

---

## 4. Database & Domain Model Architecture (59 Models)

The backend database contains **59 schemas** divided into clear functional groups:

```
Backend/models/
├── Identity & Access
│   ├── Admin.js                     # Super Admin, City Admin, Finance Admin roles
│   ├── User.js                      # Customer profiles, addresses, loyalty points
│   ├── Vendor.js                    # Vendor profiles, KYC, approvalStatus, wallet
│   ├── Worker.js                    # Field worker profiles, parent vendor, live geo
│   └── CityAdminRequest.js          # Requests from regional managers
│
├── Regional Catalog & Dynamic CMS
│   ├── City.js                      # Multi-tenancy cities, polygon boundaries
│   ├── Category.js & SubCategory.js # Service taxonomy
│   ├── Service.js                   # Base prices, duration, inclusions/exclusions
│   ├── Brand.js                     # Appliance and product brand associations
│   ├── Profession.js                # Skill tags for partner categorization
│   ├── CategoryTemplate.js          # Dynamic schema definitions
│   ├── ServiceWorkflow.js & Step.js # Custom vertical workflow engines
│   ├── ServiceField.js              # Custom input fields per service
│   ├── HomeContent.js               # Dynamic mobile/web homepage banner CMS
│   └── OfferBanner.js               # Promotional marketing banners
│
├── Specialized Vertical Modules
│   ├── PaintBrand.js, PaintProduct.js, PaintingQuotation.js, LabourRate.js # Painting vertical
│   ├── Scrap.js                     # Scrap/recycling pickup vertical
│   └── ConsultantBooking.js & Bid.js# Custom quoting/bidding module
│
├── Order Execution & Dispatch
│   ├── Cart.js                      # Multi-item persistent user cart
│   ├── Booking.js                   # Central 750+ line transaction & state document
│   ├── BookingRequest.js            # Individual wave alerts sent to candidate vendors
│   └── BookingVisit.js              # Multi-visit tracking for extended jobs
│
├── Billing, Ledger & Payments
│   ├── VendorBill.js                # Single source of truth for extra parts/labor split
│   ├── Transaction.js               # Ledger entries for cash/online/wallet
│   ├── PlatformEarning.js           # Platform net revenue tracking
│   ├── Settlement.js                # Bulk vendor bank disbursement batches
│   ├── Withdrawal.js                # Individual vendor wallet payout requests
│   ├── Invoice.js                   # Automated sequential GST invoices
│   ├── PricingConfig.js & Rule.js   # Dynamic surge and distance tariffs
│   └── ServiceBrandPricing.js       # Brand-specific pricing differentials
│
├── Subscriptions & Monetization
│   ├── SubscriptionPlan.js & Plan.js# Vendor recurring membership plans
│   ├── SubscriptionTransaction.js   # Vendor plan renewal transactions
│   └── PromoCode.js & Voucher.js    # Customer discount codes and loyalty vouchers
│
├── Quality, Safety & LMS Training
│   ├── TrainingVideo.js             # Compulsory onboarding video lessons
│   ├── TrainingQuestion.js          # Dynamic randomized exam questions
│   ├── TrainingAttempt.js           # Partner exam results and tier score
│   ├── SOSAlert.js                  # Worker/customer emergency panic button
│   ├── Review.js                    # Star ratings, photo proofs, reviews
│   └── Ticket.js                    # Multi-party support tickets
│
└── Materials & Logistics
    ├── VendorPartsCatalog.js        # Approved spare parts inventory & base pricing
    └── StockRequest.js              # Hardware/material replenishment requests
```

---

## 5. Core Algorithmic Engines & Real-Time Workflows

### 5.1 Wave-Based Geospatial Dispatch (`bookingScheduler.js`)
Rather than broadcasting orders to every contractor simultaneously, the engine utilizes a **graduated wave dispatch**:

1. **Geospatial Ranking**: On checkout, MongoDB locates online, active, verified vendors within a default radius (e.g., 15 km) sorted by distance.
2. **Progressive Wave Waves**:
   * **Wave 1**: Dispatched immediately to **1 closest vendor** (Duration: 60s).
   * **Wave 2**: Dispatched to the **2nd closest vendor** if Wave 1 expires without acceptance.
   * **Wave 3**: Dispatched to the **3rd closest vendor**.
   * **Wave 4**: Dispatched to the next **2 vendors** concurrently.
   * **Wave 5**: Broadcast to all remaining active vendors in the zone.
3. **Fail-Safe Admin Escalation**:
   * If `MAX_SEARCH_TIME_MS` (5-10 minutes) expires with no acceptance, status updates to `pending_admin`.
   * Real-time socket event `admin_booking_requested` notifies the administrative dashboard for manual assignment.
4. **Performance & Concurrency Protection**:
   * Circuit breaker: Switches from 5s active poll to 30s idle poll when no searches are pending.
   * Atomic operations (`findOneAndUpdate` with status checks) prevent double-acceptance race conditions.

### 5.2 Real-Time Socket Architecture & Live GPS Tracking (`sockets/index.js`)
* **Role-Isolated Rooms**:
  * `user_<userId>` — Booking updates, bills, invoices.
  * `vendor_<vendorId>` & `all_vendors` — Priority order alerts with sound cues.
  * `worker_<workerId>` — Individual dispatch orders.
  * `admin_<adminId>` & `all_admins` — Platform-wide events, SOS emergencies.
  * `booking_<bookingId>` — Dedicated channel for real-time customer-technician location tracking.
* **Geospatial Stream Throttling**:
  * GPS coordinates are rate-limited to **1 update every 2 seconds per booking** in memory.
  * **Redis Buffer**: Last known position is cached in Redis with a **30-second TTL** for zero-latency reconnect recovery.
  * **Persistent DB**: Periodic updates to the contractor's `geoLocation` Point in MongoDB.

### 5.3 End-to-End Booking Lifecycle & State Machine

```
[DRAFT]
   │ (Customer checkout & payment selection)
   ▼
[SEARCHING] ◄────────────────────────────────────────┐
   │ (Wave dispatch timer)                           │
   ├───► [PENDING_ADMIN] (Admin manually re-assigns) ─┘
   ▼
[ASSIGNED / CONFIRMED]
   │ (Vendor delegates to worker)
   ▼
[WORKER_ASSIGNED]
   │ (Technician taps 'Start Transit')
   ▼
[ON_THE_WAY] ──► (Real-time GPS broadcast to customer map)
   │ (Technician reaches customer doorstep)
   ▼
[ARRIVED]
   │ (Customer discloses 4-digit START OTP)
   ▼
[IN_PROGRESS]
   │
   ├──► [EXTRA BILLING] (Technician logs spare parts in VendorBill)
   │         │
   │         ▼ (Customer reviews & approves digital bill on phone)
   │
   │ (Job finished; customer inspects work & discloses 4-digit END OTP)
   ▼
[COMPLETED]
   │ (Commission calculated, invoice generated, cash reconciled)
   ▼
[REVIEWED] ──► [*]
```

### 5.4 Itemized Billing, Commission & Cash Settlement Engine
The revenue split logic is governed strictly by [`VendorBill.js`](file:///d:/Noyo/Backend/models/VendorBill.js) and [`commissionService.js`](file:///d:/Noyo/Backend/services/commissionService.js):

$$\text{Vendor Service Earning} = \text{Total Service Base (excl. GST)} \times 70\%$$
$$\text{Vendor Parts Earning} = \text{Total Parts Base (excl. GST)} \times 10\%$$
$$\text{Platform Commission} = \text{Service Base} \times 30\% + \text{Parts Base} \times 90\% + 100\% \text{ of all GST}$$

* **Cash-on-Delivery (Pay at Home) Settlement**:
  * When a customer pays cash to the vendor/worker, the vendor holds the company's commission and tax.
  * The system creates a debit entry in the vendor's digital wallet for the platform's cut.
  * **Anti-Theft Ceiling**: If un-remitted cash exceeds `cashInHandLimit`, the vendor's account is temporarily frozen until settled through an online bank transfer or payment gateway.

### 5.5 Partner Onboarding, Verification & LMS Training Pipeline (`trainingController.js`)
To maintain platform service standards, contractors go through a 5-step automated qualification pipeline:
1. **Document Upload**: Aadhaar card, PAN card, bank passbook, and optional GSTIN.
2. **Police Verification**: Identity check managed via [`vendorPoliceVerificationController.js`](file:///d:/Noyo/Backend/controllers/vendorControllers/vendorPoliceVerificationController.js).
3. **Mandatory Video Training**: Multi-module instructional video course hosted on Cloudinary; playback tracked to prevent skipping.
4. **Automated MCQ Examination**:
   * Randomized test from `TrainingQuestion` schema.
   * **Score $\ge 80\%$**: Certified as **Tier L1** (Top priority dispatch, lower commission rates).
   * **Score $50\% - 79\%$**: Certified as **Tier L2** (Standard dispatch).
   * **Score $< 50\%$**: Fails exam; account frozen with a mandatory cooldown timer (e.g., 24 hours) before retake.

---

## 6. Frontend Modular Monolith Structure

```
Frontend/src/
├── App.jsx                      # App root, ThemeRouteManager, AudioContext unlocker
├── main.jsx                     # Vite mount point
├── index.css                    # Tailwind CSS v4 styling & color tokens
│
├── context/                     # Global State Providers
│   ├── SocketContext.jsx        # Socket.io connection, room joins, reconnect listeners
│   ├── CartContext.jsx          # Shopping cart persistence, add-on aggregations
│   ├── CityContext.jsx          # Current selected city & location bounds
│   └── ThemeContext.jsx         # Dark/light mode theme toggling
│
├── modules/
│   ├── user/                    # 👤 CUSTOMER PORTAL
│   │   ├── pages/               # Home, Category, Cart, Checkout, Tracking, Wallet
│   │   ├── components/          # LiveBookingCard, BidAlertModal, ReviewModal
│   │   └── routes/index.jsx     # /user/* subroutes
│   │
│   ├── vendor/                  # 🏪 VENDOR PORTAL
│   │   ├── pages/               # Dashboard, BookingAlerts, Workers, Earnings, Billing
│   │   ├── components/          # GlobalBookingAlert, CashLimitModal, BottomNav
│   │   └── routes/index.jsx     # /vendor/* subroutes
│   │
│   ├── worker/                  # 👷 FIELD WORKER PORTAL
│   │   ├── pages/               # AssignedJobs, JobMap, JobTimeline, Wallet
│   │   ├── components/          # GlobalWorkerJobAlert, OTPVerificationModal
│   │   └── routes/index.jsx     # /worker/* subroutes
│   │
│   ├── admin/                   # 🛠️ ADMIN MASTER CONSOLE
│   │   ├── pages/               # Cities, Categories, Bookings, SOS, Settlements
│   │   ├── components/          # AdminLayout, SuperAdminRoute, StatsWidget
│   │   └── routes/index.jsx     # /admin/* subroutes
│   │
│   └── landing/                 # 🌐 PUBLIC LANDING PAGE
│       └── pages/LandingPage.jsx# High-conversion marketing front
│
└── services/
    ├── api.js                   # Axios client with automatic JWT refresh interceptors
    ├── pushNotificationService.js # Firebase foreground/background push listeners
    └── razorpay.js              # Razorpay checkout script injector
```

---

## 7. API Route Catalog & Communication Protocols

All endpoints are prefixed with `/api`:

| Base URL | Controller Directory | Key Endpoints | Auth Guard |
| :--- | :--- | :--- | :--- |
| `/api/auth` | `controllers/publicControllers` | `/login`, `/send-otp`, `/verify-otp`, `/refresh-token` | Public |
| `/api/catalog` | `controllers/publicControllers` | `/cities`, `/categories`, `/services/:id`, `/search` | Public |
| `/api/users` | `controllers/userControllers` | `/profile`, `/addresses`, `/cart`, `/orders` | User JWT |
| `/api/bookings` | `controllers/bookingControllers` | `/create`, `/:id/cancel`, `/:id/track`, `/:id/verify-otp` | Multi-role JWT |
| `/api/vendors` | `controllers/vendorControllers` | `/jobs`, `/:id/accept`, `/workers`, `/billing`, `/withdraw` | Vendor JWT |
| `/api/workers` | `controllers/workerControllers` | `/assigned-jobs`, `/update-status`, `/verify-start-otp` | Worker JWT |
| `/api/admin` | `controllers/adminControllers` | `/analytics`, `/manual-assign`, `/settlements`, `/sos` | Admin JWT |
| `/api/payments` | `controllers/paymentControllers` | `/create-order`, `/verify`, `/razorpay-webhook` | Mixed/Webhook |

---

## 8. White-Labeling, Customization & Re-Selling Roadmap

When packaging and delivering this template to a new buyer or enterprise client, follow this setup checklist:

### Step 1: Branding & Identity Customization
* **Brand Assets**: Place the client's logo at [`Frontend/public/logo.png`](file:///d:/Noyo/Frontend/public/logo.png) and favicon at [`Frontend/public/favicon.ico`](file:///d:/Noyo/Frontend/public/favicon.ico).
* **Application Title**: Update `VITE_APP_NAME` in [`Frontend/.env`](file:///d:/Noyo/Frontend/.env) and `EMAIL_FROM` in [`Backend/.env`](file:///d:/Noyo/Backend/.env).
* **Color Palette**: Modify CSS color variables in [`Frontend/src/index.css`](file:///d:/Noyo/Frontend/src/index.css) to reflect client brand guidelines:
  * Customer Accent: default `#00a6a6` (Teal)
  * Vendor Accent: default `#347989` (Slate Teal)
  * Worker Accent: default `#3B82F6` (Electric Blue)

### Step 2: Third-Party Cloud Infrastructure Setup
1. **MongoDB Database**: Provision a MongoDB Atlas cluster; update `MONGODB_URI`.
2. **Redis In-Memory Store**: Provision an in-memory Redis instance (e.g., Upstash or Redis Cloud); set `REDIS_ENABLED=true` and provide host/port credentials.
3. **Razorpay Payment Gateway**: Replace `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with client production keys. Register `/api/payments/razorpay-webhook` in the Razorpay Dashboard.
4. **Firebase Cloud Messaging (FCM)**: Generate a new Service Account Key from Firebase Console and paste private key credentials into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
5. **Cloudinary Asset Storage**: Enter `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
6. **Google Maps API**: Enable Maps JavaScript API, Places API, and Geocoding API; add the key to `GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_API_KEY`.
7. **SMS Gateway**: Change `USE_DEFAULT_OTP=false` and configure real SMS delivery via Twilio or Fast2SMS in [`Backend/services/smsService.js`](file:///d:/Noyo/Backend/services/smsService.js).

### Step 3: Geographic & Catalog Configuration
1. Log into the Admin Console at `/admin/login`.
2. Navigate to **City Management** (`/admin/settings`) and create the client's operational cities along with polygon delivery boundaries.
3. Use the **Category & Dynamic Template Builder** (`/admin/user-categories`) to configure the client's specific service menu, task checklists, and base rates.
4. Configure global commission cuts and wave search durations under **Platform Settings**.

---

## 9. Configuration & Environment Reference

### Backend Configuration File (`Backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/noyo?retryWrites=true&w=majority

# JWT Credentials
JWT_SECRET=production-secret-must-be-long-and-random
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=production-refresh-secret-must-be-long-and-random
JWT_REFRESH_EXPIRE=30d

# Network & Rate Limits
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120

# Cloud Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx

# Push Notifications (Firebase Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# In-Memory Cache (Redis)
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# SMS & OTP
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
USE_DEFAULT_OTP=true

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Frontend Configuration File (`Frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=Appzeto
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

*Document compiled and verified against the active codebase.*
