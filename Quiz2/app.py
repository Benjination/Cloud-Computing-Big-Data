"""
Earthquake Data Analysis Web Application - SQL Database Version
Student: Benjamin Niccum
Course: Cloud Computing and Big Data
Assignment: Quiz 2 - Earthquake Data Investigation
Date: September 10, 2025

Description:
This Flask web application provides a cloud-based interface for analyzing
earthquake data from USGS using Azure SQL Database.

Features:
- Search earthquakes by magnitude (greater than, ranges)
- Find earthquakes near specific geographic locations
- Analyze temporal patterns (day vs night occurrence)
- Handle missing/anomalous data gracefully

Database Schema:
- earthquakes table with proper data types
- Indexed columns for fast searching
- ACID transactions for data consistency

Note: CSV data is imported directly into Azure SQL Database via Azure tools
"""

from flask import Flask, jsonify, render_template, request
import os
import math
import pyodbc
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Environment variables for SQL Database
SQL_SERVER = os.getenv('AZURE_SQL_SERVER')
SQL_DATABASE = os.getenv('AZURE_SQL_DATABASE')
SQL_USERNAME = os.getenv('AZURE_SQL_USERNAME')
SQL_PASSWORD = os.getenv('AZURE_SQL_PASSWORD')

def get_db_connection():
    """Create database connection"""
    connection_string = f"""
    DRIVER={{ODBC Driver 17 for SQL Server}};
    SERVER={SQL_SERVER};
    DATABASE={SQL_DATABASE};
    UID={SQL_USERNAME};
    PWD={SQL_PASSWORD};
    Encrypt=yes;
    TrustServerCertificate=no;
    Connection Timeout=30;
    CommandTimeout=30;
    """
    try:
        conn = pyodbc.connect(connection_string)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

