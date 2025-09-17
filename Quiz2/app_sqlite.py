"""
Earthquake Data Analysis Web Application - SQLite Version (FREE)
Student: Benjamin Niccum
Course: Cloud Computing and Big Data
Assignment: Quiz 2 - Earthquake Data Investigation
Date: September 10, 2025

Description:
This Flask web application provides a cloud-based interface for analyzing
earthquake data from USGS using SQLite Database (FREE alternative to Azure SQL).

Features:
- Search earthquakes by magnitude (greater than, ranges)
- Find earthquakes near specific geographic locations
- Analyze temporal patterns (day vs night occurrence)
- Handle missing/anomalous data gracefully

Database:
- SQLite database (serverless, file-based)
- Works on Azure App Service for FREE
- Meets all SQL assignment requirements
- No ongoing costs!
"""

from flask import Flask, jsonify, render_template, request
import os
import math
import sqlite3
from datetime import datetime

app = Flask(__name__)

# Database file path
DB_PATH = os.path.join(os.path.dirname(__file__), 'earthquakes.db')

def get_db_connection():
    """Create database connection to SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

def init_database():
    """Create earthquakes table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create earthquakes table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS earthquakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            time TEXT,
            latitude REAL,
            longitude REAL,
            depth REAL,
            magnitude REAL,
            magType TEXT,
            place TEXT,
            type TEXT,
            net TEXT,
            earthquake_id TEXT,
            updated TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        cursor.execute(create_table_sql)
        
        # Create indexes for better performance
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_magnitude ON earthquakes(magnitude);",
            "CREATE INDEX IF NOT EXISTS idx_location ON earthquakes(latitude, longitude);",
            "CREATE INDEX IF NOT EXISTS idx_time ON earthquakes(time);"
        ]
        
        for index_sql in indexes_sql:
            cursor.execute(index_sql)
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Database initialization error: {e}")
        return False

# Initialize database on startup
init_database()

@app.route('/')
def index():
    """Main dashboard showing database status and earthquake count"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Test connection and get earthquake count
        cursor.execute("SELECT COUNT(*) FROM earthquakes")
        earthquake_count = cursor.fetchone()[0]
        
        # Get sample data info
        cursor.execute("SELECT MIN(magnitude) as min_mag, MAX(magnitude) as max_mag, COUNT(*) as total FROM earthquakes")
        stats = cursor.fetchone()
        
        conn.close()
        
        db_status = "Connected (SQLite)"
        db_info = {
            'total_earthquakes': earthquake_count,
            'min_magnitude': stats['min_mag'] if stats['min_mag'] else 0,
            'max_magnitude': stats['max_mag'] if stats['max_mag'] else 0
        }
        
    except Exception as e:
        db_status = f"Error: {e}"
        db_info = {}
    
    return render_template('index.html', 
                         db_status=db_status,
                         db_info=db_info)

@app.route('/upload-csv')
def upload_csv():
    """Load earthquake data from CSV file into SQLite database"""
    try:
        import csv
        
        # Find CSV file
        csv_path = None
        possible_paths = [
            'earthquakes.csv',
            os.path.join(os.path.dirname(__file__), 'earthquakes.csv'),
            '/home/site/wwwroot/earthquakes.csv'
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                csv_path = path
                break
        
        if not csv_path:
            return jsonify({'status': 'error', 'message': 'CSV file not found'})
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Clear existing data
        cursor.execute("DELETE FROM earthquakes")
        
        # Read and insert CSV data
        with open(csv_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            success_count = 0
            
            for row in reader:
                try:
                    cursor.execute("""
                        INSERT INTO earthquakes (time, latitude, longitude, depth, magnitude, magType, place, type, net, earthquake_id, updated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row.get('time', ''),
                        float(row['latitude']) if row.get('latitude') and row['latitude'].strip() else None,
                        float(row['longitude']) if row.get('longitude') and row['longitude'].strip() else None,
                        float(row['depth']) if row.get('depth') and row['depth'].strip() else None,
                        float(row['mag']) if row.get('mag') and row['mag'].strip() else None,
                        row.get('magType', ''),
                        row.get('place', ''),
                        row.get('type', ''),
                        row.get('net', ''),
                        row.get('id', ''),
                        row.get('updated', '')
                    ))
                    success_count += 1
                except Exception as e:
                    print(f"Error inserting row: {e}")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'message': f'Successfully loaded {success_count} earthquake records'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/search')
