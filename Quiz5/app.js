// Global variables
let earthquakeData = [];
let currentPage = 1;
const rowsPerPage = 50;
let totalPages = 0;

// Load data on page load
d3.csv('earthquakes copy.csv').then(data => {
    earthquakeData = data.map(d => ({
        time: new Date(d.time),
        latitude: +d.latitude,
        longitude: +d.longitude,
        depth: +d.depth,
        mag: +d.mag,
        magType: d.magType,
        place: d.place,
        type: d.type
    }));
    
    totalPages = Math.ceil(earthquakeData.length / rowsPerPage);
    displayDataTable();
});

// Navigation between sections
function showSection(sectionName) {
    // Hide all sections
    document.getElementById('data-section').style.display = 'none';
    document.getElementById('visualizations-section').style.display = 'none';
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    if (sectionName === 'data') {
        document.getElementById('data-section').style.display = 'block';
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
    } else if (sectionName === 'visualizations') {
        document.getElementById('visualizations-section').style.display = 'block';
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
    }
}

// Display data table with pagination
function displayDataTable() {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = earthquakeData.slice(start, end);
    
    pageData.forEach(d => {
        const row = tbody.insertRow();
        
        // Time
        const timeCell = row.insertCell();
        timeCell.textContent = d.time.toLocaleString();
        
        // Location
        const locationCell = row.insertCell();
        locationCell.textContent = d.place || 'Unknown';
        
        // Magnitude
        const magCell = row.insertCell();
        magCell.textContent = d.mag.toFixed(2);
        magCell.style.fontWeight = 'bold';
        if (d.mag >= 5) magCell.style.color = '#dc3545';
        else if (d.mag >= 3) magCell.style.color = '#fd7e14';
        else if (d.mag >= 2) magCell.style.color = '#ffc107';
        
        // Depth
        const depthCell = row.insertCell();
        depthCell.textContent = d.depth.toFixed(2);
        
        // Coordinates
        const coordCell = row.insertCell();
        coordCell.textContent = `${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}`;
        coordCell.style.fontSize = '0.9em';
        coordCell.style.color = '#666';
    });
    
    // Update page info
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update button states
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages;
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        displayDataTable();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayDataTable();
    }
}

