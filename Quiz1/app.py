from flask import Flask, request, redirect, url_for, flash, render_template_string
import csv
import os
from azure.data.tables import TableServiceClient, TableEntity
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceExistsError
from azure.core.credentials import AzureNamedKeyCredential

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Azure Storage connection strings
AZURE_STORAGE_CONNECTION_STRING = os.environ.get('AZURE_STORAGE_CONNECTION_STRING', '')
BLOB_CONTAINER_NAME = 'images'

def get_table_service():
    if not AZURE_STORAGE_CONNECTION_STRING:
        return None
    
    try:
        return TableServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    except Exception as e:
        print(f"Connection string method failed: {e}")
        # Try alternative method by parsing connection string manually
        try:
            return get_table_service_alternative()
        except Exception as e2:
            print(f"Alternative method also failed: {e2}")
            return None

def get_table_service_alternative():
    """Alternative connection method by parsing connection string components"""
    if not AZURE_STORAGE_CONNECTION_STRING:
        return None
    
    # Parse connection string manually
    parts = {}
    for part in AZURE_STORAGE_CONNECTION_STRING.split(';'):
        if '=' in part:
            key, value = part.split('=', 1)
            parts[key] = value
    
    account_name = parts.get('AccountName')
    account_key = parts.get('AccountKey')
    
    if account_name and account_key:
        account_url = f"https://{account_name}.table.core.windows.net"
        credential = AzureNamedKeyCredential(account_name, account_key)
        return TableServiceClient(endpoint=account_url, credential=credential)
    
    return None

def get_blob_service():
    if not AZURE_STORAGE_CONNECTION_STRING:
        return None
    return BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)

def get_blob_url(blob_name):
    """Generate a public URL for a blob in the images container"""
    if not blob_name:
        return None
    
    # Always use the known storage account name
    return f"https://storagebtn1609.blob.core.windows.net/{BLOB_CONTAINER_NAME}/{blob_name}"

@app.route('/')
def home():
	# Get the profile image URL from blob storage (now always returns correct URL)
	profile_image_src = get_blob_url('m.jpg')
	
	return f'''
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Quiz1 User Management</title>
		<style>
			body {{ font-family: Arial, sans-serif; margin: 40px; text-align: center; }}
			.container {{ max-width: 600px; margin: 0 auto; }}
			.header {{ margin-bottom: 30px; }}
			.name {{ font-size: 28px; font-weight: bold; color: #333; margin-bottom: 15px; }}
			.profile-image {{ max-width: 200px; height: auto; border-radius: 10px; margin-bottom: 30px; }}
			button {{ background-color: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; margin: 10px; border-radius: 5px; }}
			button:hover {{ background-color: #45a049; }}
			.status {{ margin: 20px 0; padding: 10px; border-radius: 5px; }}
			.success {{ background-color: #d4edda; color: #155724; }}
			.error {{ background-color: #f8d7da; color: #721c24; }}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<div class="name">Benjamin Niccum - 11609</div>
				<img src="{profile_image_src}" alt="Profile Picture" class="profile-image">
			</div>
			
			<h2>Quiz1 User Management</h2>
			<p>Upload users from CSV to Azure Table Storage</p>
			
			<form action="/upload_users" method="post">
				<button type="submit">Upload Users from data.csv</button>
			</form>
			
			<form action="/view_users" method="get">
				<button type="submit">View All Users</button>
			</form>
			
			<hr style="margin: 40px 0; border: 1px solid #ddd;">
			
			<h2>Edit User Information</h2>
			<p>Update class or comments for an existing user</p>
			
			<form action="/edit_user" method="post" style="margin: 20px 0;">
				<div style="margin-bottom: 15px;">
					<label for="edit_name" style="display: inline-block; width: 120px; text-align: left;">User Name:</label>
					<input type="text" id="edit_name" name="edit_name" required 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
				</div>
				<button type="submit">Find User to Edit</button>
			</form>
			
			<hr style="margin: 40px 0; border: 1px solid #ddd;">
			
			<h2>Add New User</h2>
			<p>Add a new user with unique name</p>
			
			<form action="/add_user" method="post" style="margin: 20px 0;">
				<div style="margin-bottom: 15px;">
					<label for="new_name" style="display: inline-block; width: 120px; text-align: left;">Name:</label>
					<input type="text" id="new_name" name="new_name" required 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
				</div>
				<div style="margin-bottom: 15px;">
					<label for="new_age" style="display: inline-block; width: 120px; text-align: left;">Age:</label>
					<input type="number" id="new_age" name="new_age" min="0" max="150" required 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
				</div>
				<div style="margin-bottom: 15px;">
					<label for="new_class" style="display: inline-block; width: 120px; text-align: left;">Class:</label>
					<input type="text" id="new_class" name="new_class" 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
				</div>
				<div style="margin-bottom: 15px;">
					<label for="new_comments" style="display: inline-block; width: 120px; text-align: left;">Comments:</label>
					<input type="text" id="new_comments" name="new_comments" 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
				</div>
				<button type="submit">Add New User</button>
			</form>
			
			<hr style="margin: 40px 0; border: 1px solid #ddd;">
			
			<h2>Search Students by Age Range</h2>
			<p>Enter age range to find students within that range (inclusive)</p>
			
			<form action="/search_by_age" method="post" style="margin: 20px 0;">
				<div style="margin-bottom: 15px;">
					<label for="low_age" style="display: inline-block; width: 100px; text-align: left;">Low Age:</label>
					<input type="number" id="low_age" name="low_age" min="0" max="150" required 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100px;">
				</div>
				<div style="margin-bottom: 15px;">
					<label for="high_age" style="display: inline-block; width: 100px; text-align: left;">High Age:</label>
					<input type="number" id="high_age" name="high_age" min="0" max="150" required 
						   style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100px;">
				</div>
				<button type="submit">Search Students</button>
			</form>
		</div>
	</body>
	</html>
	'''

