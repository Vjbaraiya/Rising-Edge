# Prompt: Build a Role-Based Authentication & Subscription Management System

Create a production-ready authentication and authorization system for an Electronics Hardware Training Platform called **Rising Edge**.

The system must support **Role-Based Access Control (RBAC)** combined with **Subscription-Based Access Control**.

The architecture should be scalable, secure, and easy to extend.

---

# User Roles

## 1. User

A normal customer who can purchase trainings and access learning materials.

Permissions:

* Register
* Login
* Logout
* Forgot Password
* Email Verification
* Update Profile
* Change Password
* Browse all trainings
* Search trainings
* Enroll in trainings
* Purchase trainings
* View purchased trainings
* Continue learning
* View progress
* Download certificates (if eligible)
* View payment history
* Manage profile

Each User has one subscription plan.

---

## User Subscription Plans

### Basic

Access:

* Free trainings
* Beginner learning materials
* Community access
* Limited AI assistance
* Basic profile dashboard

Restrictions:

* Cannot access premium trainings
* Cannot use advanced review tools
* Limited downloads

---

### Advanced

Everything in Basic plus:

* Paid trainings
* Intermediate learning content
* Training assessments
* Progress analytics
* More AI usage
* Download learning resources
* Priority email support

---

### Premium

Everything in Advanced plus:

* Unlimited training access
* All premium content
* PCB Design Review Tools
* Schematic Review Tools
* AI Design Assistant
* Unlimited downloads
* Premium certificates
* Consultancy discounts
* Priority support
* Early access to new trainings

---

# 2. Admin

Admins manage the platform but cannot modify core system configuration.

Permissions:

## Training Management

* Create training
* Edit training
* Archive training
* Publish training
* Upload videos
* Upload PDFs
* Upload assignments
* Manage quizzes

## Student Management

* View users
* View enrollments
* View payments
* Track progress
* Issue certificates

## Content Management

* Blogs
* Resources
* Case Studies
* Categories

## Reports

* Revenue reports
* Enrollment reports
* Completion reports

Restrictions:

* Cannot create Super Admins
* Cannot change platform settings
* Cannot modify user roles beyond assigned permissions

---

# 3. Super Admin

Has complete platform control.

Permissions:

## User Management

* Create Admins
* Edit Admins
* Delete Admins
* Suspend users
* Activate users
* Change user roles

## Subscription Management

* Create plans
* Edit plans
* Delete plans
* Set pricing
* Configure plan features

## Platform Settings

* Branding
* Themes
* Navigation
* Homepage
* Email templates
* Payment gateway settings
* Security settings
* SEO
* Notifications

## Financial

* View all payments
* Refund payments
* Configure taxes
* Export reports

## Integrations

* Cashfree
* Email provider
* Analytics
* Storage
* AI providers

## System

* Audit logs
* Activity logs
* Backup
* Restore
* Feature flags
* API keys
* Environment configuration

---

# Authentication Requirements

Implement:

* Secure Registration
* JWT Authentication
* Refresh Tokens
* Password Hashing (bcrypt/Argon2)
* CSRF Protection
* XSS Protection
* SQL Injection Protection
* Rate Limiting
* Secure Cookies
* Session Expiration
* Email Verification
* Password Reset
* Multi-factor Authentication (optional)
* Device Login History

---

# Authorization

Implement middleware for:

Role checks

Example:

```
requireRole("Admin")
```

Subscription checks

Example:

```
requireSubscription("Premium")
```

Combined access

Example:

```
Premium User
AND
Enrolled in Training
```

---

# Training Enrollment Logic

Users can browse all trainings.

Only enrolled users can access course content.

Enrollment requires:

* Successful Cashfree payment
* Payment verification
* Enrollment record creation
* Access grant

If payment fails:

* No enrollment
* No content access

---

# Database Design

Create normalized tables for:

Users

* id
* full_name
* email
* password_hash
* role
* subscription_plan
* status
* created_at
* updated_at

Subscriptions

* id
* name
* price
* billing_cycle
* features

Trainings

* id
* title
* description
* level
* category
* instructor
* price
* thumbnail
* published

Enrollments

* id
* user_id
* training_id
* payment_id
* enrolled_at
* expires_at
* progress

Payments

* id
* user_id
* amount
* gateway
* order_id
* transaction_id
* status
* paid_at

Certificates

* id
* user_id
* training_id
* certificate_url
* issued_at

Progress

* lesson completion
* quiz scores
* overall percentage
* last viewed

Audit Logs

* user
* action
* IP
* device
* timestamp

---

# Login Flow

1. User enters email/password.
2. Validate credentials.
3. Verify email.
4. Check account status.
5. Generate JWT and refresh token.
6. Load role and subscription.
7. Redirect based on role:

User → My Learning Dashboard

Admin → Admin Dashboard

Super Admin → Platform Dashboard

---

# Route Protection

Examples:

```
/dashboard
```

Authenticated users only.

```
/premium-tools
```

Premium subscription only.

```
/admin
```

Admin and Super Admin only.

```
/system
```

Super Admin only.

---

# UI Requirements

Create modern responsive pages for:

Authentication

* Login
* Register
* Forgot Password
* Reset Password
* Verify Email

User Dashboard

* My Learning
* Progress
* Certificates
* Subscription
* Payments
* Profile

Admin Dashboard

* Trainings
* Users
* Payments
* Reports
* Resources

Super Admin Dashboard

* User Management
* Subscription Management
* Platform Settings
* Analytics
* Audit Logs

---

# Error Handling

Support:

* Invalid login
* Expired session
* Unauthorized access
* Forbidden access
* Expired subscription
* Failed payment
* Duplicate email
* Weak password
* Invalid reset token

Provide clear, user-friendly error messages.

---

# Security Best Practices

* Principle of least privilege
* RBAC middleware
* Subscription validation middleware
* Secure API endpoints
* Input validation
* Audit logging
* Password complexity enforcement
* Email verification before access
* HTTPS-only cookies
* Refresh token rotation

---

# Deliverables

Generate:

1. Complete authentication architecture
2. Database schema and ER diagram
3. API endpoints
4. Middleware structure
5. Route protection logic
6. Folder structure
7. UI wireframes for all authentication screens
8. Dashboard navigation by role
9. Subscription enforcement logic
10. Sequence diagrams for login, enrollment, payment, and authorization
11. Recommended technology stack (React/Next.js, Node.js/Express, PostgreSQL/Neon, Prisma, JWT, Cashfree)
12. Sample code for authentication, authorization, subscription middleware, and protected routes following clean architecture and industry best practices.
