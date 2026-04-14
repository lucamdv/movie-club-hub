

# Import Reviews from Other Apps (Letterboxd ZIP)

## Overview
Add an "Import Data" button to the profile page that allows users to upload a ZIP file (e.g., from Letterboxd) containing CSV data. The system will parse the CSVs, match movies to TMDB IDs via search, and import ratings, reviews, and watchlist entries.

## How It Works

1. User clicks "Importar Dados" button on their profile
2. A modal opens with instructions and a file upload area
3. User selects a `.zip` file exported from Letterboxd (or similar apps)
4. The system:
   - Extracts CSV files from the ZIP (using JSZip in the browser)
   - Parses `ratings.csv`, `reviews.csv`, `watchlist.csv`, and `diary.csv`
   - For each movie, searches TMDB by title + year to find the `tmdb_id`
   - Upserts ratings and watchlist entries into the database
5. Shows a progress bar and summary of imported items

## Technical Details

### Dependencies
- **JSZip** (npm) -- to extract ZIP files client-side
- **PapaParse** (npm) -- to parse CSV files

### Letterboxd CSV Format
- `ratings.csv`: Date, Name, Year, Letterboxd URI, Rating (1-5 scale, 0.5 increments)
- `reviews.csv`: Date, Name, Year, Letterboxd URI, Rating, Review
- `watchlist.csv`: Date, Name, Year, Letterboxd URI
- `diary.csv`: Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags

### New Code in `MovieClubApp.tsx`

1. **ImportDataModal component**:
   - File picker accepting `.zip`
   - Progress UI showing: total movies found, matched, imported, failed
   - Uses JSZip to read the zip, PapaParse to parse CSVs
   - Merges `ratings.csv` + `reviews.csv` + `diary.csv` into a unified list (deduped by Name+Year, preferring the one with a review)
   - For each movie, calls `tmdbProxy` to search `/search/movie?query={name}&year={year}` to get `tmdb_id` and `poster_path`
   - Batches upserts to the `ratings` and `watchlist` tables via Supabase client
   - Converts Letterboxd 1-5 scale directly (same scale as our app)

2. **Profile page button**: Add "Importar Dados" button next to "Editar Perfil" (only on own profile)

3. **Rate limiting**: Process movies in batches of 5 with small delays to avoid TMDB rate limits

### Files Changed
- `src/components/MovieClubApp.tsx` -- add ImportDataModal component and button in ProfilePage

### Packages to Install
- `jszip`
- `papaparse` + `@types/papaparse`

