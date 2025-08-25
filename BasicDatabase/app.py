import os
import csv
import re
from flask import Flask, request, render_template_string, redirect, url_for, flash, send_from_directory, abort

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Validation functions
def validate_name(name):
    """Validate name field - only letters, spaces, hyphens, apostrophes"""
    if not name or not name.strip():
        return False, "Name cannot be empty"
    
    if len(name.strip()) > 50:
        return False, "Name must be 50 characters or less"
    
    # Allow letters, spaces, hyphens, apostrophes, and periods
    if not re.match(r"^[a-zA-Z\s\-'\.]+$", name.strip()):
        return False, "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
    
    return True, ""

def validate_state(state):
    """Validate state field - 2 letter state code or full state name"""
    if not state or not state.strip():
        return True, ""  # Optional field
    
    state = state.strip().upper()
    
    # Allow 2-letter state codes or full state names (letters only)
    if len(state) == 2:
        if not re.match(r"^[A-Z]{2}$", state):
            return False, "State code must be 2 uppercase letters (e.g., CA, NY)"
    elif len(state) <= 20:
        if not re.match(r"^[a-zA-Z\s]+$", state):
            return False, "State name can only contain letters and spaces"
    else:
        return False, "State must be 2-letter code or state name (20 characters max)"
    
    return True, ""

def validate_salary(salary):
    """Validate salary field - numbers only, optional commas"""
    if not salary or not salary.strip():
        return True, ""  # Optional field
    
    # Remove commas and dollar signs for validation
    clean_salary = salary.strip().replace(',', '').replace('$', '')
    
    if not re.match(r"^\d+(\.\d{2})?$", clean_salary):
        return False, "Salary must be a valid number (e.g., 50000 or 50000.00)"
    
    try:
        amount = float(clean_salary)
        if amount < 0 or amount > 10000000:
            return False, "Salary must be between 0 and 10,000,000"
    except ValueError:
        return False, "Invalid salary format"
    
    return True, ""

def validate_grade(grade):
    """Validate grade field - predefined levels"""
    if not grade or not grade.strip():
        return True, ""  # Optional field
    
    valid_grades = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'Executive']
    
    if grade.strip() not in valid_grades:
        return False, f"Grade must be one of: {', '.join(valid_grades)}"
    
    return True, ""

def validate_room(room):
    """Validate room field - alphanumeric room numbers"""
    if not room or not room.strip():
        return True, ""  # Optional field
    
    if len(room.strip()) > 10:
        return False, "Room number must be 10 characters or less"
    
    # Allow letters, numbers, and hyphens (e.g., A101, 2B, B-204)
    if not re.match(r"^[a-zA-Z0-9\-]+$", room.strip()):
        return False, "Room number can only contain letters, numbers, and hyphens"
    
    return True, ""

def validate_telnum(telnum):
    """Validate telephone number - various phone formats"""
    if not telnum or not telnum.strip():
        return True, ""  # Optional field
    
    # Remove all non-digit characters for validation
    digits_only = re.sub(r'[^\d]', '', telnum.strip())
    
    # Must be 10 digits (US phone number)
    if len(digits_only) != 10:
        return False, "Phone number must contain exactly 10 digits"
    
    return True, ""

def validate_picture(picture):
    """Validate picture field - image file extensions only"""
    if not picture or not picture.strip():
        return True, ""  # Optional field
    
    if len(picture.strip()) > 100:
        return False, "Picture filename must be 100 characters or less"
    
    # Must end with valid image extension
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    picture_lower = picture.strip().lower()
    
    if not any(picture_lower.endswith(ext) for ext in valid_extensions):
        return False, f"Picture must be an image file: {', '.join(valid_extensions)}"
    
    # Check for valid filename characters
    if not re.match(r"^[a-zA-Z0-9\-_\.]+$", picture.strip()):
        return False, "Picture filename can only contain letters, numbers, hyphens, underscores, and periods"
    
    return True, ""