def init_database():
    """Create earthquakes table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create earthquakes table
        create_table_sql = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='earthquakes' AND xtype='U')
        CREATE TABLE earthquakes (
            id INT IDENTITY(1,1) PRIMARY KEY,
            time DATETIME2,
            latitude FLOAT,
            longitude FLOAT,
            depth FLOAT,
            magnitude FLOAT,
            magType NVARCHAR(10),
            place NVARCHAR(500),
            type NVARCHAR(50),
            net NVARCHAR(10),
            earthquake_id NVARCHAR(100),
            updated DATETIME2,
            created_at DATETIME2 DEFAULT GETDATE()
        );
        """
        
        cursor.execute(create_table_sql)
        
        # Create indexes for better performance
        indexes_sql = [
            "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_earthquakes_magnitude') CREATE INDEX IX_earthquakes_magnitude ON earthquakes(magnitude);",
            "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_earthquakes_location') CREATE INDEX IX_earthquakes_location ON earthquakes(latitude, longitude);",
            "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_earthquakes_time') CREATE INDEX IX_earthquakes_time ON earthquakes(time);"
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
        
        # Get table list
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        tables = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        # For the template variables it expects
        blobs = "N/A - Using SQL Database"  # Not using blob storage
        
    except Exception as e:
        earthquake_count = f"Error: {e}"
        tables = f"Error: {e}"
        blobs = f"Error: {e}"
    
    return render_template('index.html', 
                         earthquake_count=earthquake_count,
                         tables=tables,
                         blobs=blobs)

@app.route('/search')
def search():
    """Render the search page"""
    return render_template('search.html')

@app.route('/search/magnitude-greater-than/<float:magnitude>')
def search_magnitude_greater(magnitude):
    """Search for earthquakes with magnitude greater than specified value"""
    try:
        # Ensure magnitude is a float for proper numeric comparison
        magnitude = float(magnitude)
        print(f"DEBUG: Searching for magnitude > {magnitude}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = f"SELECT time, latitude, longitude, magnitude, place FROM earthquakes WHERE magnitude > {magnitude} ORDER BY magnitude DESC"
        print(f"DEBUG: SQL Query: {sql}")
        cursor.execute(sql)
        
        results = []
        for row in cursor.fetchall():
            # Handle time field - it's stored as string, not datetime
            time_str = row[0] if row[0] else ''
            # If it's already a string, use it directly; if it's a datetime, convert it
            if hasattr(time_str, 'isoformat'):
                time_formatted = time_str.isoformat()
            else:
                time_formatted = str(time_str) if time_str else ''
            
            results.append({
                'time': time_formatted,
                'latitude': float(row[1]) if row[1] is not None else 0.0,
                'longitude': float(row[2]) if row[2] is not None else 0.0,
                'magnitude': float(row[3]) if row[3] is not None else 0.0,
                'place': row[4] if row[4] else '',
            })
        
        conn.close()
        print(f"DEBUG: Found {len(results)} results")
        
        return jsonify({
            'status': 'success',
            'query': f'Magnitude > {magnitude}',
            'count': len(results),
            'earthquakes': results
        })
    except Exception as e:
        print(f"ERROR in search_magnitude_greater: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/search/magnitude-range/<float:min_mag>/<float:max_mag>')
def search_magnitude_range(min_mag, max_mag):
    """Search for earthquakes within a magnitude range"""
    try:
        # Ensure magnitudes are floats for proper numeric comparison
        min_mag = float(min_mag)
        max_mag = float(max_mag)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = f"SELECT time, latitude, longitude, magnitude, place FROM earthquakes WHERE magnitude BETWEEN {min_mag} AND {max_mag} ORDER BY magnitude DESC"
        cursor.execute(sql)
        
        results = []
        for row in cursor.fetchall():
            # Handle time field - it's stored as string, not datetime
            time_str = row[0] if row[0] else ''
            # If it's already a string, use it directly; if it's a datetime, convert it
            if hasattr(time_str, 'isoformat'):
                time_formatted = time_str.isoformat()
            else:
                time_formatted = str(time_str) if time_str else ''
            
            results.append({
                'time': time_formatted,
                'latitude': float(row[1]) if row[1] is not None else 0.0,
                'longitude': float(row[2]) if row[2] is not None else 0.0,
                'magnitude': float(row[3]) if row[3] is not None else 0.0,
                'place': row[4] if row[4] else '',
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
    # Ensure all inputs are floats and not None
    try:
        lat1 = float(lat1) if lat1 is not None else None
        lon1 = float(lon1) if lon1 is not None else None
        lat2 = float(lat2) if lat2 is not None else None
        lon2 = float(lon2) if lon2 is not None else None
    except (ValueError, TypeError):
        return float('inf')
    
    # Check if any coordinate is None (but 0 is valid!)
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
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
        # Ensure all numeric values are floats for proper comparison
        latitude = float(latitude)
        longitude = float(longitude)
        radius_km = float(radius_km)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all earthquakes (we'll filter by distance in Python)
        # In production, you'd use spatial functions, but this works for the assignment
        sql = "SELECT time, latitude, longitude, magnitude, place FROM earthquakes WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
        cursor.execute(sql)
        
        results = []
        for row in cursor.fetchall():
            # Ensure database values are also floats for calculations
            eq_lat = float(row[1]) if row[1] is not None else 0.0
            eq_lon = float(row[2]) if row[2] is not None else 0.0
            eq_magnitude = float(row[3]) if row[3] is not None else 0.0
            
            distance = haversine_distance(latitude, longitude, eq_lat, eq_lon)
            
            if distance <= radius_km:
                # Handle time field - it's stored as string, not datetime
                time_str = row[0] if row[0] else ''
                if hasattr(time_str, 'isoformat'):
                    time_formatted = time_str.isoformat()
                else:
                    time_formatted = str(time_str) if time_str else ''
                
                results.append({
                    'time': time_formatted,
                    'latitude': eq_lat,
                    'longitude': eq_lon,
                    'magnitude': eq_magnitude,
                    'place': row[4] if row[4] else '',
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
        # Define the magnitude threshold as a float
        magnitude_threshold = 4.0
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = f"SELECT time FROM earthquakes WHERE magnitude > {magnitude_threshold} AND time IS NOT NULL"
        cursor.execute(sql)
        
        day_count = 0
        night_count = 0
        
        for row in cursor.fetchall():
            time_dt = row[0]
            if time_dt:
                hour = time_dt.hour
                # Consider 6 PM to 6 AM as "night"
                if hour >= 18 or hour < 6:
                    night_count += 1
                else:
                    day_count += 1
        
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
