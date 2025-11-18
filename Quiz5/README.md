# Earthquake Data Visualization

An interactive web application that visualizes earthquake data using D3.js. This project displays earthquake information through three different chart types: pie charts, bar charts, and scatter plots.

**Live Demo:** https://benjination.github.io/Cloud-Computing-Big-Data/Quiz5

## Features

### 📊 Three Visualization Types

1. **Pie Chart - Magnitude Types Distribution**
   - Shows the distribution of earthquakes by magnitude type (ml, md, mb, etc.)
   - Interactive tooltips with percentages and counts
   - Color-coded legend

2. **Bar Chart - Magnitude Ranges**
   - Displays earthquake frequency across magnitude ranges (0-1, 1-2, 2-3, 3-4, 4-5, 5+)
   - Animated bars with value labels
   - Shows distribution patterns of earthquake intensity

3. **Scatter Plot - Geographic Distribution**
   - Maps earthquakes by latitude and longitude coordinates
   - Point size represents earthquake magnitude
   - Color gradient represents depth (red = shallow, blue = deep)
   - Interactive tooltips with location details

## Technologies Used

- **D3.js v7** - Data visualization library
- **HTML5/CSS3** - Structure and styling
- **Vanilla JavaScript** - Application logic

## Getting Started

### View Locally

1. Clone this repository
2. Open `index.html` in a web browser
3. The visualizations will load automatically

### Deploy to GitHub Pages

1. **Create a GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Earthquake visualization website"
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on **Settings**
   - Scroll down to **Pages** section (in the left sidebar)
   - Under **Source**, select `main` branch
   - Select `/ (root)` folder
   - Click **Save**
   - Your site will be published at: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## Project Structure

```
.
├── index.html              # Main HTML file
├── styles.css              # Styling and layout
├── app.js                  # D3.js visualization logic
├── earthquakes copy.csv    # Earthquake data (9,964 records)
└── README.md              # This file
```

## Data Source

The earthquake data includes approximately 9,964 records with the following attributes:
- Time and location (latitude, longitude, place)
- Magnitude and magnitude type
- Depth
- Additional seismic metadata

## Browser Compatibility

This website works best in modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Customization

To modify the visualizations:
- **Colors**: Edit color schemes in `app.js` (search for `d3.scaleOrdinal`, `d3.scaleSequential`)
- **Chart dimensions**: Modify `width`, `height`, and `margin` variables in `app.js`
- **Data sampling**: Adjust the scatter plot sampling rate in the `createScatterPlot()` function

## License

This project is open source and available for educational purposes.
