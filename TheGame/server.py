#!/usr/bin/env python3
"""
Simple HTTP server for local development with Firebase
Run with: python3 server.py
Access at: http://localhost:8000
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

# Change to the directory where this script is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🚀 Server running at http://localhost:{PORT}")
    print(f"📁 Serving files from: {os.getcwd()}")
    print(f"🔥 Make sure 'localhost:{PORT}' is in Firebase authorized domains!")
    print("Press Ctrl+C to stop the server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
