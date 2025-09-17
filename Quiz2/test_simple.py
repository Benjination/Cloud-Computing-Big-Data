"""
Simple test Flask app to verify basic functionality
"""
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({'message': 'Hello World!', 'status': 'working'})

@app.route('/test')
def test():
    return jsonify({'test': 'success'})

if __name__ == '__main__':
    app.run(debug=True, port=5001)