@app.route('/upload_users', methods=['POST'])
def upload_users():
    try:
        table_service = get_table_service()
        if not table_service:
            return render_template_string(status_template("Error: Azure Storage connection not configured"))
        
        # Create or get table
        table_name = "quiz1"
        try:
            table_service.create_table(table_name)
        except ResourceExistsError:
            pass  # Table already exists
        
        table_client = table_service.get_table_client(table_name)
        
        # Read CSV and upload to table
        csv_path = os.path.join(os.path.dirname(__file__), 'data.csv')
        users_added = 0
        
        with open(csv_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Create entity with PartitionKey and RowKey
                entity = {
                    "PartitionKey": "quiz1",
                    "RowKey": row['name'],
                    "age": row['age'] if row['age'] else "",
                    "class": row['class'] if row['class'] else "",
                    "picture": row['picture'] if row['picture'] else "",
                    "comments": row['comments'] if row['comments'] else ""
                }
                
                # Upsert entity (insert or update)
                table_client.upsert_entity(entity)
                users_added += 1
        
        return render_template_string(status_template(f"Success: {users_added} users uploaded to Azure Table Storage"))
        
    except Exception as e:
        return render_template_string(status_template(f"Error: {str(e)}"))

@app.route('/view_users')
def view_users():
    try:
        # Check if connection string is set
        if not AZURE_STORAGE_CONNECTION_STRING:
            return render_template_string(status_template("Error: Azure Storage connection not configured"))
        
        table_service = get_table_service()
        if not table_service:
            return render_template_string(status_template("Error: Could not create table service"))
        
        # Try to get table client
        table_client = table_service.get_table_client("quiz1")
        
        # Try to list entities with more robust error handling
        try:
            # Try to get entities one by one to isolate problematic records
            entities = []
            entity_count = 0
            
            # Use query with select to limit data and avoid corruption issues
            query_results = table_client.query_entities(
                query_filter="PartitionKey eq 'quiz1'",
                select=["RowKey", "age", "class", "picture", "comments"]
            )
            
            for entity in query_results:
                try:
                    # Validate each entity before adding
                    clean_entity = {
                        'RowKey': str(entity.get('RowKey', '')),
                        'age': str(entity.get('age', '')),
                        'class': str(entity.get('class', '')),
                        'picture': str(entity.get('picture', '')),
                        'comments': str(entity.get('comments', ''))
                    }
                    entities.append(clean_entity)
                    entity_count += 1
                except Exception as entity_error:
                    print(f"Skipping problematic entity: {entity_error}")
                    continue
                    
        except Exception as list_error:
            return render_template_string(status_template(f"Error listing entities: {str(list_error)}"))
        
        html = '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quiz1 Users</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .back-btn { margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="back-btn">
                <a href="/">← Back to Home</a>
            </div>
            <h1>Quiz1 Users</h1>
            <table>
                <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Class</th>
                    <th>Picture</th>
                    <th>Comments</th>
                </tr>
        '''
        
        for entity in entities:
            picture_name = entity.get('picture', '')
            picture_url = get_blob_url(picture_name) if picture_name else None
            picture_display = f'<img src="{picture_url}" alt="{picture_name}" style="max-width:100px; max-height:100px;">' if picture_url else picture_name
            
            html += f'''
                <tr>
                    <td>{entity.get('RowKey', '')}</td>
                    <td>{entity.get('age', '')}</td>
                    <td>{entity.get('class', '')}</td>
                    <td>{picture_display}</td>
                    <td>{entity.get('comments', '')}</td>
                </tr>
            '''
        
        html += '''
            </table>
        </body>
        </html>
        '''
        
        return html
        
    except Exception as e:
        return render_template_string(status_template(f"Error: {str(e)}"))

@app.route('/search_by_age', methods=['POST'])
def search_by_age():
    try:
        low_age = int(request.form.get('low_age', 0))
        high_age = int(request.form.get('high_age', 150))
        
        # Validate age range
        if low_age > high_age:
            return render_template_string(status_template("Error: Low age cannot be greater than high age"))
        
        table_service = get_table_service()
        if not table_service:
            return render_template_string(status_template("Error: Azure Storage connection not configured"))
        
        table_client = table_service.get_table_client("quiz1")
        
        # Get all entities and filter by age range using robust method
        try:
            query_results = table_client.query_entities(
                query_filter="PartitionKey eq 'quiz1'",
                select=["RowKey", "age", "class", "picture", "comments"]
            )
            
            all_entities = []
            for entity in query_results:
                try:
                    # Validate each entity before adding
                    clean_entity = {
                        'RowKey': str(entity.get('RowKey', '')),
                        'age': str(entity.get('age', '')),
                        'class': str(entity.get('class', '')),
                        'picture': str(entity.get('picture', '')),
                        'comments': str(entity.get('comments', ''))
                    }
                    all_entities.append(clean_entity)
                except Exception as entity_error:
                    print(f"Skipping problematic entity in search: {entity_error}")
                    continue
        except Exception as query_error:
            return render_template_string(status_template(f"Error querying entities: {str(query_error)}"))
            
        filtered_entities = []
        
        for entity in all_entities:
            age_str = entity.get('age', '')
            if age_str and age_str.isdigit():
                age = int(age_str)
                if low_age <= age <= high_age:
                    filtered_entities.append(entity)
        
        # Generate HTML response
        html = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Age Search Results</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .back-btn {{ margin-bottom: 20px; }}
                .search-info {{ background-color: #e7f3ff; padding: 10px; border-radius: 5px; margin-bottom: 20px; }}
            </style>
        </head>
        <body>
            <div class="back-btn">
                <a href="/">← Back to Home</a>
            </div>
            <h1>Students Age Search Results</h1>
            <div class="search-info">
                <strong>Search Parameters:</strong> Ages {low_age} to {high_age} (inclusive)<br>
                <strong>Results Found:</strong> {len(filtered_entities)} student(s)
            </div>
        '''
        
        if filtered_entities:
            html += '''
            <table>
                <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Class</th>
                    <th>Picture</th>
                    <th>Comments</th>
                </tr>
            '''
            
            for entity in filtered_entities:
                picture_name = entity.get('picture', '')
                picture_url = get_blob_url(picture_name) if picture_name else None
                picture_display = f'<img src="{picture_url}" alt="{picture_name}" style="max-width:100px; max-height:100px;">' if picture_url else picture_name
                
                html += f'''
                    <tr>
                        <td>{entity.get('RowKey', '')}</td>
                        <td>{entity.get('age', '')}</td>
                        <td>{entity.get('class', '')}</td>
                        <td>{picture_display}</td>
                        <td>{entity.get('comments', '')}</td>
                    </tr>
                '''
            
            html += '</table>'
        else:
            html += '<p>No students found in the specified age range.</p>'
        
        html += '''
        </body>
        </html>
        '''
        
        return html
        
    except ValueError:
        return render_template_string(status_template("Error: Please enter valid numbers for ages"))
    except Exception as e:
        return render_template_string(status_template(f"Error: {str(e)}"))

@app.route('/edit_user', methods=['POST'])
def edit_user():
    try:
        name = request.form.get('edit_name', '').strip()
        if not name:
            return render_template_string(status_template("Error: Please enter a name"))
        
        table_service = get_table_service()
        if not table_service:
            return render_template_string(status_template("Error: Azure Storage connection not configured"))
        
        table_client = table_service.get_table_client("quiz1")
        
        # Try to find the user
        try:
            entity = table_client.get_entity(partition_key="quiz1", row_key=name)
        except Exception:
            return render_template_string(status_template(f"Error: User '{name}' not found"))
        
        # Show edit form with current values
        html = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Edit User - {name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .back-btn {{ margin-bottom: 20px; }}
                .form-group {{ margin-bottom: 15px; }}
                label {{ display: inline-block; width: 120px; text-align: left; }}
                input {{ padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px; }}
                button {{ background-color: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="back-btn">
                <a href="/">← Back to Home</a>
            </div>
            <h1>Edit User: {name}</h1>
            <p><strong>Current Values:</strong></p>
            <p>Age: {entity.get('age', 'Not set')}</p>
            <p>Class: {entity.get('class', 'Not set')}</p>
            <p>Comments: {entity.get('comments', 'Not set')}</p>
            
            <form action="/update_user" method="post">
                <input type="hidden" name="user_name" value="{name}">
                <div class="form-group">
                    <label for="class">New Class:</label>
                    <input type="text" id="class" name="class" value="{entity.get('class', '')}">
                </div>
                <div class="form-group">
                    <label for="comments">New Comments:</label>
                    <input type="text" id="comments" name="comments" value="{entity.get('comments', '')}">
                </div>
                <button type="submit">Update User</button>
            </form>
        </body>
        </html>
        '''
        return html
        
    except Exception as e:
        return render_template_string(status_template(f"Error: {str(e)}"))

@app.route('/update_user', methods=['POST'])
def update_user():
    try:
        name = request.form.get('user_name', '').strip()
        new_class = request.form.get('class', '').strip()
        new_comments = request.form.get('comments', '').strip()
        
        table_service = get_table_service()
        if not table_service:
            return render_template_string(status_template("Error: Azure Storage connection not configured"))
        
        table_client = table_service.get_table_client("quiz1")
        
        # Get the existing entity
        entity = table_client.get_entity(partition_key="quiz1", row_key=name)
        
        # Update the fields
        entity['class'] = new_class
        entity['comments'] = new_comments
        
        # Update the entity
        table_client.update_entity(entity)
        
        return render_template_string(status_template(f"Success: Updated user '{name}' successfully"))
        
    except Exception as e:
        return render_template_string(status_template(f"Error: {str(e)}"))

@app.route('/add_user', methods=['POST'])
def add_user():
    try:
        name = request.form.get('new_name', '').strip()
        age = request.form.get('new_age', '').strip()
        user_class = request.form.get('new_class', '').strip()
        comments = request.form.get('new_comments', '').strip()
        
        if not name or not age:
            return render_template_string(status_template("Error: Name and age are required"))
        
        table_service = get_table_service()
        if not table_service:
            return render_template_string(status_template("Error: Azure Storage connection not configured"))
        
        table_client = table_service.get_table_client("quiz1")
        
        # Check if user already exists
        try:
            existing = table_client.get_entity(partition_key="quiz1", row_key=name)
            return render_template_string(status_template(f"Error: User '{name}' already exists. Names must be unique."))
        except:
            pass  # User doesn't exist, which is what we want
        
        # Create new entity
        entity = {
            "PartitionKey": "quiz1",
            "RowKey": name,
            "age": age,
            "class": user_class,
            "picture": "",  # Empty picture field
            "comments": comments
        }
        
        # Insert the entity
        table_client.create_entity(entity)
        
        return render_template_string(status_template(f"Success: Added new user '{name}' successfully"))
        
    except Exception as e:
        return render_template_string(status_template(f"Error: {str(e)}"))

def status_template(message):
    css_class = "success" if "Success" in message else "error"
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Status</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .status {{ margin: 20px 0; padding: 10px; border-radius: 5px; }}
            .success {{ background-color: #d4edda; color: #155724; }}
            .error {{ background-color: #f8d7da; color: #721c24; }}
            .back-btn {{ margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="status {css_class}">
            {message}
        </div>
        <div class="back-btn">
            <a href="/">← Back to Home</a>
        </div>
    </body>
    </html>
    '''

if __name__ == '__main__':
	app.run(host='0.0.0.0', port=5000)
