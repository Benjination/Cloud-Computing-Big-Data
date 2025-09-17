#!/usr/bin/env python3
"""
Test script for the earthquake Flask API
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_endpoint(endpoint, description):
    """Test a single endpoint"""
    print(f"\n🧪 Testing: {description}")
    print(f"URL: {BASE_URL}{endpoint}")
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'earthquakes' in data:
                print(f"✅ Success! Found {data['count']} earthquakes")
                if data['earthquakes']:
                    print(f"First result: Magnitude {data['earthquakes'][0]['magnitude']} at {data['earthquakes'][0]['place']}")
            elif 'analysis' in data:
                print(f"✅ Analysis complete! {data['conclusion']}")
            else:
                print(f"✅ Success! Response: {data}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - make sure Flask app is running!")
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🌍 Testing Earthquake Flask API")
    print("=" * 50)
    
    # Test main page
    test_endpoint("/", "Main dashboard")
    
    # Test magnitude search
    test_endpoint("/search/magnitude-greater-than/5.0", "Magnitude > 5.0")
    
    # Test magnitude range
    test_endpoint("/search/magnitude-range/2.0/3.0", "Magnitude range 2.0-3.0")
    
    # Test location search
    test_endpoint("/search/near-location/34.0522/-118.2437/50", "Near Los Angeles (50km)")
    
    # Test analysis
    test_endpoint("/analysis/large-quakes-at-night", "Night analysis")
    
    print("\n🎉 Testing complete!")

if __name__ == "__main__":
    main()