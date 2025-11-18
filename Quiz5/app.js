// Global variables
let foodData = [];
let currentPage = 1;
const rowsPerPage = 50;
let totalPages = 0;

// Load data on page load
d3.csv('fruit.csv').then(data => {
    foodData = data.map(d => ({
        amount: +d.Amount,
        food: d.Food,
        category: d.Category
    }));
    
    totalPages = Math.ceil(foodData.length / rowsPerPage);
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
    const pageData = foodData.slice(start, end);
    
    pageData.forEach(d => {
        const row = tbody.insertRow();
        
        // Food
        const foodCell = row.insertCell();
        foodCell.textContent = d.food;
        foodCell.style.fontWeight = 'bold';
        
        // Amount
        const amountCell = row.insertCell();
        amountCell.textContent = d.amount;
        
        // Category
        const categoryCell = row.insertCell();
        categoryCell.textContent = d.category === 'F' ? 'Fruit' : 'Vegetable';
        categoryCell.style.fontSize = '0.9em';
        categoryCell.style.color = '#666';
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

// Initialize scatter plot input rows
function initializeScatterInputs() {
    const container = document.getElementById('scatter-input-rows');
    const headerRow = container.children[0]; // Keep the header
    container.innerHTML = '';
    container.appendChild(headerRow);
    
    for (let i = 1; i <= 10; i++) {
        const row = document.createElement('div');
        row.style.cssText = 'display: grid; grid-template-columns: 100px 100px 100px 150px; gap: 10px; margin-bottom: 8px;';
        row.innerHTML = `
            <input type="number" id="x-${i}" placeholder="X" min="0" max="499" style="padding: 5px;">
            <input type="number" id="y-${i}" placeholder="Y" min="0" max="499" style="padding: 5px;">
            <input type="number" id="c-${i}" placeholder="Color" min="1" max="3" style="padding: 5px;">
            <span style="color: #999; font-size: 0.9em;">Point ${i}</span>
        `;
        container.appendChild(row);
    }
}

// Call initialization when page loads
document.addEventListener('DOMContentLoaded', initializeScatterInputs);

// Filter data by amount range
let filteredData = [];
let minAmount = 0;
let maxAmount = 100;

function applyFilter() {
    minAmount = +document.getElementById('min-amount').value || 0;
    maxAmount = +document.getElementById('max-amount').value || 100;
    
    filteredData = foodData.filter(d => d.amount >= minAmount && d.amount <= maxAmount);
    
    // Reload visualization if one is selected
    loadVisualization();
}

// Load visualization based on dropdown selection
function loadVisualization() {
    const select = document.getElementById('viz-select');
    const container = document.getElementById('visualization-container');
    const closeBtn = document.getElementById('close-viz-btn');
    const scatterInputs = document.getElementById('scatter-inputs');
    const selectedViz = select.value;
    
    // Hide scatter inputs by default
    scatterInputs.style.display = 'none';
    
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
        case 'pie':
            createPieChart(container);
            break;
        case 'bar':
            createBarChart(container);
            break;
        case 'scatter':
            scatterInputs.style.display = 'block';
            container.innerHTML = '<div class="empty-state"><p>👆 Enter coordinates above and click "Plot Points"</p></div>';
            closeBtn.style.display = 'none';
            break;
    }
}

function closeVisualization() {
    const select = document.getElementById('viz-select');
    const container = document.getElementById('visualization-container');
    const closeBtn = document.getElementById('close-viz-btn');
    const scatterInputs = document.getElementById('scatter-inputs');
    
    select.value = '';
    scatterInputs.style.display = 'none';
    container.innerHTML = '<div class="empty-state"><p>👆 Select a visualization from the dropdown menu above</p></div>';
    closeBtn.style.display = 'none';
}


// VISUALIZATION 1: Pie Chart - Food Distribution by Amount Range
function createPieChart(container) {
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = `Food Distribution by Amount Range (${minAmount} - ${maxAmount})`;
    container.appendChild(title);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Use filtered data
    const dataToUse = filteredData.length > 0 ? filteredData : foodData;
    
    if (dataToUse.length === 0) {
        vizContent.innerHTML = '<p style="text-align: center; color: #999;">No data in selected range</p>';
        return;
    }
    
    // Process data - each food item becomes a slice
    const data = dataToUse.map(d => ({
        name: d.food,
        value: d.amount
    }));
    
    // Calculate total for percentages
    const total = d3.sum(data, d => d.value);
    
    // Use PieChart function - adjusted for 80-90% screen width
    const width = Math.min(window.innerWidth * 0.85, 900);
    const height = width * 0.75;
    const outerRadius = Math.min(width, height) / 2 - 60;
    
    const N = d3.map(data, d => d.name);
    const V = d3.map(data, d => d.value);
    const I = d3.range(N.length).filter(i => !isNaN(V[i]));
    
    const names = new d3.InternSet(N);
    const colors = d3.schemeSet3;
    const color = d3.scaleOrdinal(names, colors);
    
    const formatValue = d3.format(",");
    
    const arcs = d3.pie().padAngle(0.02).sort(null).value(i => V[i])(I);
    const arc = d3.arc().innerRadius(0).outerRadius(outerRadius);
    const arcLabel = d3.arc().innerRadius(outerRadius * 1.15).outerRadius(outerRadius * 1.15);
    const arcPercent = d3.arc().innerRadius(outerRadius * 0.65).outerRadius(outerRadius * 0.65);
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 14px sans-serif;");
    
    // Draw pie slices
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
        .text(d => `${N[d.data]}: ${formatValue(V[d.data])} (${((V[d.data]/total)*100).toFixed(1)}%)`);
    
    // Add percentage labels INSIDE slices
    svg.append("g")
        .attr("text-anchor", "middle")
      .selectAll()
      .data(arcs)
      .join("text")
        .attr("transform", d => `translate(${arcPercent.centroid(d)})`)
        .attr("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("paint-order", "stroke")
        .text(d => d.endAngle - d.startAngle > 0.15 ? `${((V[d.data]/total)*100).toFixed(1)}%` : '');
    
    // Add food name labels OUTSIDE slices
    svg.append("g")
        .attr("text-anchor", "middle")
      .selectAll()
      .data(arcs)
      .join("text")
        .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
        .attr("font-weight", "bold")
        .attr("font-size", "13px")
        .text(d => N[d.data]);
    
    vizContent.appendChild(svg.node());
}

// VISUALIZATION 2: Bar Chart - Food by Amount Range (Vertical Bars, Green, Sorted)
function createBarChart(container) {
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = `Food by Amount Range (${minAmount} - ${maxAmount})`;
    container.appendChild(title);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Use filtered data
    const dataToUse = filteredData.length > 0 ? filteredData : foodData;
    
    if (dataToUse.length === 0) {
        vizContent.innerHTML = '<p style="text-align: center; color: #999;">No data in selected range</p>';
        return;
    }
    
    // Sort by amount: Largest at top - for vertical bars shown top to bottom
    const data = [...dataToUse].sort((a, b) => b.amount - a.amount);
    
    // Vertical bar chart - adjusted for 70-90% screen width
    const width = Math.min(window.innerWidth * 0.8, 900);
    const barWidth = Math.max(80, Math.min(width / (data.length + 1), 150));
    const height = 700;
    const marginTop = 60;
    const marginRight = 40;
    const marginBottom = 150;
    const marginLeft = 80;
    
    const X = d3.map(data, d => d.food);
    const Y = d3.map(data, d => d.amount);
    
    const I = d3.range(X.length);
    const formatValue = d3.format(",");
    
    // Create scales
    const xPositions = d3.range(X.length).map(i => marginLeft + i * (barWidth + 20) + barWidth/2);
    const yDomain = [0, d3.max(Y) * 1.1];
    const yRange = [height - marginBottom, marginTop];
    const yScale = d3.scaleLinear(yDomain, yRange);
    
    const svg = d3.create("svg")
        .attr("width", Math.max(width, xPositions[xPositions.length - 1] + marginRight + barWidth))
        .attr("height", height)
        .attr("viewBox", [0, 0, Math.max(width, xPositions[xPositions.length - 1] + marginRight + barWidth), height])
        .attr("style", "max-width: 100%; height: auto;");
    
    // Draw green vertical bars
    svg.append("g")
        .attr("fill", "#28a745")
      .selectAll()
      .data(I)
      .join("rect")
        .attr("x", i => xPositions[i] - barWidth/2)
        .attr("y", i => yScale(Y[i]))
        .attr("width", barWidth)
        .attr("height", i => yScale(0) - yScale(Y[i]))
      .append("title")
        .text(i => `${X[i]}: ${formatValue(Y[i])}`);
    
    // Add amount labels OUTSIDE (left of bars) - positioned above bars
    svg.append("g")
        .attr("text-anchor", "middle")
      .selectAll()
      .data(I)
      .join("text")
        .attr("x", i => xPositions[i])
        .attr("y", i => yScale(Y[i]) - 5)
        .attr("font-weight", "bold")
        .attr("font-size", "16px")
        .attr("fill", "#333")
        .text(i => formatValue(Y[i]));
    
    // Add food name labels INSIDE bars (right side) - rotated vertically
    svg.append("g")
        .attr("text-anchor", "start")
      .selectAll()
      .data(I)
      .join("text")
        .attr("transform", i => `translate(${xPositions[i] + barWidth/2 - 10}, ${yScale(0) - 5}) rotate(-90)`)
        .attr("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("fill", "white")
        .text(i => X[i]);
    
    // Add Y-axis
    const yAxis = d3.axisLeft(yScale).ticks(8);
    svg.append("g")
        .attr("transform", `translate(${marginLeft - 10},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", Math.max(width, xPositions[xPositions.length - 1] + marginRight + barWidth) - marginLeft - marginRight + 10)
            .attr("stroke-opacity", 0.1));
    
    vizContent.appendChild(svg.node());
}

// VISUALIZATION 3: Custom Scatter Plot with Manual X,Y,C Input
function plotScatterPoints() {
    const container = document.getElementById('visualization-container');
    const closeBtn = document.getElementById('close-viz-btn');
    
    // Clear container
    container.innerHTML = '';
    closeBtn.style.display = 'block';
    
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = 'Custom Scatter Plot';
    container.appendChild(title);
    
    const desc = document.createElement('p');
    desc.style.textAlign = 'center';
    desc.style.color = '#666';
    desc.style.marginBottom = '20px';
    desc.textContent = 'Color: Green (1), Black (2), Red (3)';
    container.appendChild(desc);
    
    const vizContent = document.createElement('div');
    vizContent.className = 'viz-content';
    container.appendChild(vizContent);
    
    // Collect points from input fields
    const points = [];
    for (let i = 1; i <= 10; i++) {
        const x = document.getElementById(`x-${i}`).value;
        const y = document.getElementById(`y-${i}`).value;
        const c = document.getElementById(`c-${i}`).value;
        
        if (x !== '' && y !== '' && c !== '') {
            const xVal = +x;
            const yVal = +y;
            const cVal = +c;
            
            // Validate ranges
            if (xVal >= 0 && xVal <= 499 && yVal >= 0 && yVal <= 499 && cVal >= 1 && cVal <= 3) {
                points.push({ x: xVal, y: yVal, c: cVal });
            }
        }
    }
    
    if (points.length === 0) {
        vizContent.innerHTML = '<p style="text-align: center; color: #999;">No valid points entered. Please enter X,Y,C values.</p>';
        return;
    }
    
    // Use Scatterplot function
    const width = 900;
    const height = 600;
    const marginTop = 40;
    const marginRight = 30;
    const marginBottom = 60;
    const marginLeft = 70;
    
    const X = points.map(d => d.x);
    const Y = points.map(d => d.y);
    const C = points.map(d => d.c);
    
    const I = d3.range(X.length);
    
    const xDomain = [0, 499];
    const yDomain = [0, 499];
    
    const xRange = [marginLeft, width - marginRight];
    const yRange = [height - marginBottom, marginTop];
    
    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    
    // Color mapping: 1=Green, 2=Black, 3=Red
    const colorMap = {
        1: '#28a745',
        2: '#000000',
        3: '#dc3545'
    };
    
    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(10);
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");
    
    // Add grid and X axis
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", -height + marginTop + marginBottom)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", 45)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .attr("font-weight", "bold")
            .text("X Axis →"));
    
    // Add grid and Y axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 15)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text("↑ Y Axis"));
    
    // Draw points
    svg.append("g")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(I)
      .join("circle")
        .attr("cx", i => xScale(X[i]))
        .attr("cy", i => yScale(Y[i]))
        .attr("r", 6)
        .attr("fill", i => colorMap[C[i]])
      .append("title")
        .text(i => `Point (${X[i]}, ${Y[i]})\nColor: ${C[i]}`);
    
    vizContent.appendChild(svg.node());
}

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


// VISUALIZATION 3: Geographic Scatter Plot
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