def validate_keywords(keywords):
    """Validate keywords field - text with reasonable restrictions"""
    if not keywords or not keywords.strip():
        return True, ""  # Optional field
    
    if len(keywords.strip()) > 200:
        return False, "Keywords must be 200 characters or less"
    
    # Allow letters, numbers, spaces, commas, and basic punctuation
    if not re.match(r"^[a-zA-Z0-9\s,\.\-_]+$", keywords.strip()):
        return False, "Keywords can only contain letters, numbers, spaces, commas, periods, hyphens, and underscores"
    
    return True, ""

def validate_member_data(data):
    """Validate all member data fields"""
    validations = [
        ('Name', validate_name(data.get('name', ''))),
        ('State', validate_state(data.get('state', ''))),
        ('Salary', validate_salary(data.get('salary', ''))),
        ('Grade', validate_grade(data.get('grade', ''))),
        ('Room', validate_room(data.get('room', ''))),
        ('Phone', validate_telnum(data.get('telnum', ''))),
        ('Picture', validate_picture(data.get('picture', ''))),
        ('Keywords', validate_keywords(data.get('keywords', '')))
    ]
    
    errors = []
    for field_name, (is_valid, error_msg) in validations:
        if not is_valid:
            errors.append(f"{field_name}: {error_msg}")
    
    return len(errors) == 0, errors

