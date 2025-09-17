"""
CSV to Azure SQL Database Uploader
Student: Benjamin Niccum
Course: Cloud Computing and Big Data
Assignment: Quiz 2 - Earthquake Data Investigation

This script reads earthquake data from a CSV file and uploads it to Azure SQL Database.
"""

import csv
import pyodbc
from datetime import datetime
import os

# Database connection details
SERVER = 'bniccum.database.windows.net'
DATABASE = 'earthquakedb'
USERNAME = 'sqladmin'
PASSWORD = input("Enter your SQL password: ")  # Secure password input

# Create connection string
connection_string = f"""
Driver={{ODBC Driver 17 for SQL Server}};
Server=tcp:{SERVER},1433;
Database={DATABASE};
Uid={USERNAME};
Pwd={PASSWORD};
Encrypt=yes;
TrustServerCertificate=no;
Connection Timeout=30;
"""

def create_table(cursor):
    """Create the earthquakes table if it doesn't exist"""
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
        updated DATETIME2
    );
    """
    cursor.execute(create_table_sql)
    print("✅ Table 'earthquakes' created or already exists")

def parse_datetime(date_string):
    """Parse datetime string from CSV"""
    try:
        if date_string and date_string.strip():
            # Handle the ISO format: 2023-01-09T17:52:52.123Z
            if 'T' in date_string and 'Z' in date_string:
                # Remove the Z and parse
                clean_date = date_string.replace('Z', '')
                return datetime.fromisoformat(clean_date)
            else:
                # Try other common formats
                return datetime.strptime(date_string, '%Y-%m-%d %H:%M:%S')
        return None
    except ValueError as e:
        print(f"⚠️  Warning: Could not parse date '{date_string}': {e}")
        return None

def safe_float(value):
    """Safely convert string to float"""
    try:
        return float(value) if value and value.strip() else None
    except ValueError:
        return None

def upload_csv_data(csv_file_path):
    """Upload CSV data to Azure SQL Database"""
    try:
        # Connect to database
        print(f"🔌 Connecting to {SERVER}...")
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        
        # Create table
        create_table(cursor)
        conn.commit()
        
        # Open and read CSV file
        print(f"📖 Reading CSV file: {csv_file_path}")
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            # Prepare insert statement
            insert_sql = """
            INSERT INTO earthquakes (time, latitude, longitude, depth, magnitude, magType, place, type, net, earthquake_id, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            successful_inserts = 0
            failed_inserts = 0
            
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    # Parse and clean data
                    time_val = parse_datetime(row.get('time', ''))
                    latitude = safe_float(row.get('latitude', ''))
                    longitude = safe_float(row.get('longitude', ''))
                    depth = safe_float(row.get('depth', ''))
                    magnitude = safe_float(row.get('mag', ''))
                    mag_type = row.get('magType', '')[:10] if row.get('magType') else None
                    place = row.get('place', '')[:500] if row.get('place') else None
                    event_type = row.get('type', '')[:50] if row.get('type') else None
                    net = row.get('net', '')[:10] if row.get('net') else None
                    earthquake_id = row.get('id', '')[:100] if row.get('id') else None
                    updated = parse_datetime(row.get('updated', ''))
                    
                    # Insert data
                    cursor.execute(insert_sql, (
                        time_val, latitude, longitude, depth, magnitude,
                        mag_type, place, event_type, net, earthquake_id, updated
                    ))
                    
                    successful_inserts += 1
                    
                    # Print progress every 100 rows
                    if row_num % 100 == 0:
                        print(f"📊 Processed {row_num} rows...")
                        
                except Exception as e:
                    failed_inserts += 1
                    print(f"⚠️  Error inserting row {row_num}: {e}")
                    continue
            
            # Commit all changes
            conn.commit()
            print(f"\n🎉 Upload complete!")
            print(f"✅ Successfully inserted: {successful_inserts} records")
            print(f"❌ Failed insertions: {failed_inserts} records")
            
            # Verify data
            cursor.execute("SELECT COUNT(*) FROM earthquakes")
            total_count = cursor.fetchone()[0]
            print(f"📊 Total records in database: {total_count}")
            
        cursor.close()
        conn.close()
        print("🔌 Database connection closed")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

def main():
    """Main function"""
    print("🌍 Earthquake CSV to Azure SQL Database Uploader")
    print("=" * 50)
    
    # Check if CSV file exists
    csv_files = [f for f in os.listdir('.') if f.endswith('.csv')]
    
    if not csv_files:
        print("❌ No CSV files found in current directory")
        csv_file = input("Enter the full path to your CSV file: ")
    elif len(csv_files) == 1:
        csv_file = csv_files[0]
        print(f"📁 Found CSV file: {csv_file}")
    else:
        print("📁 Multiple CSV files found:")
        for i, file in enumerate(csv_files):
            print(f"  {i+1}. {file}")
        choice = int(input("Select file number: ")) - 1
        csv_file = csv_files[choice]
    
    if not os.path.exists(csv_file):
        print(f"❌ File not found: {csv_file}")
        return
    
    print(f"\n🚀 Starting upload of {csv_file} to Azure SQL Database...")
    success = upload_csv_data(csv_file)
    
    if success:
        print("\n🎉 Upload completed successfully!")
        print("You can now test your Flask app with the earthquake data.")
    else:
        print("\n❌ Upload failed. Please check the error messages above.")

if __name__ == "__main__":
    main()
