"""
Configuration settings for Flask application
Customize these settings for your quiz environment
"""

import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Basic Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # File upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'csv', 'txt'}
    
    # Database Configuration
    # MODIFY THIS FOR YOUR QUIZ DATABASE SETUP
    
    # Option 1: SQLite (Local development - RECOMMENDED FOR QUIZ)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///quiz_data.db'
    
    # Option 2: PostgreSQL (Azure, AWS, etc.)
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
    #     'postgresql://username:password@localhost/quiz_db'
    
    # Option 3: SQL Server (Azure SQL)
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
    #     'mssql+pyodbc://username:password@server.database.windows.net/database?driver=ODBC+Driver+17+for+SQL+Server'
    
    # Option 4: MySQL
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
    #     'mysql+pymysql://username:password@localhost/quiz_db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    
    # Performance settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_timeout': 20,
        'pool_recycle': -1,
        'pool_pre_ping': True
    }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True  # Log SQL queries

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    
    # Use stronger secret key in production
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'please-set-secret-key-in-env'

class QuizConfig(Config):
    """Configuration optimized for quiz environment"""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # Don't clutter console during quiz
    
    # Optimized for quick setup
    SQLALCHEMY_DATABASE_URI = 'sqlite:///quiz_data.db'
    
    # Larger file size for quiz data
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    
    # Quick database operations
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_timeout': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': False
    }

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'quiz': QuizConfig,
    'default': QuizConfig
}

# Environment variables template
# Create a .env file with these variables for local development:
"""
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# Database Configuration
# For SQLite (default):
DATABASE_URL=sqlite:///quiz_data.db

# For PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost/quiz_db

# For Azure SQL Database:
# DATABASE_URL=mssql+pyodbc://username:password@server.database.windows.net/database?driver=ODBC+Driver+17+for+SQL+Server

# For MySQL:
# DATABASE_URL=mysql+pymysql://username:password@localhost/quiz_db

# Cloud Storage (Optional)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_BUCKET_NAME=your-bucket-name

# Azure Storage (Optional)
# AZURE_STORAGE_CONNECTION_STRING=your-connection-string
# AZURE_CONTAINER_NAME=your-container-name
"""