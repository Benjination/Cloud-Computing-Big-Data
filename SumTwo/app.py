import os
from flask import Flask, request, render_template_string, redirect, url_for, session

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

HTML_FORM = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SumTwo Azure Web App</title>
    <style>
        body {
            background: #f4f6fa;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            box-sizing: border-box;
        }
        .container {
            max-width: 400px;
            margin: 20px auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 24px;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
        }
        h1 {
            margin-bottom: 24px;
            color: #2d3e50;
            font-size: 1.5em;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        input[type="text"], input[type="number"] {
            padding: 12px;
            border: 1px solid #cfd8dc;
            border-radius: 6px;
            font-size: 1em;
            width: 100%;
            box-sizing: border-box;
            -webkit-appearance: none;
        }
        input[type="submit"] {
            background: #1976d2;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 14px;
            font-size: 1.1em;
            cursor: pointer;
            transition: background 0.2s;
            width: 100%;
            box-sizing: border-box;
        }
        input[type="submit"]:hover {
            background: #1565c0;
        }
        p {
            margin-top: 18px;
            color: #388e3c;
            font-weight: bold;
            line-height: 1.4;
        }
        
        /* Mobile-specific styles */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .container {
                margin: 10px auto;
                padding: 20px;
                max-width: none;
                width: calc(100% - 20px);
            }
            h1 {
                font-size: 1.3em;
                margin-bottom: 20px;
            }
            input[type="text"], input[type="number"] {
                padding: 14px;
                font-size: 1.1em;
            }
            input[type="submit"] {
                padding: 16px;
                font-size: 1.2em;
            }
            form {
                gap: 18px;
            }
        }
        
        /* Small mobile phones */
        @media (max-width: 480px) {
            .container {
                width: calc(100% - 10px);
                margin: 5px auto;
                padding: 16px;
            }
            input[type="text"], input[type="number"] {
                padding: 16px;
                font-size: 1.2em;
            }
            input[type="submit"] {
                padding: 18px;
                font-size: 1.3em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Sum Two Numbers</h1>
        <form method="post">
            <input type="text" name="username" placeholder="Your Name" required>
            <input type="number" name="num1" placeholder="Number 1" step="any" required>
            <input type="number" name="num2" placeholder="Number 2" step="any" required>
            <input type="submit" value="Calculate Sum">
        </form>
        {% if message %}
            <p>{{ message }}</p>
        {% endif %}
    </div>
    <div style="text-align: center; margin-top: 20px;">
        <small style="font-size:0.9em; color:#555; padding: 6px 12px; background: rgba(255,255,255,0.8); border-radius: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <a href="https://benjaminniccum.com" style="color: #1976d2; text-decoration: none; font-weight: 500;" target="_blank">Designed by BNiccum</a>
        </small>
    </div>
</body>
</html>
"""

@app.route("/", methods=["GET", "POST"])
def sum_two():
    message = ""
    if request.method == "POST":
        username = request.form.get("username", "")
        try:
            num1_raw = request.form.get("num1", "0")
            num2_raw = request.form.get("num2", "0")
            # Try to parse as int first
            if num1_raw.lstrip('-').isdigit() and num2_raw.lstrip('-').isdigit():
                num1 = int(num1_raw)
                num2 = int(num2_raw)
                total = num1 + num2
            else:
                num1 = float(num1_raw)
                num2 = float(num2_raw)
                total = num1 + num2
            message = f"Hello, {username}! The sum of {num1} and {num2} is {total}."
        except ValueError:
            message = "Please enter valid numbers."
        session['message'] = message
        return redirect(url_for('sum_two'))
    message = session.pop('message', '') if 'message' in session else ""
    return render_template_string(HTML_FORM, message=message)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
