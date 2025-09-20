"""
Simplified Earthquake App for Local Testing
"""
from flask import Flask, jsonify
import os
import pyodbc
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database configuration
SQL_SERVER = os.getenv('AZURE_SQL_SERVER')
SQL_DATABASE = os.getenv('AZURE_SQL_DATABASE')
SQL_USERNAME = os.getenv('AZURE_SQL_USERNAME')
SQL_PASSWORD = os.getenv('AZURE_SQL_PASSWORD')

def test_db_connection():
    """Test database connection"""
    try:
        connection_string = f"""
        DRIVER={{ODBC Driver 17 for SQL Server}};
        SERVER={SQL_SERVER};
        DATABASE={SQL_DATABASE};
        UID={SQL_USERNAME};
        PWD={SQL_PASSWORD};
        Encrypt=yes;
        TrustServerCertificate=no;
        Connection Timeout=30;
        """
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM earthquakes")
        count = cursor.fetchone()[0]
        conn.close()
        return True, count
    except Exception as e:
        return False, str(e)

@app.route('/')
def index():
    """Simple test endpoint"""
    db_ok, result = test_db_connection()
    
    if db_ok:
        return jsonify({
            'status': 'success',
            'message': 'App and database working!',
            'earthquake_count': result
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Database connection failed',
            'error': result
        })

@app.route('/test/simple')
def simple_test():
    """Very simple test that doesn't use database"""
    return jsonify({
        'status': 'success',
        'message': 'Flask app is working!',
        'test': True
    })

@app.route('/test/magnitude/<float:mag>')
def test_magnitude(mag):
    """Simple magnitude test"""
    try:
        connection_string = f"""
        DRIVER={{ODBC Driver 17 for SQL Server}};
        SERVER={SQL_SERVER};
        DATABASE={SQL_DATABASE};
        UID={SQL_USERNAME};
        PWD={SQL_PASSWORD};
        Encrypt=yes;
        TrustServerCertificate=no;
        Connection Timeout=30;
        """
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        
        # Simple query to test magnitude filtering
        sql = f"SELECT COUNT(*) FROM earthquakes WHERE magnitude > {float(mag)}"
        cursor.execute(sql)
        count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'magnitude_threshold': mag,
            'earthquakes_found': count
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

if __name__ == '__main__':
    print(f"🌍 Starting Earthquake Test App")
    print(f"Database: {SQL_SERVER}/{SQL_DATABASE}")
    print(f"Test at: http://127.0.0.1:5003")
    app.run(debug=True, port=5003, host='127.0.0.1')