# SPRINT EXECUTION: SUPABASE STORAGE ARCHITECTURE PLAN ☁️📂

**Context:** Establishing a strict, semantic folder structure inside Supabase Storage before building the `GalleryImage` database table. This ensures images are organized by Pages, Components, and specific Units, preventing a monolithic and disorganized bucket structure.

## 1. The Bucket Structure
All assets will be stored inside the `properties/` bucket, strictly namespaced by the tenant's `slug`. Within a tenant's folder, assets are categorized semantically based on where they appear in the UI.

**Proposed Directory Tree:**
```text
properties/
└── {slug}/
    ├── pages/
    │   └── home/
    │       ├── hero/           (Main hero cover images/videos)
    │       ├── story/          (Images for the story/about section)
    │       └── facilities/     (General resort facilities)
    └── units/
        ├── {unit_id}/          (Images specific to a unit e.g., unit-aleph-id)
        │   ├── gallery/        (Images for the Bento Box gallery)
        │   └── cover/          (Main thumbnail/cover image)
```

## 2. Backend API Updates Required
Currently, the upload endpoints might be hardcoding destinations or missing contextual routing. The upload endpoint (e.g., `POST /units/{unit_id}/images` or a new generic `POST /api/v1/admin/upload`) needs to be refactored.

**Required Changes:**
- The upload API must accept a query parameter or form field such as `folder_path` or `category` from the frontend (e.g., `pages/home/hero` or `units/{unit_id}/gallery`).
- The Python backend will dynamically construct the final Supabase Storage path: `properties/{slug}/{folder_path}/{filename}`.
- The backend will upload the file to this exact path and return the generated public URL to the frontend.

## 3. Frontend Upload UI Update
The Dropzone component in the Admin Dashboard (whether inside `UnitFormModal` or a new global Media Manager) must inform the backend about the intended destination of the file.

**Required Changes:**
- Introduce a dropdown, or utilize contextual props, in the upload UI to let the Admin select *where* this image belongs (e.g., "Upload to: Home Hero", "Upload to: Facilities", or "Upload to: Unit Gallery").
- The selected context will be appended to the API request payload as the `folder_path` parameter, ensuring the file routes to the correct semantic folder in Supabase.

## 4. Relation to Future DB Table
The Supabase Storage bucket handles the *physical* organization of the files. The future `GalleryImage` database table will handle the *logical* organization and metadata for presentation.

**How they connect:**
- When an image is successfully uploaded to its semantic folder (e.g., `properties/smar/units/unit-aleph-id/gallery/img1.jpg`), the backend returns its `public_url`.
- The `GalleryImage` DB table will store this `public_url` alongside UI-specific metadata (e.g., `caption_ar`, `caption_en`, `sort_order`, `span_size`, and a relation to the `Unit` or `Client`).
- This architecture guarantees that the Storage bucket remains clean, browseable, and logically grouped, while the database efficiently acts as a metadata layer and pointer for the React frontend.
