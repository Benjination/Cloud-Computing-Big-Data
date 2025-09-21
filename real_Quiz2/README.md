# Flask Data Analysis Application

A template Flask application for data analysis projects, designed for quick setup during timed quizzes or assignments.

## Quick Start for Quiz Environment

### 1. Setup Python Environment
```bash
# Create virtual environment
python -m venv quiz_env
source quiz_env/bin/activate  # On Windows: quiz_env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Initialize Database
```bash
# Create database tables
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

### 3. Run Application
```bash
python app.py
```

The application will be available at: http://localhost:5000

## File Structure

```
quiz_project/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── utils.py            # Database utilities
├── requirements.txt    # Python dependencies
├── README.md          # This file
├── templates/         # HTML templates
│   ├── upload.html    # Data upload interface
│   └── search.html    # Search and analysis interface
└── quiz_data.db       # SQLite database (created automatically)
```

## Customization for Different Datasets

### 1. Update Data Model (app.py)
Modify the `DataRecord` class to match your CSV columns:

```python
class DataRecord(db.Model):
    # Replace these fields with your actual CSV columns
    field1 = db.Column(db.String(200))      # Your text field
    numeric_field = db.Column(db.Float)     # Your numeric field
    date_field = db.Column(db.DateTime)     # Your date field
    # Add more fields as needed
```

### 2. Update Upload Function (app.py)
Customize the field mapping in the `upload_data()` function:

```python
record = DataRecord(
    field1=str(row.get('your_csv_column_name', '')),
    numeric_field=float(row.get('your_numeric_column', 0)),
    # Map your CSV columns here
)
```

### 3. Update Search Functions (app.py)
Modify search functions to work with your fields:
- `search_numeric()` - Change field name for numeric searches
- `search_text()` - Update text field names
- `search_category()` - Change category field name

### 4. Update HTML Templates
Customize the display in `templates/search.html`:
- Update table headers
- Modify result display fields
- Adjust search form labels

## Available Features

### Data Upload
- CSV file upload with drag-and-drop
- Automatic data type detection
- Batch processing for large files
- Progress indicators

### Search Functions
- Numeric value searches (greater than, less than, equal)
- Text searches across multiple fields
- Location-based searches (if coordinate data available)
- Category/classification searches

### Analysis Functions
- Data summary statistics
- Category distribution analysis
- Custom pattern analysis (customizable)
- Export results to CSV

### User Interface
- Responsive Bootstrap design
- Real-time search results
- Pagination for large result sets
- Loading indicators
- Error handling

## Common Quiz Scenarios

### Sales Data
Fields: date, product, price, quantity, salesperson, region
- Search by price ranges
- Analyze sales by region
- Time-based sales patterns

### Review Data
Fields: product, rating, review_text, date, location
- Search by rating thresholds
- Text search in reviews
- Geographic analysis of reviews

### Event Data
Fields: event_name, date, location, attendance, category
- Search by attendance levels
- Category analysis
- Time pattern analysis

### Product Data
Fields: name, price, category, rating, description, availability
- Price range searches
- Category comparisons
- Rating distributions

## Database Configuration

The application uses SQLite by default for quick setup. For production or cloud deployment, update `config.py`:

### Azure SQL Database
```python
SQLALCHEMY_DATABASE_URI = 'mssql+pyodbc://username:password@server.database.windows.net/database?driver=ODBC+Driver+17+for+SQL+Server'
```

### PostgreSQL
```python
SQLALCHEMY_DATABASE_URI = 'postgresql://username:password@localhost/database'
```

### MySQL
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://username:password@localhost/database'
```

## Performance Tips

1. **Use appropriate data types** - Don't store numbers as strings
2. **Limit result sets** - Use pagination for large datasets
3. **Index frequently searched columns** - Add database indexes
4. **Batch operations** - Process large uploads in chunks
5. **Client-side filtering** - Reduce server load for simple filters

## Troubleshooting

### Common Issues

**Import Errors**: Make sure virtual environment is activated and all packages are installed
```bash
pip install -r requirements.txt
```

**Database Errors**: Recreate database tables
```bash
python -c "from app import app, db; app.app_context().push(); db.drop_all(); db.create_all()"
```

**Upload Failures**: Check file format and size limits in config.py

**Search Not Working**: Verify field names match between model and CSV columns

### Development Mode
Run with debug mode for detailed error messages:
```bash
export FLASK_ENV=development  # Linux/Mac
set FLASK_ENV=development     # Windows
python app.py
```

## Deployment Options

### Local Development
```bash
python app.py
```

### Production (with Gunicorn)
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Azure App Service
1. Set startup command: `gunicorn --bind=0.0.0.0 --timeout 600 app:app`
2. Configure environment variables in Azure Portal
3. Set Python version to 3.8 or higher

### AWS Elastic Beanstalk
1. Create `application.py` that imports from `app.py`
2. Configure environment variables
3. Deploy using EB CLI

## Security Considerations

- Change SECRET_KEY in production
- Use environment variables for sensitive data
- Implement proper user authentication if needed
- Validate all user inputs
- Use HTTPS in production

## License

This template is provided for educational use in quiz and assignment environments.