// Load visualization based on dropdown selection
function loadVisualization() {
    const select = document.getElementById('viz-select');
    const container = document.getElementById('visualization-container');
    const closeBtn = document.getElementById('close-viz-btn');
    const selectedViz = select.value;
    
    if (!selectedViz) {
        container.innerHTML = '<div class="empty-state"><p>👆 Select a visualization from the dropdown menu above</p></div>';
        closeBtn.style.display = 'none';
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    closeBtn.style.display = 'block';
    
    // Load appropriate visualization
    switch(selectedViz) {
        case 'regional':
            createRegionalPieChart(container);
            break;
        case 'magnitude':
            createMagnitudeBarChart(container);
            break;
        case 'depth':
            createDepthBarChart(container);
            break;
        case 'geographic':
            createGeographicScatter(container);
            break;
    }
}

function closeVisualization() {
    const select = document.getElementById('viz-select');
    const container = document.getElementById('visualization-container');
    const closeBtn = document.getElementById('close-viz-btn');
    
    select.value = '';
    container.innerHTML = '<div class="empty-state"><p>👆 Select a visualization from the dropdown menu above</p></div>';
    closeBtn.style.display = 'none';
}

// Helper function to extract region from place
function extractRegion(place) {
    if (!place) return "Unknown";
    if (place.includes("CA") || place.includes("California")) return "California";
    if (place.includes("Alaska")) return "Alaska";
    if (place.includes("Texas")) return "Texas";
    if (place.includes("Hawaii")) return "Hawaii";
    if (place.includes("Oklahoma")) return "Oklahoma";
    if (place.includes("Nevada")) return "Nevada";
    if (place.includes("Puerto Rico")) return "Puerto Rico";
    if (place.includes("Washington")) return "Washington";
    if (place.includes("Utah")) return "Utah";
    if (place.includes("Montana")) return "Montana";
    return "Other/International";
}

// VISUALIZATION 1: Regional Distribution Pie Chart
function createRegionalPieChart(container) {
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = 'Regional Distribution: Where Do Earthquakes Happen?';
    container.appendChild(title);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Process data
    const regionCounts = d3.rollup(
        earthquakeData,
        v => v.length,
        d => extractRegion(d.place)
    );
    
    const data = Array.from(regionCounts, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    
    // Use PieChart function from d3jsTypes.txt
    const width = 800;
    const height = 600;
    const outerRadius = Math.min(width, height) / 2 - 40;
    
    const N = d3.map(data, d => d.name);
    const V = d3.map(data, d => d.value);
    const I = d3.range(N.length).filter(i => !isNaN(V[i]));
    
    const names = new d3.InternSet(N);
    const colors = d3.schemeSet3;
    const color = d3.scaleOrdinal(names, colors);
    
    const formatValue = d3.format(",");
    const title_fn = i => `${N[i]}\n${formatValue(V[i])}`;
    
    const arcs = d3.pie().padAngle(0.02).sort(null).value(i => V[i])(I);
    const arc = d3.arc().innerRadius(0).outerRadius(outerRadius);
    const arcLabel = d3.arc().innerRadius(outerRadius * 0.6).outerRadius(outerRadius * 0.6);
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");
    
    svg.append("g")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
      .selectAll()
      .data(arcs)
      .join("path")
        .attr("fill", d => color(N[d.data]))
        .attr("d", arc)
      .append("title")
        .text(d => title_fn(d.data));
    
    svg.append("g")
        .attr("text-anchor", "middle")
      .selectAll()
      .data(arcs)
      .join("text")
        .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
        .selectAll()
        .data(d => {
          const lines = `${title_fn(d.data)}`.split(/\n/);
          return d.endAngle - d.startAngle > 0.25 ? lines : lines.slice(0, 1);
        })
        .join("tspan")
          .attr("x", 0)
          .attr("y", (d, i) => `${i * 1.1}em`)
          .attr("font-weight", (d, i) => i ? null : "bold")
          .text(d => d);
    
    vizContent.appendChild(svg.node());
}

// VISUALIZATION 2: Magnitude Bar Chart (Vertical)
function createMagnitudeBarChart(container) {
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = 'Earthquake Intensity: How Strong Are They?';
    container.appendChild(title);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Categorize data
    const ranges = [
        { label: 'Micro (0-2)', min: 0, max: 2, order: 1 },
        { label: 'Minor (2-3)', min: 2, max: 3, order: 2 },
        { label: 'Light (3-4)', min: 3, max: 4, order: 3 },
        { label: 'Moderate (4-5)', min: 4, max: 5, order: 4 },
        { label: 'Strong (5+)', min: 5, max: Infinity, order: 5 }
    ];
    
    const data = ranges.map(range => ({
        label: range.label,
        count: earthquakeData.filter(d => d.mag >= range.min && d.mag < range.max).length,
        order: range.order
    })).sort((a, b) => a.order - b.order);
    
    // Use BarChart function from d3jsTypes.txt (vertical)
    const width = 800;
    const height = 500;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 80;
    const marginLeft = 60;
    
    const X = d3.map(data, d => d.label);
    const Y = d3.map(data, d => d.count);
    
    const xDomain = X;
    const yDomain = [0, d3.max(Y)];
    
    const xRange = [marginLeft, width - marginRight];
    const yRange = [height - marginBottom, marginTop];
    
    const xScale = d3.scaleBand(xDomain, xRange).padding(0.2);
    const yScale = d3.scaleLinear(yDomain, yRange);
    
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 40);
    
    const I = d3.range(X.length);
    const formatValue = yScale.tickFormat(100);
    const title_fn = i => `${X[i]}\n${formatValue(Y[i])}`;
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");
    
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text("Number of Earthquakes"));
    
    svg.append("g")
        .attr("fill", "steelblue")
      .selectAll()
      .data(I)
      .join("rect")
        .attr("x", i => xScale(X[i]))
        .attr("y", i => yScale(Y[i]))
        .attr("height", i => yScale(0) - yScale(Y[i]))
        .attr("width", xScale.bandwidth())
      .append("title")
        .text(title_fn);
    
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    
    vizContent.appendChild(svg.node());
}

