"""
Flask Application Template for Data Analysis Quiz
Customize this template based on your quiz dataset

Instructions for Quiz Day:
1. Update database model (DataRecord class) with your CSV fields
2. Modify upload_data() function for your specific data types
3. Customize search functions for your data requirements
4. Update analysis functions based on your dataset patterns
"""

from flask import Flask, request, render_template, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime
import json
from werkzeug.utils import secure_filename
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
CORS(app)

# CUSTOMIZE THIS MODEL FOR YOUR DATA
class DataRecord(db.Model):
    """
    Database model - MODIFY THESE FIELDS FOR YOUR QUIZ DATA
    Common field patterns:
    - Numeric: price, rating, amount, score, value, quantity
    - Text: name, title, description, category, location
    - Date: created_date, updated_date, event_date
    - Location: latitude, longitude, address, city
    """
    __tablename__ = 'data_records'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # CUSTOMIZE THESE FIELDS BASED ON YOUR CSV COLUMNS
    # Example fields - replace with your actual data structure
    field1 = db.Column(db.String(200))  # Text field
    field2 = db.Column(db.String(200))  # Text field
    numeric_field = db.Column(db.Float)  # Numeric field
    date_field = db.Column(db.DateTime)  # Date field
    latitude = db.Column(db.Float)       # Location field
    longitude = db.Column(db.Float)      # Location field
    category = db.Column(db.String(100)) # Category field
    
    # ADD MORE FIELDS AS NEEDED FOR YOUR DATA
    # price = db.Column(db.Float)
    # rating = db.Column(db.Float)
    # description = db.Column(db.Text)
    # status = db.Column(db.String(50))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert record to dictionary for JSON responses"""
        return {
            'id': self.id,
            'field1': self.field1,
            'field2': self.field2,
            'numeric_field': self.numeric_field,
            'date_field': self.date_field.isoformat() if self.date_field else None,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None
            # ADD MORE FIELDS TO MATCH YOUR MODEL
        }

# Routes
@app.route('/')
def index():
    """Main upload page"""
    return render_template('upload.html')

@app.route('/search')
def search_page():
    """Search and analysis page"""
    return render_template('search.html')

