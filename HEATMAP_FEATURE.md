# Heatmap Generation Feature

## Overview

The enhanced heatmap feature provides a **weather-forecast-style visualization** of sexual violence case reports across the NCR (National Capital Region). The visualization uses color gradients to indicate case density:

- 🔴 **Red** = High density (≥70% of max cases)
- 🟠 **Orange** = Medium-high density (50-70%)
- 🟡 **Yellow** = Medium density (30-50%)
- 🟢 **Green** = Low density (15-30%)
- 🔵 **Light Blue** = Minimal/no cases

## Features

### Geographic Filtering
Users can filter reports by:
- **Region** (Eastern Zone, Western Zone, Central Zone, Southern Zone)
- **City** (20+ NCR cities and municipalities)
- **Council** (Council I through Council V)

### Aggregation Levels
Toggle between viewing data aggregated by:
- **City** - Individual city/municipality level (default)
- **Region** - Metro Manila zones
- **Council** - Administrative councils

### Interactive Map
- **Click on locations** to see case count details
- **Color-coded circles** represent density with size proportional to case count
- **Heatmap legend** displayed for easy interpretation

### Statistics Dashboard
Displays:
- Total reports matching current filters
- Number of locations with cases
- Highest density value
- Current aggregation level

### Smart Filtering
Combine multiple filters:
- Select a region to automatically filter the city dropdown
- Mix geographic filters with case status and verification status
- Reset all filters with one click

## API Endpoints

### New Endpoint: `/api/case_reports/heatmap/data`

**Method:** GET

**Query Parameters:**
```
- aggregation: 'city' | 'region' | 'council' (default: 'city')
- city: string (NCR city name)
- region: string (region key)
- council: string (council name)
- status: string (case status)
- verification: 'verified' | 'unverified'
```

**Response:**
```json
{
  "data": [
    {
      "name": "City Name",
      "region": "Region Name",
      "council": "Council I",
      "type": "city",
      "coordinates": { "lng": 121.0, "lat": 14.5 },
      "density": 5,
      "intensity": 0.1
    }
  ],
  "filters": { ... },
  "totalReports": 25,
  "aggregation": "city"
}
```

## Backend Implementation

### New Files:
1. **`src/config/ncr-geography.js`** - NCR geographic data structure with all cities, regions, and councils
2. **`src/services/heatmap.service.js`** - Density calculation and data aggregation logic

### Updated Files:
1. **`src/controllers/case_reports.controller.js`** - Added `getHeatmapData` function
2. **`src/routes/case_reports.routes.js`** - Added `/heatmap/data` endpoint

## Frontend Implementation

### New Files:
1. **`src/lib/ncrGeography.js`** - Frontend NCR geographic data and utility functions

### Updated Files:
1. **`src/app/heatmap/page.js`** - Complete rewrite with:
   - Enhanced filter UI (region, city, council)
   - Mapbox heatmap layer visualization
   - Real-time data fetching
   - Weather-style color gradients
   - Interactive map with popups

## Geographic Data Structure

### NCR Regions (4 zones):
- **Eastern Zone**: Marikina, Pasig, Cainta, Taytay, Rizal
- **Western Zone**: Manila, Quezon City, Valenzuela, Malabon, Navotas, Caloocan
- **Central Zone**: Makati, Pasay, San Juan, Mandaluyong, Taguig
- **Southern Zone**: Las Piñas, Parañaque, Muntinlupa, Bacoor, Cavite City

### Administrative Councils (5 councils):
- Council I
- Council II
- Council III
- Council IV
- Council V

## Technical Details

### Density Calculation
- Intensity = min(case_count / 50, 1)
- Values normalized to 0-1 for color mapping
- Higher intensity = darker red

### Map Rendering
- Mapbox GL JS v3.6.0
- GeoJSON features with dynamic styling
- Circle radius scaled by case count
- Interactive popups on click
- Cursor feedback

### Performance
- Real-time filtering without page reload
- Efficient data aggregation on backend
- Client-side map updates
- Responsive breakdowns

## Usage Example

### Viewing High-Risk Areas:
1. Navigate to the Heatmap page
2. Leave all filters blank to see all NCR reports
3. Red circles indicate areas with highest case concentration
4. Click on locations to see exact counts

### Filtering by Region:
1. Select "Western Zone" from Region dropdown
2. Map updates to show only Western Zone cities
3. Automatically filters the City dropdown

### Aggregating by Council:
1. Change aggregation to "Council"
2. Map shows 5 council circles
3. Use Council filter for specific administrative areas

## Dependencies

### Backend:
- Supabase (database)
- Express.js (routing)

### Frontend:
- React/Next.js
- Mapbox GL JS (map rendering)
- React Hooks (state management)

## Notes

- Geographic coordinates are accurate for NCR cities
- Case density is calculated from `incident_city` in reports
- Filter logic matches case status and verification status
- Color gradients are weather-forecast inspired
- Mobile responsive design with touch support
