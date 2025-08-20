# SumTwo - Flask Web Application

A simple, responsive Flask web application that adds two numbers together. This project demonstrates basic web development concepts including form handling, server-side processing, and responsive design.

## 🌟 Features

- **Simple Addition Calculator**: Enter two numbers and get their sum
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Input Validation**: Handles integers, floats, and invalid input gracefully
- **Modern UI**: Clean, centered design with hover effects
- **Post/Redirect/Get Pattern**: Prevents form resubmission on page refresh
- **Session Management**: Uses Flask sessions for message handling

## 🚀 Live Demo

The application can be deployed to Azure App Service with a generated domain name like: `sumtwo-app.azurewebsites.net`

## 📱 Mobile Responsive

The application automatically adapts to different screen sizes:
- **Desktop**: Centered container with optimal spacing
- **Tablet**: Responsive width with larger touch targets
- **Mobile**: Full-width design with enlarged buttons and inputs

## 🛠️ Technology Stack

- **Backend**: Python 3.9+ with Flask framework
- **Frontend**: HTML5, CSS3 with responsive design
- **Styling**: Custom CSS with flexbox layout
- **Session Management**: Flask sessions with secure secret key
- **Deployment**: Azure App Service compatible

## 📁 Project Structure

```
SumTwo/
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── startup.txt                     # Azure startup command
├── web.config                      # IIS configuration (optional)
├── index.html                      # Static HTML page (backup)
├── Azure_Deployment_Checklist.txt  # Complete deployment guide
└── README.md                       # Project documentation
```

## 🔧 Installation & Setup

### Prerequisites
- Python 3.9 or higher
- pip (Python package installer)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Benjination/Cloud-Computing-Big-Data.git
   cd Cloud-Computing-Big-Data/SumTwo
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open in browser**
   ```
   http://localhost:8000
   ```

## 🎨 Design Features

### Visual Elements
- **Color Scheme**: Modern blue and grey palette
- **Typography**: Clean Arial font family
- **Layout**: Centered card-based design
- **Shadows**: Subtle box shadows for depth
- **Transitions**: Smooth hover effects on buttons

### User Experience
- **Form Validation**: Client-side HTML5 validation + server-side error handling
- **Responsive Inputs**: Touch-friendly on mobile devices
- **Clear Feedback**: Success messages and error handling
- **Accessibility**: Proper form labels and semantic HTML

## 🔄 Application Flow

1. **GET Request**: User visits the homepage
2. **Form Display**: Clean interface with input fields
3. **POST Request**: User submits form with two numbers
4. **Server Processing**: 
   - Validates input (integers vs floats)
   - Calculates sum
   - Stores result in session
5. **Redirect**: Post/Redirect/Get pattern prevents resubmission
6. **Display Result**: Shows personalized message with calculation

## 📊 Input Handling

The application intelligently handles different number types:

```python
# Integer detection for whole numbers
if num1_raw.lstrip('-').isdigit() and num2_raw.lstrip('-').isdigit():
    num1 = int(num1_raw)
    num2 = int(num2_raw)
else:
    # Float conversion for decimals
    num1 = float(num1_raw)
    num2 = float(num2_raw)
```

**Supported Input Types:**
- Positive integers: `5`, `42`
- Negative integers: `-3`, `-15`
- Positive floats: `3.14`, `2.5`
- Negative floats: `-1.5`, `-0.75`
- Invalid input: Shows error message

## ☁️ Azure Deployment

### Quick Deployment
See `Azure_Deployment_Checklist.txt` for complete deployment guide.

### Key Files for Azure
- `requirements.txt`: Specifies Flask dependency
- `startup.txt`: Tells Azure how to start the app
- `web.config`: IIS configuration (if needed)

### Environment Configuration
```python
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

## 🔐 Security Features

- **Secret Key**: Flask sessions use secure secret key
- **Input Validation**: Server-side validation prevents injection
- **HTTPS Ready**: Designed for secure deployment
- **Error Handling**: Graceful error messages without exposing internals

## 📱 Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **HTML5 Features**: Uses modern input types with fallbacks

## 🎯 Educational Value

This project demonstrates:
- **Web Development Fundamentals**: HTTP methods, form handling
- **Flask Framework**: Routing, templates, sessions
- **Responsive Design**: CSS media queries, mobile-first approach
- **Cloud Deployment**: Azure App Service deployment
- **Best Practices**: PRG pattern, input validation, error handling

## 📈 Performance

- **Lightweight**: Minimal dependencies (only Flask)
- **Fast Loading**: Embedded CSS reduces HTTP requests
- **Efficient**: Simple calculation with minimal processing
- **Scalable**: Stateless design suitable for cloud deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

**Benjamin Niccum**
- Website: [benjaminniccum.com](https://benjaminniccum.com)
- GitHub: [@Benjination](https://github.com/Benjination)

## 🎓 Academic Context

This project was developed as part of a Cloud Computing and Big Data course, demonstrating:
- Web application development
- Cloud deployment strategies
- Responsive design principles
- Modern development workflows

---

*Designed by BNiccum* ✨