# HTML template with embedded CSS
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basic Database App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2 {
            color: #333;
        }
        h1 {
            text-align: center;
        }
        .search-form, .add-form {
            margin-bottom: 30px;
            text-align: center;
        }
        .search-form input[type="text"], .add-form input[type="text"] {
            padding: 10px;
            width: 300px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 5px;
        }
        .search-form input[type="submit"], .add-form input[type="submit"], .btn {
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .btn-danger {
            background-color: #dc3545;
        }
        .btn-warning {
            background-color: #ffc107;
            color: #212529;
        }
        .search-form input[type="submit"]:hover, .add-form input[type="submit"]:hover, .btn:hover {
            opacity: 0.8;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .missing-data {
            color: #999;
            font-style: italic;
        }
        .stats {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #e9ecef;
            border-radius: 4px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }
        .form-grid input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .actions {
            white-space: nowrap;
        }
        .flash-messages {
            margin-bottom: 20px;
        }
        .flash-success {
            background-color: #d4edda;
            color: #155724;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .flash-error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .toggle-form {
            margin-bottom: 20px;
        }
        .form-section {
            display: none;
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .form-section.active {
            display: block;
        }
        .image-thumbnail {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid #ddd;
            transition: border-color 0.3s;
        }
        .image-thumbnail:hover {
            border-color: #007bff;
        }
        .no-image {
            width: 60px;
            height: 60px;
            background-color: #f8f9fa;
            border: 2px dashed #ddd;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #666;
            cursor: pointer;
        }
        .image-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            justify-content: center;
            align-items: center;
        }
        .image-modal.active {
            display: flex;
        }
        .modal-content {
            max-width: 90%;
            max-height: 80%;
            border-radius: 8px;
            position: relative;
        }
        .modal-close {
            position: absolute;
            top: -40px;
            right: 0;
            color: white;
            font-size: 30px;
            font-weight: bold;
            cursor: pointer;
            background: rgba(0,0,0,0.5);
            padding: 5px 10px;
            border-radius: 4px;
        }
        .modal-close:hover {
            background: rgba(0,0,0,0.8);
        }
        .modal-actions {
            position: absolute;
            bottom: -60px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
        }
        .modal-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: opacity 0.3s;
        }
        .modal-btn:hover {
            opacity: 0.8;
        }
        .modal-btn-change {
            background-color: #007bff;
            color: white;
        }
        .modal-btn-delete {
            background-color: #dc3545;
            color: white;
        }
        .modal-caption {
            text-align: center;
            color: white;
            margin-top: 10px;
            font-size: 16px;
            font-weight: bold;
        }
    </style>
    <script>
        function toggleForm(formId) {
            var form = document.getElementById(formId);
            if (form.classList.contains('active')) {
                form.classList.remove('active');
            } else {
                // Hide all forms first
                var forms = document.querySelectorAll('.form-section');
                forms.forEach(function(f) { f.classList.remove('active'); });
                // Show the selected form
                form.classList.add('active');
            }
        }
        
        function confirmDelete(name) {
            return confirm('Are you sure you want to delete ' + name + '?');
        }
        
        function editField(name, field, currentValue) {
            let promptMessage = 'Edit ' + field + ' for ' + name + ':';
            let validationHint = '';
            
            switch(field) {
                case 'Name':
                    validationHint = '\\n(Letters, spaces, hyphens, apostrophes, periods only - max 50 chars)';
                    break;
                case 'State':
                    validationHint = '\\n(2-letter code like CA, NY or full state name)';
                    break;
                case 'Salary':
                    validationHint = '\\n(Numbers only, 0-10,000,000)';
                    break;
                case 'Grade':
                    validationHint = '\\n(Entry, Junior, Mid, Senior, Lead, Manager, Director, VP, Executive)';
                    break;
                case 'Room':
                    validationHint = '\\n(Letters, numbers, hyphens only - max 10 chars)';
                    break;
                case 'Telnum':
                    validationHint = '\\n(10-digit phone number)';
                    break;
                case 'Picture':
                    validationHint = '\\n(Image filename ending in .jpg, .png, .gif, etc.)';
                    break;
                case 'Keywords':
                    validationHint = '\\n(Letters, numbers, spaces, commas, periods, hyphens - max 200 chars)';
                    break;
            }
            
            var newValue = prompt(promptMessage + validationHint, currentValue || '');
            if (newValue !== null) {
                document.getElementById('edit_name').value = name;
                document.getElementById('edit_field').value = field;
                document.getElementById('edit_value').value = newValue;
                document.getElementById('edit_form').submit();
            }
        }
        
        function showImageModal(imageSrc, altText, personName) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            const modalCaption = document.getElementById('modalCaption');
            const changeBtn = document.getElementById('modalChangeBtn');
            const deleteBtn = document.getElementById('modalDeleteBtn');
            
            modal.classList.add('active');
            modalImg.src = imageSrc;
            modalCaption.textContent = personName;
            
            // Set up button actions
            changeBtn.onclick = function() {
                closeImageModal();
                editPictureField(personName, getFilenameFromPath(imageSrc));
            };
            
            deleteBtn.onclick = function() {
                if (confirm('Are you sure you want to remove the picture for ' + personName + '?')) {
                    closeImageModal();
                    // Set picture field to empty
                    document.getElementById('edit_name').value = personName;
                    document.getElementById('edit_field').value = 'Picture';
                    document.getElementById('edit_value').value = '';
                    document.getElementById('edit_form').submit();
                }
            };
        }
        
        function showNoImageModal(personName) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            const modalCaption = document.getElementById('modalCaption');
            const changeBtn = document.getElementById('modalChangeBtn');
            const deleteBtn = document.getElementById('modalDeleteBtn');
            
            modal.classList.add('active');
            modalImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
            modalCaption.textContent = personName + ' - No Image';
            
            // Only show change button for no image
            changeBtn.style.display = 'inline-block';
            changeBtn.textContent = 'Add Image';
            deleteBtn.style.display = 'none';
            
            changeBtn.onclick = function() {
                closeImageModal();
                editPictureField(personName, '');
            };
        }
        
        function getFilenameFromPath(path) {
            return path.split('/').pop();
        }
        
        function closeImageModal() {
            const modal = document.getElementById('imageModal');
            const changeBtn = document.getElementById('modalChangeBtn');
            const deleteBtn = document.getElementById('modalDeleteBtn');
            
            modal.classList.remove('active');
            
            // Reset button states
            changeBtn.style.display = 'inline-block';
            changeBtn.textContent = 'Change Image';
            deleteBtn.style.display = 'inline-block';
        }
        
        function editPictureField(name, currentValue) {
            // Special handling for picture field to show current image
            let message = 'Edit Picture for ' + name + ':\\n(Image filename ending in .jpg, .png, .gif, etc.)';
            if (currentValue) {
                message += '\\nCurrent: ' + currentValue;
            }
            
            var newValue = prompt(message, currentValue || '');
            if (newValue !== null) {
                document.getElementById('edit_name').value = name;
                document.getElementById('edit_field').value = 'Picture';
                document.getElementById('edit_value').value = newValue;
                document.getElementById('edit_form').submit();
            }
        }
        
        // Close modal when clicking outside the image
        document.addEventListener('click', function(event) {
            const modal = document.getElementById('imageModal');
            if (event.target === modal) {
                closeImageModal();
            }
        });
    </script>
