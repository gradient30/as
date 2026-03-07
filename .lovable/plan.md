

## Knowledge Base App — Implementation Plan

### Overview
A minimalist, modern knowledge base where anyone can anonymously submit knowledge entries. The system auto-categorizes them using keyword matching, handles smart merging of similar content, and displays everything in a clean card grid on the homepage.

### Backend (Lovable Cloud / Supabase)

**Database tables:**
- **categories** — auto-generated categories (name, slug, created_by token)
- **entries** — knowledge entries (title, content, category_id, author_token, status, created_at)
- **entry_merges** — merge history log
- **category_admins** — tracks founder + category managers with permissions (auto_merge on/off, review required)

**How identity works:** Each anonymous user gets a unique browser token (stored in localStorage). The first person to submit in a category becomes its "founder" and admin, identified by their token.

### Pages & Features

**1. Homepage (Browse)**
- Header with app title + "Submit Knowledge" button
- Category filter tabs/chips at the top
- Card grid showing all approved entries, sorted by newest
- Each card shows: title, content preview, category badge, timestamp
- Click card → full entry detail view

**2. Submit Knowledge (Modal/Page)**
- Simple form: Title + Content (rich text or plain)
- On submit: system extracts keywords, matches to existing categories or creates new one
- Similarity check against existing entries in the same category:
  - **High similarity** → auto-merge (append/update) if category admin allows, otherwise queue for review
  - **Same category, different topic** → create new entry
  - **No matching category** → create new category, submitter becomes founder

**3. Category Detail Page**
- All entries in that category
- Shows category founder badge
- Admin panel (visible to founder/admins only, validated by browser token):
  - Toggle auto-merge on/off
  - Review pending submissions
  - CRUD operations on entries (edit, delete, merge manually)
  - Approve/reject queued merges

### Smart Categorization & Merging Logic
- Keyword extraction from title + content
- Match against existing category keywords (TF-IDF-like scoring using simple word overlap)
- Similarity threshold: >70% word overlap in same category → merge candidate
- Merge = append new content to existing entry with update timestamp + contributor credit
- All merging rules enforced server-side via edge functions

### Design
- Clean white background, minimal borders
- Card grid with subtle shadows and category color badges
- Responsive: 3 columns desktop, 2 tablet, 1 mobile
- Smooth animations for card entry and modal transitions