// VISUALIZATION 3: Depth Horizontal Bar Chart
function createDepthBarChart(container) {
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = 'Depth Distribution: How Deep Do Earthquakes Occur?';
    container.appendChild(title);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Categorize data
    const categorizeDepth = (depth) => {
        if (depth < 10) return { label: "Shallow (0-10 km)", order: 1 };
        if (depth < 50) return { label: "Intermediate (10-50 km)", order: 2 };
        if (depth < 100) return { label: "Deep (50-100 km)", order: 3 };
        return { label: "Very Deep (100+ km)", order: 4 };
    };
    
    const depthCounts = d3.rollup(
        earthquakeData,
        v => v.length,
        d => categorizeDepth(d.depth).label
    );
    
    const data = Array.from(depthCounts, ([label, count]) => ({
        label,
        count,
        order: categorizeDepth(0).label === label ? 1 :
               categorizeDepth(20).label === label ? 2 :
               categorizeDepth(60).label === label ? 3 : 4
    })).sort((a, b) => a.order - b.order);
    
    // Use horizontal BarChart function from d3jsTypes.txt
    const width = 800;
    const marginTop = 30;
    const marginRight = 40;
    const marginBottom = 10;
    const marginLeft = 180;
    const height = Math.ceil((data.length + 0.1) * 60) + marginTop + marginBottom;
    
    const X = d3.map(data, d => d.count);
    const Y = d3.map(data, d => d.label);
    
    const xDomain = [0, d3.max(X)];
    const yDomain = Y;
    
    const xRange = [marginLeft, width - marginRight];
    const yRange = [marginTop, height - marginBottom];
    
    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleBand(yDomain, yRange).padding(0.2);
    
    const xAxis = d3.axisTop(xScale).ticks(width / 80);
    const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);
    
    const I = d3.range(X.length);
    const formatValue = xScale.tickFormat(100);
    const title_fn = i => `${formatValue(X[i])}`;
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");
    
    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", height - marginTop - marginBottom)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", -22)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text("Number of Earthquakes →"));
    
    svg.append("g")
        .attr("fill", "steelblue")
      .selectAll()
      .data(I)
      .join("rect")
        .attr("x", xScale(0))
        .attr("y", i => yScale(Y[i]))
        .attr("width", i => xScale(X[i]) - xScale(0))
        .attr("height", yScale.bandwidth())
      .append("title")
        .text(title_fn);
    
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis);
    
    vizContent.appendChild(svg.node());
}

// VISUALIZATION 4: Geographic Scatter Plot
function createGeographicScatter(container) {
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = 'Geographic Distribution: Earthquake Map';
    container.appendChild(title);
    
    const desc = document.createElement('p');
    desc.style.textAlign = 'center';
    desc.style.color = '#666';
    desc.style.marginBottom = '20px';
    desc.textContent = 'Point size = magnitude | Color = depth (red=shallow, blue=deep)';
    container.appendChild(desc);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Sample data for performance
    const sampleData = earthquakeData.filter((d, i) => i % 5 === 0);
    
    // Use Scatterplot function from d3jsTypes.txt
    const width = 900;
    const height = 600;
    const marginTop = 20;
    const marginRight = 30;
    const marginBottom = 50;
    const marginLeft = 60;
    const r = 3;
    const inset = r * 2;
    
    const X = d3.map(sampleData, d => d.longitude);
    const Y = d3.map(sampleData, d => d.latitude);
    const R = d3.map(sampleData, d => d.mag);
    const D = d3.map(sampleData, d => d.depth);
    
    const I = d3.range(X.length).filter(i => !isNaN(X[i]) && !isNaN(Y[i]));
    
    const xDomain = d3.extent(X);
    const yDomain = d3.extent(Y);
    
    const xRange = [marginLeft + inset, width - marginRight - inset];
    const yRange = [height - marginBottom - inset, marginTop + inset];
    
    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    
    const rScale = d3.scaleSqrt().domain(d3.extent(R)).range([2, 12]);
    const colorScale = d3.scaleSequential(d3.extent(D), d3.interpolateRdYlBu);
    
    const xAxis = d3.axisBottom(xScale).ticks(width / 80);
    const yAxis = d3.axisLeft(yScale).ticks(height / 50);
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");
    
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", -height + marginTop + marginBottom)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", 40)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text("Longitude →"));
    
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text("↑ Latitude"));
    
    svg.append("g")
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
      .selectAll("circle")
      .data(I)
      .join("circle")
        .attr("cx", i => xScale(X[i]))
        .attr("cy", i => yScale(Y[i]))
        .attr("r", i => rScale(R[i]))
        .attr("fill", i => colorScale(D[i]))
        .attr("opacity", 0.6)
      .append("title")
        .text(i => `Location: ${sampleData[i].place}\nMagnitude: ${R[i]}\nDepth: ${D[i].toFixed(2)} km`);
    
    vizContent.appendChild(svg.node());
}