</head>
<body>
    <div class="container">
        <h1>Basic Database Application</h1>
        
        <!-- Flash Messages -->
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                <div class="flash-messages">
                    {% for category, message in messages %}
                        <div class="flash-{{ 'success' if category == 'success' else 'error' }}">
                            {{ message }}
                        </div>
                    {% endfor %}
                </div>
            {% endif %}
        {% endwith %}
        
        <!-- Toggle Buttons -->
        <div class="toggle-form">
            <button onclick="toggleForm('add-member-form')" class="btn">Add New Member</button>
        </div>
        
        <!-- Add Member Form -->
        <div id="add-member-form" class="form-section">
            <h2>Add New Member</h2>
            <form method="post" action="/add">
                <div class="form-grid">
                    <input type="text" name="name" placeholder="Name *" required maxlength="50" pattern="[a-zA-Z\s\-'\.]+">
                    <select name="state">
                        <option value="">Select State (Optional)</option>
                        <option value="AL">Alabama</option>
                        <option value="CA">California</option>
                        <option value="FL">Florida</option>
                        <option value="NY">New York</option>
                        <option value="TX">Texas</option>
                        <option value="WA">Washington</option>
                        <!-- Add more states as needed -->
                    </select>
                    <input type="number" name="salary" placeholder="Salary (Optional)" min="0" max="10000000" step="0.01">
                    <select name="grade">
                        <option value="">Select Grade (Optional)</option>
                        <option value="Entry">Entry</option>
                        <option value="Junior">Junior</option>
                        <option value="Mid">Mid</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                        <option value="Manager">Manager</option>
                        <option value="Director">Director</option>
                        <option value="VP">VP</option>
                        <option value="Executive">Executive</option>
                    </select>
                    <input type="text" name="room" placeholder="Room (Optional)" maxlength="10" pattern="[a-zA-Z0-9\-]+">
                    <input type="tel" name="telnum" placeholder="Phone (Optional)" pattern="[0-9\-\(\)\s\+\.]{10,15}">
                    <input type="text" name="picture" placeholder="Image filename (Optional)" maxlength="100" pattern="[a-zA-Z0-9\-_\.]+\.(jpg|jpeg|png|gif|bmp|webp)">
                    <input type="text" name="keywords" placeholder="Keywords (Optional)" maxlength="200" pattern="[a-zA-Z0-9\s,\.\-_]+">
                </div>
                <input type="submit" value="Add Member" class="btn">
            </form>
        </div>
        
        <!-- Search Form -->
        <div class="search-form">
            <form method="post" action="/">
                <input type="text" name="search_term" placeholder="Search by name, state, or keywords..." 
                       value="{{ search_term or '' }}">
                <input type="submit" value="Search">
                <a href="/" class="btn">Clear</a>
            </form>
        </div>

        {% if search_term %}
            <div class="stats">
                <strong>Search Results for "{{ search_term }}":</strong> {{ results|length }} record(s) found
            </div>
        {% else %}
            <div class="stats">
                <strong>Total Records:</strong> {{ results|length }}
            </div>
        {% endif %}

        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>State</th>
                    <th>Salary</th>
                    <th>Grade</th>
                    <th>Room</th>
                    <th>Phone</th>
                    <th>Picture</th>
                    <th>Keywords</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {% for row in results %}
                <tr>
                    <td onclick="editField('{{ row['Name'] }}', 'Name', '{{ row['Name'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ row['Name'] or '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td onclick="editField('{{ row['Name'] }}', 'State', '{{ row['State'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ row['State'] or '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td onclick="editField('{{ row['Name'] }}', 'Salary', '{{ row['Salary'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ ('$' + row['Salary']) if row['Salary'] else '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td onclick="editField('{{ row['Name'] }}', 'Grade', '{{ row['Grade'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ row['Grade'] or '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td onclick="editField('{{ row['Name'] }}', 'Room', '{{ row['Room'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ row['Room'] or '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td onclick="editField('{{ row['Name'] }}', 'Telnum', '{{ row['Telnum'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ row['Telnum'] or '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td onclick="{% if row['Picture'] %}showImageModal('/images/{{ row['Picture'] }}', '{{ row['Name'] }}'s photo', '{{ row['Name'] }}'){% else %}showNoImageModal('{{ row['Name'] }}'){% endif %}" style="cursor: pointer;" title="Click to view and edit">
                        {% if row['Picture'] %}
                            <img src="/images/{{ row['Picture'] }}" 
                                 alt="{{ row['Name'] }}'s photo" 
                                 class="image-thumbnail" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="no-image" style="display: none;">
                                Missing
                            </div>
                        {% else %}
                            <div class="no-image">
                                No image
                            </div>
                        {% endif %}
                    </td>
                    <td onclick="editField('{{ row['Name'] }}', 'Keywords', '{{ row['Keywords'] }}')" style="cursor: pointer;" title="Click to edit">
                        {{ row['Keywords'] or '<span class="missing-data">N/A</span>' | safe }}
                    </td>
                    <td class="actions">
                        <a href="/delete/{{ row['Name'] }}" onclick="return confirmDelete('{{ row['Name'] }}')" class="btn btn-danger">Delete</a>
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        {% if not results %}
            <p style="text-align: center; color: #666; margin-top: 30px;">
                No records found. {% if search_term %}Try a different search term.{% endif %}
            </p>
        {% endif %}
        
        <!-- Hidden form for editing individual fields -->
        <form id="edit_form" method="post" action="/edit" style="display: none;">
            <input type="hidden" id="edit_name" name="name">
            <input type="hidden" id="edit_field" name="field">
            <input type="hidden" id="edit_value" name="value">
        </form>
        
        <!-- Image Modal -->
        <div id="imageModal" class="image-modal">
            <span class="modal-close" onclick="closeImageModal()">&times;</span>
            <img id="modalImage" class="modal-content" alt="">
            <div class="modal-actions">
                <button id="modalChangeBtn" class="modal-btn modal-btn-change">Change Image</button>
                <button id="modalDeleteBtn" class="modal-btn modal-btn-delete">Remove Image</button>
            </div>
            <div id="modalCaption" class="modal-caption"></div>
        </div>
    </div>
</body>
</html>
"""

def load_csv_data():
    """Load data from CSV file"""
    data = []
    csv_file = os.path.join(os.path.dirname(__file__), 'people.csv')
    
    try:
        with open(csv_file, 'r', newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
    except FileNotFoundError:
        # Return sample data if CSV file doesn't exist
        data = [
            {'Name': 'John Doe', 'State': 'CA', 'Salary': '75000', 'Grade': 'Senior', 
             'Room': '101', 'Telnum': '555-0123', 'Picture': '', 'Keywords': 'developer python'},
            {'Name': 'Jane Smith', 'State': 'NY', 'Salary': '', 'Grade': 'Manager', 
             'Room': '205', 'Telnum': '555-0124', 'Picture': 'jane.jpg', 'Keywords': 'manager team lead'}
        ]
    
    return data

def save_csv_data(data):
    """Save data to CSV file"""
    csv_file = os.path.join(os.path.dirname(__file__), 'people.csv')
    
    if not data:
        return False
    
    try:
        with open(csv_file, 'w', newline='', encoding='utf-8') as file:
            fieldnames = ['Name', 'State', 'Salary', 'Grade', 'Room', 'Telnum', 'Picture', 'Keywords']
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            
            writer.writeheader()
            for row in data:
                writer.writerow(row)
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

def find_member_by_name(data, name):
    """Find a member by name"""
    for i, row in enumerate(data):
        if row.get('Name', '').lower() == name.lower():
            return i, row
    return None, None

def add_member(data, member_data):
    """Add a new member to the data"""
    # Validate all fields first
    is_valid, errors = validate_member_data(member_data)
    if not is_valid:
        return False, "; ".join(errors)
    
    # Check if member already exists
    _, existing = find_member_by_name(data, member_data.get('name', ''))
    if existing:
        return False, "Member with this name already exists"
    
    # Clean and prepare data
    new_member = {
        'Name': member_data.get('name', '').strip(),
        'State': member_data.get('state', '').strip().upper() if member_data.get('state') else '',
        'Salary': member_data.get('salary', '').strip(),
        'Grade': member_data.get('grade', '').strip(),
        'Room': member_data.get('room', '').strip(),
        'Telnum': member_data.get('telnum', '').strip(),
        'Picture': member_data.get('picture', '').strip(),
        'Keywords': member_data.get('keywords', '').strip()
    }
    
    if not new_member['Name']:
        return False, "Name is required"
    
    data.append(new_member)
    return True, "Member added successfully"

def edit_member_field(data, name, field, value):
    """Edit a specific field for a member"""
    index, member = find_member_by_name(data, name)
    if member is None:
        return False, "Member not found"
    
    # Map frontend field names to CSV field names and validation functions
    field_mapping = {
        'Name': ('Name', validate_name),
        'State': ('State', validate_state), 
        'Salary': ('Salary', validate_salary),
        'Grade': ('Grade', validate_grade),
        'Room': ('Room', validate_room),
        'Telnum': ('Telnum', validate_telnum),
        'Picture': ('Picture', validate_picture),
        'Keywords': ('Keywords', validate_keywords)
    }
    
    if field not in field_mapping:
        return False, "Invalid field"
    
    csv_field, validation_func = field_mapping[field]
    
    # Validate the new value
    is_valid, error_msg = validation_func(value)
    if not is_valid:
        return False, error_msg
    
    # Special handling for name changes
    if field == 'Name' and value.strip():
        # Check if new name already exists
        _, existing = find_member_by_name(data, value.strip())
        if existing and existing != member:
            return False, "A member with this name already exists"
    
    # Clean the value
    clean_value = value.strip()
    if field == 'State' and clean_value:
        clean_value = clean_value.upper()
    
    data[index][csv_field] = clean_value
    return True, f"{field} updated successfully"

def delete_member(data, name):
    """Delete a member from the data"""
    index, member = find_member_by_name(data, name)
    if member is None:
        return False, "Member not found"
    
    data.pop(index)
    return True, "Member deleted successfully"

def search_data(data, search_term):
    """Search through data based on search term"""
    if not search_term:
        return data
    
    search_term = search_term.lower()
    results = []
    
    for row in data:
        # Search in Name, State, and Keywords fields
        if (search_term in row.get('Name', '').lower() or 
            search_term in row.get('State', '').lower() or 
            search_term in row.get('Keywords', '').lower()):
            results.append(row)
    
    return results

@app.route("/", methods=["GET", "POST"])
def index():
    search_term = ""
    data = load_csv_data()
    
    if request.method == "POST":
        search_term = request.form.get("search_term", "").strip()
    
    results = search_data(data, search_term)
    
    return render_template_string(HTML_TEMPLATE, 
                                results=results, 
                                search_term=search_term)

@app.route("/add", methods=["POST"])
def add_member_route():
    data = load_csv_data()
    success, message = add_member(data, request.form)
    
    if success:
        if save_csv_data(data):
            flash(message, 'success')
        else:
            flash('Failed to save data', 'error')
    else:
        flash(message, 'error')
    
    return redirect(url_for('index'))

@app.route("/edit", methods=["POST"])
def edit_member_route():
    name = request.form.get('name')
    field = request.form.get('field')
    value = request.form.get('value', '')
    
    data = load_csv_data()
    success, message = edit_member_field(data, name, field, value)
    
    if success:
        if save_csv_data(data):
            flash(message, 'success')
        else:
            flash('Failed to save data', 'error')
    else:
        flash(message, 'error')
    
    return redirect(url_for('index'))

@app.route("/delete/<name>")
def delete_member_route(name):
    data = load_csv_data()
    success, message = delete_member(data, name)
    
    if success:
        if save_csv_data(data):
            flash(message, 'success')
        else:
            flash('Failed to save data', 'error')
    else:
        flash(message, 'error')
    
    return redirect(url_for('index'))

@app.route("/images/<filename>")
def serve_image(filename):
    """Serve image files from the images directory"""
    images_dir = os.path.join(os.path.dirname(__file__), 'images')
    
    # Create images directory if it doesn't exist
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
    
    try:
        return send_from_directory(images_dir, filename)
    except:
        # Return 404 for missing images
        abort(404)

if __name__ == "__main__":
    # Production configuration
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