@app.route('/upload', methods=['POST'])
def upload_data():
    """
    Handle CSV file upload and data processing
    CUSTOMIZE THIS FOR YOUR SPECIFIC DATA FIELDS
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and file.filename.endswith('.csv'):
            # Read CSV file
            df = pd.read_csv(file)
            
            # Clear existing data (optional - remove if you want to append)
            db.session.query(DataRecord).delete()
            
            records_added = 0
            
            for _, row in df.iterrows():
                try:
                    # CUSTOMIZE THIS DATA MAPPING FOR YOUR CSV COLUMNS
                    record = DataRecord(
                        # Map CSV columns to database fields
                        field1=str(row.get('field1', '')),  # Replace 'field1' with actual CSV column name
                        field2=str(row.get('field2', '')),  # Replace 'field2' with actual CSV column name
                        numeric_field=float(row.get('numeric_field', 0)) if pd.notna(row.get('numeric_field')) else None,
                        
                        # Handle date fields
                        date_field=pd.to_datetime(row.get('date_field'), errors='coerce') if pd.notna(row.get('date_field')) else None,
                        
                        # Handle location fields
                        latitude=float(row.get('latitude', 0)) if pd.notna(row.get('latitude')) else None,
                        longitude=float(row.get('longitude', 0)) if pd.notna(row.get('longitude')) else None,
                        
                        # Handle category fields
                        category=str(row.get('category', '')) if pd.notna(row.get('category')) else None
                        
                        # ADD MORE FIELD MAPPINGS AS NEEDED
                        # price=float(row.get('price', 0)) if pd.notna(row.get('price')) else None,
                        # rating=float(row.get('rating', 0)) if pd.notna(row.get('rating')) else None,
                    )
                    
                    db.session.add(record)
                    records_added += 1
                    
                    # Commit in batches for better performance
                    if records_added % 500 == 0:
                        db.session.commit()
                        
                except Exception as e:
                    print(f"Error processing row: {e}")
                    continue
            
            # Final commit
            db.session.commit()
            
            return jsonify({
                'message': f'Successfully uploaded {records_added} records',
                'records_count': records_added
            })
        
        else:
            return jsonify({'error': 'Please upload a CSV file'}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

# SEARCH FUNCTIONS - CUSTOMIZE THESE FOR YOUR DATA

@app.route('/api/search/numeric', methods=['POST'])
def search_numeric():
    """
    Search by numeric value threshold
    CUSTOMIZE: Change field name and comparison logic
    """
    try:
        data = request.get_json()
        threshold = float(data.get('threshold', 0))
        operator = data.get('operator', 'greater')  # greater, less, equal
        
        # MODIFY: Change 'numeric_field' to your actual field name
        if operator == 'greater':
            query = DataRecord.query.filter(DataRecord.numeric_field > threshold)
        elif operator == 'less':
            query = DataRecord.query.filter(DataRecord.numeric_field < threshold)
        else:  # equal
            query = DataRecord.query.filter(DataRecord.numeric_field == threshold)
        
        results = query.order_by(DataRecord.numeric_field.desc()).limit(1000).all()
        
        return jsonify({
            'results': [record.to_dict() for record in results],
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/text', methods=['POST'])
def search_text():
    """
    Search by text field
    CUSTOMIZE: Change field names for your text searches
    """
    try:
        data = request.get_json()
        search_term = data.get('search_term', '').lower()
        
        if not search_term:
            return jsonify({'error': 'Search term required'}), 400
        
        # MODIFY: Change field names to match your text fields
        results = DataRecord.query.filter(
            db.or_(
                DataRecord.field1.ilike(f'%{search_term}%'),
                DataRecord.field2.ilike(f'%{search_term}%'),
                DataRecord.category.ilike(f'%{search_term}%')
            )
        ).limit(1000).all()
        
        return jsonify({
            'results': [record.to_dict() for record in results],
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/location', methods=['POST'])
def search_location():
    """
    Search by location proximity
    CUSTOMIZE: Only if your data has location fields
    """
    try:
        data = request.get_json()
        lat = float(data.get('latitude'))
        lng = float(data.get('longitude'))
        radius = float(data.get('radius', 10))  # km
        
        # Simple bounding box search (for more precision, use PostGIS or similar)
        lat_range = radius / 111.0  # Approximate degrees per km
        lng_range = radius / (111.0 * abs(lat))
        
        results = DataRecord.query.filter(
            DataRecord.latitude.between(lat - lat_range, lat + lat_range),
            DataRecord.longitude.between(lng - lng_range, lng + lng_range)
        ).limit(1000).all()
        
        return jsonify({
            'results': [record.to_dict() for record in results],
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/category', methods=['POST'])
def search_category():
    """
    Search by category
    CUSTOMIZE: Change to your category field
    """
    try:
        data = request.get_json()
        category = data.get('category')
        
        if not category:
            return jsonify({'error': 'Category required'}), 400
        
        results = DataRecord.query.filter(
            DataRecord.category == category
        ).limit(1000).all()
        
        return jsonify({
            'results': [record.to_dict() for record in results],
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ANALYSIS FUNCTIONS - CUSTOMIZE THESE FOR YOUR DATA PATTERNS

@app.route('/api/analysis/summary', methods=['GET'])
def analysis_summary():
    """
    Basic data summary statistics
    CUSTOMIZE: Add relevant summary metrics for your data
    """
    try:
        total_records = DataRecord.query.count()
        
        # MODIFY: Add statistics relevant to your data
        numeric_stats = db.session.query(
            db.func.avg(DataRecord.numeric_field).label('avg'),
            db.func.min(DataRecord.numeric_field).label('min'),
            db.func.max(DataRecord.numeric_field).label('max'),
            db.func.count(DataRecord.numeric_field).label('count')
        ).first()
        
        # Category distribution
        category_counts = db.session.query(
            DataRecord.category,
            db.func.count(DataRecord.id).label('count')
        ).group_by(DataRecord.category).all()
        
        return jsonify({
            'total_records': total_records,
            'numeric_field_stats': {
                'average': float(numeric_stats.avg) if numeric_stats.avg else 0,
                'minimum': float(numeric_stats.min) if numeric_stats.min else 0,
                'maximum': float(numeric_stats.max) if numeric_stats.max else 0,
                'count': numeric_stats.count
            },
            'category_distribution': [
                {'category': cat, 'count': count}
                for cat, count in category_counts
            ]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/pattern1', methods=['GET'])
def analysis_pattern1():
    """
    Custom analysis pattern 1
    CUSTOMIZE: Implement analysis specific to your data
    """
    try:
        # Example: Time-based analysis
        # MODIFY: Implement your specific analysis logic
        
        # Count records by date
        date_counts = db.session.query(
            db.func.date(DataRecord.date_field).label('date'),
            db.func.count(DataRecord.id).label('count')
        ).filter(DataRecord.date_field.isnot(None))\
         .group_by(db.func.date(DataRecord.date_field))\
         .order_by('date').all()
        
        return jsonify({
            'analysis_type': 'Date Distribution',
            'data': [
                {'date': str(date), 'count': count}
                for date, count in date_counts
            ]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/pattern2', methods=['GET'])
def analysis_pattern2():
    """
    Custom analysis pattern 2
    CUSTOMIZE: Implement second analysis specific to your data
    """
    try:
        # Example: Numeric value distribution
        # MODIFY: Implement your specific analysis logic
        
        # Group numeric values into ranges
        ranges = [
            ('Low', 0, 25),
            ('Medium', 25, 75),
            ('High', 75, 100)
        ]
        
        range_counts = []
        for name, min_val, max_val in ranges:
            count = DataRecord.query.filter(
                DataRecord.numeric_field >= min_val,
                DataRecord.numeric_field < max_val
            ).count()
            range_counts.append({'range': name, 'count': count})
        
        return jsonify({
            'analysis_type': 'Value Range Distribution',
            'data': range_counts
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/pattern3', methods=['GET'])
def analysis_pattern3():
    """
    Custom analysis pattern 3
    CUSTOMIZE: Implement third analysis specific to your data
    """
    try:
        # Example: Geographic clustering (if location data available)
        # MODIFY: Implement your specific analysis logic
        
        # Simple geographic regions
        regions = []
        if DataRecord.query.filter(DataRecord.latitude.isnot(None)).first():
            # Count by approximate regions
            north = DataRecord.query.filter(DataRecord.latitude > 40).count()
            south = DataRecord.query.filter(DataRecord.latitude <= 40).count()
            
            regions = [
                {'region': 'North', 'count': north},
                {'region': 'South', 'count': south}
            ]
        
        return jsonify({
            'analysis_type': 'Geographic Distribution',
            'data': regions
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Utility routes
@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get basic database statistics"""
    try:
        total_records = DataRecord.query.count()
        return jsonify({
            'total_records': total_records,
            'status': 'connected'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# Initialize database
@app.before_first_request
def create_tables():
    """Create database tables"""
    db.create_all()

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)