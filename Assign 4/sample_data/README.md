# Sample Datasets for Data Visualization Project

This folder contains 6 different datasets you can use to test and demo the visualization application.

## 📁 Available Datasets

### 1. 🎬 **Movies** (movies.csv, movies.json, movies.xml)
- **50 records** from classic to modern films
- **Columns**: title, genre, year, rating, budget, revenue, runtime, imdb_score
- **Best for**:
  - Pie Chart: Genre distribution, Rating categories (G/PG/PG-13/R)
  - Bar Chart: Average budget by genre, Revenue by decade
  - Scatter Plot: Budget vs Revenue, Runtime vs IMDB Score

### 2. 🎮 **Video Games** (video_games.csv)
- **50 records** of popular games across platforms
- **Columns**: title, platform, genre, year, price, sales_millions, user_score, critic_score
- **Best for**:
  - Pie Chart: Platform distribution, Genre distribution
  - Bar Chart: Average sales by platform, Sales by year
  - Scatter Plot: User score vs Critic score, Price vs Sales

### 3. 🌦️ **Weather** (weather.csv)
- **54 records** across 6 cities and multiple dates
- **Columns**: date, city, temperature, humidity, condition, wind_speed, precipitation
- **Best for**:
  - Pie Chart: Weather conditions, City distribution
  - Bar Chart: Average temperature by city, Average humidity by condition
  - Scatter Plot: Temperature vs Humidity, Wind speed vs Precipitation

### 4. 🏠 **Real Estate** (real_estate.csv)
- **50 property listings** across major US cities
- **Columns**: address, city, type, bedrooms, bathrooms, sqft, price, year_built, lot_size
- **Best for**:
  - Pie Chart: Property types, City distribution
  - Bar Chart: Average price by city, Average sqft by type
  - Scatter Plot: Sqft vs Price, Year built vs Price

### 5. 📱 **Smartphones** (smartphones.csv)
- **49 phone models** from major brands
- **Columns**: model, brand, year, price, screen_size, battery_mah, rating, storage_gb, camera_mp
- **Best for**:
  - Pie Chart: Brand distribution, Price range categories
  - Bar Chart: Average rating by brand, Average battery by brand
  - Scatter Plot: Price vs Rating, Screen size vs Battery

### 6. 🍕 **Restaurants** (restaurants.csv)
- **50 restaurants** across cities and cuisines
- **Columns**: name, cuisine, city, price_range, rating, num_reviews, avg_delivery_time, distance_miles
- **Best for**:
  - Pie Chart: Cuisine types, Price range distribution
  - Bar Chart: Average rating by cuisine, Average delivery time by city
  - Scatter Plot: Num reviews vs Rating, Distance vs Delivery time

## 🎯 Quick Start

1. Choose a dataset that interests you
2. Upload it to the visualization app
3. Try all three chart types to explore the data

## 💡 Tips

- **Movies dataset** is the most versatile and fun
- **Movies** also comes in JSON and XML format to test multiple file types
- Each dataset has a good mix of categorical and numeric data
- All datasets are sized perfectly for visualization (not too big, not too small)

## 📊 Visualization Ideas

### Pie Charts
Look for categorical columns with 3-10 unique values:
- genre, rating, platform, condition, type, cuisine, brand

### Bar Charts
Compare numeric values across categories:
- X: genre/city/brand, Y: average price/rating/sales

### Scatter Plots
Find relationships between two numeric columns:
- budget vs revenue
- price vs rating
- temperature vs humidity
- sqft vs price

## 🔄 Format Testing

The movies dataset includes three formats to test your parser:
- `movies.csv` - Standard CSV format
- `movies.json` - JSON array format
- `movies.xml` - XML with `<movie>` elements

All three contain the same data, so you can verify your parsers work correctly!

Enjoy exploring the data! 🚀