def search():
    """Render the search page"""
    return render_template('search.html')

@app.route('/search/magnitude-greater-than/<float:magnitude>')
def search_magnitude_greater(magnitude):
    """Search for earthquakes with magnitude greater than specified value"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT time, latitude, longitude, magnitude, place 
            FROM earthquakes 
            WHERE magnitude > ? 
            ORDER BY magnitude DESC
        """, (magnitude,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'time': row['time'],
                'latitude': row['latitude'] if row['latitude'] else 0,
                'longitude': row['longitude'] if row['longitude'] else 0,
                'magnitude': row['magnitude'] if row['magnitude'] else 0,
                'place': row['place'] if row['place'] else '',
            })
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'query': f'Magnitude > {magnitude}',
            'count': len(results),
            'earthquakes': results
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/search/magnitude-range/<float:min_mag>/<float:max_mag>')
def search_magnitude_range(min_mag, max_mag):
    """Search for earthquakes within a magnitude range"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT time, latitude, longitude, magnitude, place 
            FROM earthquakes 
            WHERE magnitude BETWEEN ? AND ? 
            ORDER BY magnitude DESC
        """, (min_mag, max_mag))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'time': row['time'],
                'latitude': row['latitude'] if row['latitude'] else 0,
                'longitude': row['longitude'] if row['longitude'] else 0,
                'magnitude': row['magnitude'] if row['magnitude'] else 0,
                'place': row['place'] if row['place'] else '',
            })
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'query': f'Magnitude {min_mag} - {max_mag}',
            'count': len(results),
            'earthquakes': results
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on earth in kilometers"""
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')
    
    R = 6371  # Radius of earth in kilometers
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

@app.route('/search/near-location/<float:latitude>/<float:longitude>/<float:radius_km>')
def search_near_location(latitude, longitude, radius_km):
    """Find earthquakes within specified radius of a location"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT time, latitude, longitude, magnitude, place 
            FROM earthquakes 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """)
        
        results = []
        for row in cursor.fetchall():
            eq_lat, eq_lon = row['latitude'], row['longitude']
            distance = haversine_distance(latitude, longitude, eq_lat, eq_lon)
            
            if distance <= radius_km:
                results.append({
                    'time': row['time'],
                    'latitude': eq_lat,
                    'longitude': eq_lon,
                    'magnitude': row['magnitude'] if row['magnitude'] else 0,
                    'place': row['place'] if row['place'] else '',
                    'distance_km': round(distance, 2)
                })
        
        # Sort by distance
        results.sort(key=lambda x: x['distance_km'])
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'query': f'Within {radius_km}km of ({latitude}, {longitude})',
            'count': len(results),
            'earthquakes': results
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/analysis/large-quakes-at-night')
def analyze_large_quakes_at_night():
    """Analyze if large earthquakes (>4.0) occur more often at night"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT time 
            FROM earthquakes 
            WHERE magnitude > 4.0 AND time IS NOT NULL AND time != ''
        """)
        
        day_count = 0
        night_count = 0
        
        for row in cursor.fetchall():
            time_str = row['time']
            if time_str:
                try:
                    # Parse ISO datetime
                    dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                    hour = dt.hour
                    
                    # Consider 6 PM to 6 AM as "night"
                    if hour >= 18 or hour < 6:
                        night_count += 1
                    else:
                        day_count += 1
                except:
                    continue  # Skip malformed dates
        
        conn.close()
        
        total = day_count + night_count
        night_percentage = (night_count / total * 100) if total > 0 else 0
        
        return jsonify({
            'status': 'success',
            'analysis': 'Large earthquakes (>4.0) - Day vs Night',
            'day_count': day_count,
            'night_count': night_count,
            'total_large_quakes': total,
            'night_percentage': round(night_percentage, 1),
            'conclusion': f'{night_percentage:.1f}% of large earthquakes occur at night (6 PM - 6 AM)'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
