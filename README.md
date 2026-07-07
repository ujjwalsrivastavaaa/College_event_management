# College Event & Club Management System

A comprehensive, full-stack application for managing college clubs, events, and student attendance. Built with the MERN stack (MongoDB, Express.js, React, Node.js) and styled with Tailwind CSS.

## Website Link - https://college-event-management-n8xh-81xf3z8ox-ujjwal44.vercel.app/admin

## 🌟 Key Features

### 1. Role-Based Access Control
- **Admin**: Has full system control. Can manage all clubs, events, users, and system-wide settings.
- **Club Head**: Can create/manage events for their specific club, generate attendance QR codes, download attendance reports, and manage club members.
- **Student**: Can browse events, register for upcoming seminars/workshops, check in via OTP/QR, and download generated certificates.

### 2. Event & Registration Management
- Create detailed events with dates, venues, participant limits, and rich descriptions.
- Students can seamlessly register or cancel their registration.
- Prevents overbooking by enforcing `maxParticipants` limits.

### 3. Advanced Attendance & Check-In System
- **Secure OTP Check-in**: A rotating 6-digit OTP code is generated on the Club Head's dashboard (refreshes every 60 seconds). Students enter this code on their phones to mark attendance, preventing remote check-in fraud.
- **Dynamic QR Code Scanning**: As an alternative, students can scan a rotating QR code using their device camera.
- **Manual Check-in**: Club heads can manually check in students via email address if their devices fail.

### 4. Automated Certificate Generation
- Once a student's attendance is verified, a personalized PDF certificate is generated automatically.
- Certificates are securely stored and tracked.
- Students can download their certificates anytime from the "My Credentials" dashboard tab.

### 5. Reporting & Analytics
- Live dashboard metrics showing total clubs, active events, and recent registrations.
- Detailed attendance reports available for every event.
- **Excel/CSV Export**: Club heads can download full attendance rosters (including check-in times and certificate status) directly to Excel (`.xlsx`) or CSV formats.

## 🛠️ Technology Stack

**Frontend**
- React.js (Vite)
- Tailwind CSS (Styling)
- Lucide React (Icons)
- HTML5-QRCode (Camera scanning)
- React Router DOM (Routing)

**Backend**
- Node.js & Express.js
- MongoDB (Atlas Cloud) & Mongoose
- JSON Web Tokens (JWT) for secure authentication
- ExcelJS (Excel report generation)
- PDFKit (Certificate generation)
- QRCode (QR payload generation)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas account (or local MongoDB installation)

### 1. Clone the repository and install dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `server` directory:
```env
PORT=5000

# To bypass strict network DNS blocking, use the standard connection string instead of +srv
MONGO_URI=mongodb://<username>:<password>@<cluster-url>:27017/college-event-db?ssl=true&authSource=admin&replicaSet=<replica-set>&retryWrites=true&w=majority

JWT_SECRET=your_super_secret_jwt_key
FRONTEND_URL=http://localhost:5173

# Optional integrations
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
```

### 3. Running the Application
Open two terminal windows.

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
```
*Note: On first run, a default admin account will automatically be seeded into the database.*
- **Email:** `admin@college.edu`
- **Password:** `admin123`

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```

The application will be available at `http://localhost:5173`.

## 📱 Testing the OTP Attendance System Locally
1. Login as a **Club Head** on your computer.
2. Navigate to **Manage Events**, click an event, and leave the Check-in Console open to view the live 6-digit OTP.
3. On a different browser (or Incognito mode), login as a **Student** account.
4. Navigate to the **Verify Attendance** tab.
5. Select the event from the dropdown, enter the 6-digit OTP shown on the Club Head screen, and click verify.
6. The student's attendance is instantly marked, and their certificate becomes available.

## 🛡️ Security Features
- **Network Resiliency**: The database configuration includes a fallback to an in-memory database (`mongodb-memory-server`) if the primary MongoDB connection fails.
- **Time-Windowed Tokens**: QR codes and OTPs use strict server-side validation with narrow expiry windows.
- **Data Sanitization**: Prevents NoSQL injection attacks using `express-mongo-sanitize`.

---
*Developed for modern college administration and student engagement.*
