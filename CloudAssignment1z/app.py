from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import csv
import os
import io
from datetime import datetime
from azure.storage.blob import BlobServiceClient
from azure.data.tables import TableServiceClient, TableEntity
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'cloud-picture-storage-secret')

# Azure Storage configuration - Uses Azure Managed Identity (no secrets needed!)
STORAGE_ACCOUNT_NAME = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME', 'storagebtn1609')

# Initialize Azure clients using DefaultAzureCredential (no keys needed!)
try:
    # This automatically uses Managed Identity when deployed to Azure
    credential = DefaultAzureCredential()
    blob_service = BlobServiceClient(
        account_url=f"https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net", 
        credential=credential
    )
    table_service = TableServiceClient(
        endpoint=f"https://{STORAGE_ACCOUNT_NAME}.table.core.windows.net", 
        credential=credential
    )
    print("✅ Connected to Azure using Managed Identity")
except Exception as e:
    print(f"⚠️ Azure connection failed: {e}")
    # Fallback for local development (will work without credentials for basic testing)
    blob_service = None
    table_service = None

@app.route('/')
def index():
    messages = request.args.get('messages', '')
    
    return f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloud Picture Storage System</title>
    <style>
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .container {{ 
            max-width: 900px; 
            margin: 0 auto; 
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{ margin: 0; font-size: 2.5em; }}
        .header p {{ margin: 10px 0 0 0; opacity: 0.9; }}
        .section {{ 
            margin: 0; 
            padding: 25px; 
            border-bottom: 1px solid #eee;
        }}
        .section:last-child {{ border-bottom: none; }}
        .section h2 {{ 
            color: #333; 
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .form-group {{
            margin: 15px 0;
        }}
        button {{ 
            padding: 12px 25px; 
            margin: 5px; 
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }}
        .btn-primary {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .btn-primary:hover {{
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }}
        .btn-danger {{
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
        }}
        .btn-danger:hover {{
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
        }}
        input[type="text"], input[type="number"], input[type="file"] {{ 
            padding: 12px; 
            margin: 5px; 
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }}
        input[type="text"]:focus, input[type="number"]:focus {{
            border-color: #667eea;
            outline: none;
        }}
        .message {{
            padding: 15px;
            margin: 10px 25px;
            border-radius: 8px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }}
        .form-row {{
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }}
        .emoji {{ font-size: 1.2em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌩️ Cloud Picture Storage System</h1>
            <p>Upload CSV data and pictures, then search and manage your data with Azure</p>
        </div>
        
        {f'<div class="message">{messages}</div>' if messages else ''}
        
        <div class="section">
            <h2><span class="emoji">📁</span> Upload CSV File</h2>
            <form action="/upload_csv" method="post" enctype="multipart/form-data">
                <div class="form-row">
                    <input type="file" name="csv_file" accept=".csv" required>
                    <button type="submit" class="btn-primary">Upload CSV</button>
                </div>
                <small>Upload your people.csv file to populate the database</small>
            </form>
        </div>
        
        <div class="section">
            <h2><span class="emoji">📸</span> Upload Pictures</h2>
            <form action="/upload_pictures" method="post" enctype="multipart/form-data">
                <div class="form-row">
                    <input type="file" name="picture_files" accept="image/*" multiple required>
                    <button type="submit" class="btn-primary">Upload Pictures</button>
                </div>
                <small>Select multiple image files to upload to Azure Blob Storage</small>
            </form>
        </div>
        
        <div class="section">
            <h2><span class="emoji">🔍</span> Search by Name</h2>
            <form action="/search_name" method="get">
                <div class="form-row">
                    <input type="text" name="name" placeholder="Enter name (e.g., Tanzima)" required>
                    <button type="submit" class="btn-primary">Search</button>
                </div>
                <small>Find a specific person and display their picture</small>
            </form>
        </div>
        
        <div class="section">
            <h2><span class="emoji">💰</span> Search by Salary</h2>
            <form action="/search_salary" method="get">
                <div class="form-row">
                    <input type="number" name="max_salary" placeholder="Maximum salary (e.g., 99000)" required>
                    <button type="submit" class="btn-primary">Find People</button>
                </div>
                <small>Display all people with salary less than the specified amount</small>
            </form>
        </div>
        
        <div class="section">
            <h2><span class="emoji">✏️</span> Update Person</h2>
            <form action="/update_person" method="post">
                <div class="form-group">
                    <input type="text" name="name" placeholder="Person's name" required>
                    <input type="text" name="field" placeholder="Field to update (e.g., Keywords)" required>
                    <input type="text" name="value" placeholder="New value" required>
                </div>
                <button type="submit" class="btn-primary">Update</button>
                <br><small>Update any field for a person (e.g., change Tuan's keywords)</small>
            </form>
        </div>
        
        <div class="section">
            <h2><span class="emoji">🗑️</span> Remove Person</h2>
            <form action="/remove_person" method="post" onsubmit="return confirm('Are you sure?')">
                <div class="form-row">
                    <input type="text" name="name" placeholder="Person's name" required>
                    <button type="submit" class="btn-danger">Remove Person</button>
                </div>
                <small>Permanently delete a person from the database</small>
            </form>
        </div>
    </div>
</body>
</html>
    '''

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    if not table_service:
        return redirect('/?messages=❌ Azure Table Storage not available')
    
    try:
        file = request.files['csv_file']
        if file and file.filename.endswith('.csv'):
            csv_content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            
            table_client = table_service.get_table_client('people')
            
            count = 0
            for row in csv_reader:
                entity = {
                    'PartitionKey': 'person',
                    'RowKey': row.get('Name', f'person_{count}'),
                    'Name': row.get('Name', ''),
                    'State': row.get('State', ''),
                    'Salary': row.get('Salary', ''),
                    'Grade': row.get('Grade', ''),
                    'Room': row.get('Room', ''),
                    'Phone': row.get('Phone', ''),
                    'Picture': row.get('Picture', ''),
                    'Keywords': row.get('Keywords', '')
                }
                
                try:
                    table_client.upsert_entity(entity)
                    count += 1
                except Exception as e:
                    print(f"Error uploading entity: {e}")
            
            return redirect(f'/?messages=✅ Successfully uploaded {count} people to Azure!')
        else:
            return redirect('/?messages=❌ Please select a valid CSV file')
    except Exception as e:
        return redirect(f'/?messages=❌ Error uploading CSV: {str(e)}')

@app.route('/upload_pictures', methods=['POST'])
def upload_pictures():
    if not blob_service:
        return redirect('/?messages=❌ Azure Blob Storage not available')
    
    try:
        files = request.files.getlist('picture_files')
        blob_container = blob_service.get_container_client('images')
        
        count = 0
        for file in files:
            if file and file.filename:
                try:
                    blob_container.upload_blob(
                        name=file.filename,
                        data=file.read(),
                        overwrite=True
                    )
                    count += 1
                except Exception as e:
                    print(f"Error uploading {file.filename}: {e}")
        
        return redirect(f'/?messages=✅ Uploaded {count} pictures to Azure!')
    except Exception as e:
        return redirect(f'/?messages=❌ Error uploading pictures: {str(e)}')

@app.route('/search_name')
def search_name():
    name = request.args.get('name', '').strip()
    if not name:
        return redirect('/?messages=❌ Please enter a name')
    
    if not table_service:
        return redirect('/?messages=❌ Azure Table Storage not available')
    
    try:
        table_client = table_service.get_table_client('people')
        entities = table_client.query_entities(f"PartitionKey eq 'person' and Name eq '{name}'")
        person = None
        for entity in entities:
            person = entity
            break
        
        if person:
            picture_url = ""
            if person.get('Picture'):
                # Use public blob URL (works if container is public)
                picture_url = f"https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net/images/{person['Picture']}"
            
            return f'''
            <div style="font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px;">
                <h1>🔍 Search Results for: {name}</h1>
                <div style="border: 2px solid #4facfe; padding: 20px; border-radius: 10px; background: white;">
                    <h2>👤 {person.get('Name', 'N/A')}</h2>
                    {f'<img src="{picture_url}" alt="{name}" style="max-width: 200px; margin: 10px 0; border-radius: 8px;">' if picture_url else '<p>📷 No picture available</p>'}
                    <p><strong>State:</strong> {person.get('State', 'N/A')}</p>
                    <p><strong>Salary:</strong> ${person.get('Salary', 'N/A')}</p>
                    <p><strong>Grade:</strong> {person.get('Grade', 'N/A')}</p>
                    <p><strong>Room:</strong> {person.get('Room', 'N/A')}</p>
                    <p><strong>Phone:</strong> {person.get('Phone', 'N/A')}</p>
                    <p><strong>Keywords:</strong> {person.get('Keywords', 'N/A')}</p>
                </div>
                <a href="/" style="margin-top: 20px; display: inline-block; padding: 10px 20px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px;">← Back to Home</a>
            </div>
            '''
        else:
            return redirect(f'/?messages=❌ No person found: {name}')
    
    except Exception as e:
        return redirect(f'/?messages=❌ Search error: {str(e)}')

@app.route('/search_salary')
def search_salary():
    max_salary = request.args.get('max_salary')
    if not max_salary:
        return redirect('/?messages=❌ Please enter a salary')
    
    if not table_service:
        return redirect('/?messages=❌ Azure Table Storage not available')
    
    try:
        max_sal = float(max_salary)
        table_client = table_service.get_table_client('people')
        entities = table_client.query_entities("PartitionKey eq 'person'")
        matching_people = []
        
        for entity in entities:
            try:
                salary_str = entity.get('Salary', '0').replace('$', '').replace(',', '')
                if salary_str and salary_str.replace('.', '').isdigit():
                    salary = float(salary_str)
                    if salary < max_sal:
                        matching_people.append(entity)
                elif not salary_str or salary_str.lower() in ['n/a', '', 'null']:
                    matching_people.append(entity)
            except ValueError:
                matching_people.append(entity)
        
        if matching_people:
            result_html = f'<div style="font-family: Arial; max-width: 1000px; margin: 50px auto; padding: 20px;"><h1>💰 People with salary less than ${max_salary}</h1>'
            result_html += '<div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0;">'
            
            for person in matching_people:
                picture_url = ""
                if person.get('Picture'):
                    picture_url = f"https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net/images/{person['Picture']}"
                
                result_html += f'''
                <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; min-width: 250px; background: white;">
                    <h3>👤 {person.get('Name', 'N/A')}</h3>
                    {f'<img src="{picture_url}" alt="{person.get("Name", "")}" style="max-width: 150px; border-radius: 5px;">' if picture_url else '<p>📷 No picture</p>'}
                    <p><strong>State:</strong> {person.get('State', 'N/A')}</p>
                    <p><strong>Salary:</strong> ${person.get('Salary', 'N/A')}</p>
                </div>
                '''
            
            result_html += '</div><a href="/" style="padding: 10px 20px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px;">← Back</a></div>'
            return result_html
        else:
            return redirect(f'/?messages=❌ No people found with salary < ${max_salary}')
    
    except Exception as e:
        return redirect(f'/?messages=❌ Error: {str(e)}')

@app.route('/update_person', methods=['POST'])
def update_person():
    name = request.form.get('name', '').strip()
    field = request.form.get('field', '').strip()
    value = request.form.get('value', '').strip()
    
    if not all([name, field, value]):
        return redirect('/?messages=❌ Please fill all fields')
    
    if not table_service:
        return redirect('/?messages=❌ Azure Table Storage not available')
    
    try:
        table_client = table_service.get_table_client('people')
        entities = table_client.query_entities(f"PartitionKey eq 'person' and Name eq '{name}'")
        person = None
        for entity in entities:
            person = entity
            break
        
        if person:
            person[field] = value
            table_client.upsert_entity(person)
            return redirect(f'/?messages=✅ Updated {field} for {name}!')
        else:
            return redirect(f'/?messages=❌ {name} not found')
    
    except Exception as e:
        return redirect(f'/?messages=❌ Update error: {str(e)}')

@app.route('/remove_person', methods=['POST'])
def remove_person():
    name = request.form.get('name', '').strip()
    if not name:
        return redirect('/?messages=❌ Please enter a name')
    
    if not table_service:
        return redirect('/?messages=❌ Azure Table Storage not available')
    
    try:
        table_client = table_service.get_table_client('people')
        entities = table_client.query_entities(f"PartitionKey eq 'person' and Name eq '{name}'")
        deleted = False
        for entity in entities:
            table_client.delete_entity(partition_key='person', row_key=entity['RowKey'])
            deleted = True
            break
        
        if deleted:
            return redirect(f'/?messages=✅ Removed {name}!')
        else:
            return redirect(f'/?messages=❌ {name} not found')
    
    except Exception as e:
        return redirect(f'/?messages=❌ Error: {str(e)}')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
