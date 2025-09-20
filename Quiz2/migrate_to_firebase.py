"""
Azure SQL to Firebase Migration Script
Student: Benjamin Niccum
Course: Cloud Computing and Big Data

This script exports earthquake data from Azure SQL Database and creates
a JSON file that can be imported into Firebase Firestore.

Usage:
1. Run this script to export Azure SQL data to earthquakes_export.json
2. Use the Firebase Console or the web interface to import the JSON data
"""

import pyodbc
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Azure SQL Database configuration
SQL_SERVER = os.getenv('AZURE_SQL_SERVER')
SQL_DATABASE = os.getenv('AZURE_SQL_DATABASE')
SQL_USERNAME = os.getenv('AZURE_SQL_USERNAME')
SQL_PASSWORD = os.getenv('AZURE_SQL_PASSWORD')

def get_db_connection():
    """Create database connection to Azure SQL"""
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

def convert_datetime_to_string(dt):
    """Convert datetime to ISO string format for Firebase"""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    try:
        return dt.isoformat()
    except:
        return str(dt)

def export_earthquakes_to_json():
    """Export all earthquake data from Azure SQL to JSON format"""
    try:
        print("Connecting to Azure SQL Database...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all earthquake data
        sql = """
        SELECT 
            time, latitude, longitude, depth, magnitude, magType, 
            place, type, net, earthquake_id, updated, created_at
        FROM earthquakes
        ORDER BY magnitude DESC
        """
        
        print("Executing query...")
        cursor.execute(sql)
        
        earthquakes = []
        processed_count = 0
        
        print("Processing earthquake records...")
        for row in cursor.fetchall():
            # Convert row to dictionary
            earthquake = {
                'time': convert_datetime_to_string(row[0]),
                'latitude': float(row[1]) if row[1] is not None else None,
                'longitude': float(row[2]) if row[2] is not None else None,
                'depth': float(row[3]) if row[3] is not None else None,
                'magnitude': float(row[4]) if row[4] is not None else None,
                'magType': row[5] if row[5] else None,
                'place': row[6] if row[6] else None,
                'type': row[7] if row[7] else None,
                'net': row[8] if row[8] else None,
                'earthquake_id': row[9] if row[9] else None,
                'updated': convert_datetime_to_string(row[10]),
                'created_at': convert_datetime_to_string(row[11]),
                'exported_at': datetime.now().isoformat()
            }
            
            earthquakes.append(earthquake)
            processed_count += 1
            
            if processed_count % 1000 == 0:
                print(f"Processed {processed_count} records...")
        
        conn.close()
        
        print(f"Exporting {len(earthquakes)} earthquake records to JSON...")
        
        # Create export structure for Firebase
        export_data = {
            'export_info': {
                'source': 'Azure SQL Database',
                'exported_at': datetime.now().isoformat(),
                'total_records': len(earthquakes),
                'export_version': '1.0'
            },
            'earthquakes': earthquakes
        }
        
        # Write to JSON file
        output_filename = 'earthquakes_export.json'
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Export completed successfully!")
        print(f"📁 File saved: {output_filename}")
        print(f"📊 Total records exported: {len(earthquakes)}")
        
        # Create CSV version for web upload
        create_csv_version(earthquakes)
        
        return output_filename
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
        return None

def create_csv_version(earthquakes):
    """Create CSV version for easy web upload"""
    try:
        import csv
        
        csv_filename = 'earthquakes_export.csv'
        
        # Define CSV headers
        headers = [
            'time', 'latitude', 'longitude', 'depth', 'magnitude', 'magType',
            'place', 'type', 'net', 'earthquake_id', 'updated'
        ]
        
        with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            
            for earthquake in earthquakes:
                # Create row with only the headers we want
                row = {header: earthquake.get(header, '') for header in headers}
                writer.writerow(row)
        
        print(f"📄 CSV version created: {csv_filename}")
        print("💡 You can upload this CSV file using the web interface")
        
    except Exception as e:
        print(f"⚠️ CSV creation failed: {e}")

def create_firebase_import_instructions():
    """Create instructions for importing data to Firebase"""
    instructions = """
# Firebase Import Instructions

## Method 1: Using the Web Interface (Recommended)
1. Open your new web application (index.html)
2. Click "Upload Data" button
3. Select the earthquakes_export.csv file
4. Click "Upload CSV to Firebase"
5. Wait for upload to complete

## Method 2: Using Firebase Console
1. Go to Firebase Console (console.firebase.google.com)
2. Select your project
3. Go to Firestore Database
4. Click "Import" 
5. Upload the earthquakes_export.json file

## Method 3: Using Firebase CLI (Advanced)
```bash
npm install -g firebase-tools
firebase login
firebase firestore:delete --all-collections
firebase firestore:import earthquakes_export.json
```

## Firestore Security Rules
Make sure your Firestore has the following security rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // For development only
    }
  }
}
```

## Production Security Rules (Use after development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /earthquakes/{document} {
      allow read: if true;
      allow write: if false; // Read-only for public
    }
  }
}
```
"""
    
    with open('firebase_import_instructions.md', 'w') as f:
        f.write(instructions)
    
    print("📋 Import instructions created: firebase_import_instructions.md")

def main():
    """Main export function"""
    print("🚀 Starting Azure SQL to Firebase migration...")
    print("=" * 50)
    
    # Check if environment variables are set
    if not all([SQL_SERVER, SQL_DATABASE, SQL_USERNAME, SQL_PASSWORD]):
        print("❌ Error: Azure SQL environment variables not found!")
        print("Please make sure your .env file contains:")
        print("- AZURE_SQL_SERVER")
        print("- AZURE_SQL_DATABASE") 
        print("- AZURE_SQL_USERNAME")
        print("- AZURE_SQL_PASSWORD")
        return
    
    # Export data
    export_file = export_earthquakes_to_json()
    
    if export_file:
        # Create import instructions
        create_firebase_import_instructions()
        
        print("\n" + "=" * 50)
        print("🎉 Migration preparation completed!")
        print("\nNext steps:")
        print("1. Set up your Firebase project")
        print("2. Update the Firebase config in index.html and search.html")
        print("3. Upload the CSV file using the web interface")
        print("4. Deploy to GitHub Pages")
        print("\nFiles created:")
        print("- earthquakes_export.json (Full export)")
        print("- earthquakes_export.csv (For web upload)")
        print("- firebase_import_instructions.md (Instructions)")
    else:
        print("❌ Migration preparation failed!")

if __name__ == "__main__":
    main()