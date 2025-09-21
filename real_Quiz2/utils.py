"""
Database utility functions for the Flask application
Helper functions for common database operations
"""

from app import db, DataRecord
import pandas as pd
from datetime import datetime
import json

def safe_float_convert(value):
    """Safely convert value to float, return None if conversion fails"""
    try:
        if pd.isna(value) or value == '' or value is None:
            return None
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_date_convert(value):
    """Safely convert value to datetime, return None if conversion fails"""
    try:
        if pd.isna(value) or value == '' or value is None:
            return None
        return pd.to_datetime(value)
    except (ValueError, TypeError):
        return None

def safe_string_convert(value):
    """Safely convert value to string, handle None and NaN"""
    if pd.isna(value) or value is None:
        return None
    return str(value).strip()

def detect_data_types(df):
    """
    Analyze DataFrame and suggest data types for each column
    Returns a dictionary with column names and suggested types
    """
    suggestions = {}
    
    for column in df.columns:
        sample_values = df[column].dropna().head(10)
        
        if len(sample_values) == 0:
            suggestions[column] = 'string'
            continue
        
        # Check if numeric
        numeric_count = 0
        for value in sample_values:
            try:
                float(value)
                numeric_count += 1
            except (ValueError, TypeError):
                pass
        
        if numeric_count / len(sample_values) > 0.8:
            suggestions[column] = 'numeric'
            continue
        
        # Check if date
        date_count = 0
        for value in sample_values:
            try:
                pd.to_datetime(value)
                date_count += 1
            except (ValueError, TypeError):
                pass
        
        if date_count / len(sample_values) > 0.8:
            suggestions[column] = 'date'
            continue
        
        # Check for coordinates
        if 'lat' in column.lower() or 'lng' in column.lower() or 'lon' in column.lower():
            suggestions[column] = 'coordinate'
            continue
        
        # Default to string
        suggestions[column] = 'string'
    
    return suggestions

def bulk_insert_records(df, batch_size=1000):
    """
    Efficiently insert DataFrame records into database
    CUSTOMIZE: Modify field mapping for your specific data structure
    """
    try:
        # Clear existing data (optional)
        # db.session.query(DataRecord).delete()
        
        records_added = 0
        batch_records = []
        
        for index, row in df.iterrows():
            try:
                # CUSTOMIZE THIS MAPPING FOR YOUR CSV STRUCTURE
                record_data = {
                    'field1': safe_string_convert(row.get('field1')),  # CHANGE FIELD NAMES
                    'field2': safe_string_convert(row.get('field2')),  # CHANGE FIELD NAMES
                    'numeric_field': safe_float_convert(row.get('numeric_field')),  # CHANGE FIELD NAMES
                    'date_field': safe_date_convert(row.get('date_field')),  # CHANGE FIELD NAMES
                    'latitude': safe_float_convert(row.get('latitude')),
                    'longitude': safe_float_convert(row.get('longitude')),
                    'category': safe_string_convert(row.get('category'))
                }
                
                # Create record
                record = DataRecord(**record_data)
                batch_records.append(record)
                records_added += 1
                
                # Insert in batches
                if len(batch_records) >= batch_size:
                    db.session.add_all(batch_records)
                    db.session.commit()
                    batch_records = []
                    
            except Exception as e:
                print(f"Error processing row {index}: {e}")
                continue
        
        # Insert remaining records
        if batch_records:
            db.session.add_all(batch_records)
            db.session.commit()
        
        return records_added
        
    except Exception as e:
        db.session.rollback()
        raise e

def get_table_stats():
    """Get basic statistics about the data table"""
    try:
        total_records = DataRecord.query.count()
        
        # Get numeric field statistics
        numeric_stats = db.session.query(
            db.func.count(DataRecord.numeric_field).label('count'),
            db.func.avg(DataRecord.numeric_field).label('avg'),
            db.func.min(DataRecord.numeric_field).label('min'),
            db.func.max(DataRecord.numeric_field).label('max')
        ).filter(DataRecord.numeric_field.isnot(None)).first()
        
        # Get category distribution
        category_stats = db.session.query(
            DataRecord.category,
            db.func.count(DataRecord.id).label('count')
        ).filter(DataRecord.category.isnot(None))\
         .group_by(DataRecord.category)\
         .order_by(db.func.count(DataRecord.id).desc()).all()
        
        # Get date range
        date_stats = db.session.query(
            db.func.min(DataRecord.date_field).label('min_date'),
            db.func.max(DataRecord.date_field).label('max_date'),
            db.func.count(DataRecord.date_field).label('date_count')
        ).filter(DataRecord.date_field.isnot(None)).first()
        
        return {
            'total_records': total_records,
            'numeric_stats': {
                'count': numeric_stats.count if numeric_stats else 0,
                'average': float(numeric_stats.avg) if numeric_stats and numeric_stats.avg else 0,
                'minimum': float(numeric_stats.min) if numeric_stats and numeric_stats.min else 0,
                'maximum': float(numeric_stats.max) if numeric_stats and numeric_stats.max else 0
            },
            'category_stats': [
                {'category': cat, 'count': count}
                for cat, count in category_stats[:10]  # Top 10 categories
            ],
            'date_stats': {
                'min_date': date_stats.min_date.isoformat() if date_stats and date_stats.min_date else None,
                'max_date': date_stats.max_date.isoformat() if date_stats and date_stats.max_date else None,
                'count': date_stats.date_count if date_stats else 0
            }
        }
        
    except Exception as e:
        print(f"Error getting table stats: {e}")
        return {
            'total_records': 0,
            'numeric_stats': {'count': 0, 'average': 0, 'minimum': 0, 'maximum': 0},
            'category_stats': [],
            'date_stats': {'min_date': None, 'max_date': None, 'count': 0}
        }

