# Cache Directory

This directory contains auto-generated cache files for earthquake data.

## Files Generated:
- `magnitude-5-plus.json` - Earthquakes with magnitude 5.0 and above
- `magnitude-6-plus.json` - Earthquakes with magnitude 6.0 and above  
- `magnitude-4-to-5.json` - Earthquakes with magnitude between 4.0-5.0
- `recent-large-earthquakes.json` - Recent large earthquakes (5.0+ in last 30 days)
- `stats-summary.json` - Overall database statistics

## Automated Updates:
- Generated every 6 hours via GitHub Actions
- Manual generation available via workflow dispatch
- Files are automatically committed back to repository

## Usage:
These files are served statically via GitHub Pages CDN for fast access to popular earthquake data queries.