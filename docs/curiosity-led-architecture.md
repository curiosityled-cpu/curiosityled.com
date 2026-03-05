# Curiosity Led — Platform Architecture

## Platform Stack

Frontend
- Next.js (Vercel)

Backend
- Supabase (Postgres + Auth + RLS)

Auth
- Supabase Auth
- Future: SSO (SAML / Azure / Okta)

Database
- Postgres with RLS
- Multi-tenant via org → memberships

AI Layer
- OpenAI / LLM integrations

Infrastructure
- Vercel deployment
- Supabase managed Postgres


---

# Tenancy Model

User → Profile → Membership → Org

auth.users
    ↓
profiles
    ↓
memberships
    ↓
orgs

All domain tables reference:

org_id


---

# Role System

Base Roles

Platform Administrator  
Super Administrator  
Partner Business Administrator  
HR Administrator  
Program Administrator  
Analyst  
Team Leader  
User  
Guest


Custom roles supported via:

custom_roles  
membership_custom_roles  
membership_permission_grants


---

# Core Domain Engines

## 1. Competency Engine
competencies

## 2. Program Engine
programs  
program_competencies  
cohorts  

## 3. Learning Engine
learning_resources  
assigned_learning  

## 4. Performance Engine
development_requests  
request_approval_steps  

## 5. Assessment Engine
custom_assessments  
assessment_submissions


---

# Workflow Enforcement

All status transitions handled by RPC functions.

Example:

transition_development_request()

Benefits:

• prevents illegal state transitions  
• ensures audit logging  
• ensures permission validation


---

# Audit Logging

activity_log

Captures:

actor  
entity  
action  
details  
timestamp


---

# Notifications

notifications

Channels:

email  
webhooks  
slack  


---

# Future Platform Layers

Partner ecosystem  
White labeling  
Branding engine  
AI coaching layer  
Analytics dashboards