def search_with_filters(filters, limit=1000):
    """
    Generic search function with multiple filters
    filters = {
        'numeric_min': value,
        'numeric_max': value,
        'text_search': 'search term',
        'category': 'category name',
        'date_from': datetime,
        'date_to': datetime,
        'latitude': value,
        'longitude': value,
        'radius_km': value
    }
    """
    query = DataRecord.query
    
    # Numeric filters
    if filters.get('numeric_min') is not None:
        query = query.filter(DataRecord.numeric_field >= filters['numeric_min'])
    
    if filters.get('numeric_max') is not None:
        query = query.filter(DataRecord.numeric_field <= filters['numeric_max'])
    
    # Text search
    if filters.get('text_search'):
        search_term = f"%{filters['text_search']}%"
        query = query.filter(
            db.or_(
                DataRecord.field1.ilike(search_term),
                DataRecord.field2.ilike(search_term),
                DataRecord.category.ilike(search_term)
            )
        )
    
    # Category filter
    if filters.get('category'):
        query = query.filter(DataRecord.category == filters['category'])
    
    # Date filters
    if filters.get('date_from'):
        query = query.filter(DataRecord.date_field >= filters['date_from'])
    
    if filters.get('date_to'):
        query = query.filter(DataRecord.date_field <= filters['date_to'])
    
    # Location filter (simple bounding box)
    if all(filters.get(k) is not None for k in ['latitude', 'longitude', 'radius_km']):
        lat = filters['latitude']
        lng = filters['longitude']
        radius = filters['radius_km']
        
        # Simple degree approximation (not perfectly accurate but fast)
        lat_range = radius / 111.0
        lng_range = radius / (111.0 * abs(lat) if lat != 0 else 111.0)
        
        query = query.filter(
            DataRecord.latitude.between(lat - lat_range, lat + lat_range),
            DataRecord.longitude.between(lng - lng_range, lng + lng_range)
        )
    
    # Execute query with limit
    results = query.limit(limit).all()
    return [record.to_dict() for record in results]

def export_to_csv(results, filename='export.csv'):
    """Export search results to CSV file"""
    if not results:
        return None
    
    df = pd.DataFrame(results)
    df.to_csv(filename, index=False)
    return filename

def validate_csv_structure(df, required_columns=None):
    """
    Validate CSV structure before import
    required_columns: list of column names that must be present
    """
    issues = []
    
    if df.empty:
        issues.append("CSV file is empty")
        return issues
    
    # Check for required columns
    if required_columns:
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            issues.append(f"Missing required columns: {', '.join(missing_columns)}")
    
    # Check for duplicate column names
    if len(df.columns) != len(set(df.columns)):
        issues.append("Duplicate column names found")
    
    # Check for completely empty columns
    empty_columns = [col for col in df.columns if df[col].isna().all()]
    if empty_columns:
        issues.append(f"Completely empty columns: {', '.join(empty_columns)}")
    
    # Check data quality
    if len(df) > 10000:
        issues.append(f"Large dataset ({len(df)} rows) - processing may take time")
    
    return issues

# Distance calculation for location-based searches
def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
    from math import radians, cos, sin, asin, sqrt
    
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r

def generate_sample_data():
    """
    Generate sample data for testing (useful during development)
    CUSTOMIZE: Modify this to match your expected data structure
    """
    import random
    from datetime import datetime, timedelta
    
    categories = ['Category A', 'Category B', 'Category C', 'Category D']
    field1_options = ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5']
    field2_options = ['Type X', 'Type Y', 'Type Z']
    
    sample_records = []
    
    for i in range(100):
        record = DataRecord(
            field1=random.choice(field1_options),
            field2=random.choice(field2_options),
            numeric_field=round(random.uniform(0, 100), 2),
            date_field=datetime.now() - timedelta(days=random.randint(0, 365)),
            latitude=round(random.uniform(25, 50), 6),  # US coordinates
            longitude=round(random.uniform(-125, -65), 6),
            category=random.choice(categories)
        )
        sample_records.append(record)
    
    try:
        db.session.add_all(sample_records)
        db.session.commit()
        return len(sample_records)
    except Exception as e:
        db.session.rollback()
        raise e