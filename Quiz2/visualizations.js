/**
 * D3.js Earthquake Data Visualizations
 * Professional Dark Theme with Slate Gray, Black, and Dark Blue
 * Created: November 9, 2025
 */

// Color scheme constants
const VIZ_COLORS = {
    // Base palette
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    gridLines: '#475569',
    borders: '#64748b',
    
    // Data visualization
    magnitudeScale: ['#3b82f6', '#8b5cf6', '#ec4899'],
    depthScale: ['#06b6d4', '#0891b2', '#0e7490'],
    
    // Accents
    highlight: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
};

/**
 * Create Magnitude Histogram for Magnitude > X searches
 * Shows distribution of earthquakes across magnitude ranges
 * 
 * @param {Array} data - Array of earthquake objects with magnitude property
 * @param {string} containerId - ID of the container element
 * @param {number} minMagnitude - Minimum magnitude threshold
 */
function createMagnitudeHistogram(data, containerId, minMagnitude = 0) {
    // Clear existing visualization
    d3.select(`#${containerId}`).selectAll('*').remove();
    
    // Show the visualization container
    const container = document.getElementById(containerId);
    if (container) {
        container.style.display = 'block';
    }
    
    // Set dimensions and margins
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG container with dark background
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('background-color', VIZ_COLORS.background)
        .style('border-radius', '10px')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data - bin magnitudes
    const magnitudes = data.map(d => parseFloat(d.mag || d.magnitude));
    
    // Validate that we have magnitude data
    if (magnitudes.length === 0 || magnitudes.every(m => isNaN(m))) {
        console.error('No valid magnitude data found');
        return;
    }
    
    // Calculate actual min/max from the data (not from search parameter)
    const actualMinMag = Math.min(...magnitudes);
    const actualMaxMag = Math.max(...magnitudes);
    
    // Round to nearest 0.5 for cleaner bins
    const minMag = Math.floor(actualMinMag * 2) / 2; // Round down to nearest 0.5
    const maxMag = Math.ceil(actualMaxMag * 2) / 2; // Round up to nearest 0.5
    
    console.log(`Creating histogram: data range ${actualMinMag.toFixed(2)} - ${actualMaxMag.toFixed(2)}, bin range ${minMag} - ${maxMag}`);
    
    // Create bins (0.5 magnitude increments) - include maxMag
    const bins = [];
    for (let i = minMag; i <= maxMag; i += 0.5) {
        bins.push({
            range: `${i.toFixed(1)} - ${(i + 0.5).toFixed(1)}`,
            min: i,
            max: i + 0.5,
            count: 0,
            earthquakes: []
        });
    }
    
    // Fill bins with data - use <= for max to include upper bound
    magnitudes.forEach((mag, idx) => {
        const bin = bins.find(b => mag >= b.min && mag <= b.max);
        if (bin) {
            bin.count++;
            bin.earthquakes.push(data[idx]);
        }
    });
    
    // Create scales
    const xScale = d3.scaleBand()
        .domain(bins.map(b => b.range))
        .range([0, width])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Create color scale based on magnitude
    const colorScale = d3.scaleLinear()
        .domain([minMag, (minMag + maxMag) / 2, maxMag])
        .range(VIZ_COLORS.magnitudeScale);
    
    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', VIZ_COLORS.textPrimary)
        .text(`Earthquake Distribution: Magnitude > ${minMagnitude}`);
    
    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        )
        .style('stroke', VIZ_COLORS.gridLines);
    
    // Add X axis
    const xAxis = svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    xAxis.selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary)
        .style('font-size', '11px')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    xAxis.selectAll('path, line')
        .style('stroke', VIZ_COLORS.borders);
    
    // Add Y axis
    const yAxis = svg.append('g')
        .call(d3.axisLeft(yScale));
    
    yAxis.selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary)
        .style('font-size', '12px');
    
    yAxis.selectAll('path, line')
        .style('stroke', VIZ_COLORS.borders);
    
    // Add X axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 60)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', VIZ_COLORS.textSecondary)
        .text('Magnitude Range');
    
    // Add Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', VIZ_COLORS.textSecondary)
        .text('Number of Earthquakes');
    
    // Create tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'viz-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', VIZ_COLORS.backgroundSecondary)
        .style('color', VIZ_COLORS.textPrimary)
        .style('border', `2px solid ${VIZ_COLORS.highlight}`)
        .style('border-radius', '8px')
        .style('padding', '12px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.5)');
    
    // Draw bars with animation
    svg.selectAll('.bar')
        .data(bins)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.range))
        .attr('width', xScale.bandwidth())
        .attr('y', height) // Start from bottom
        .attr('height', 0) // Start with 0 height
        .attr('fill', d => colorScale(d.min))
        .attr('stroke', VIZ_COLORS.borders)
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // Highlight bar
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8)
                .attr('stroke', VIZ_COLORS.highlight)
                .attr('stroke-width', 2);
            
            // Show tooltip
            tooltip.style('visibility', 'visible')
                .html(`
                    <strong style="color: ${VIZ_COLORS.highlight};">Magnitude: ${d.range}</strong><br>
                    <strong>Count:</strong> ${d.count} earthquakes<br>
                    <strong>Percentage:</strong> ${(d.count / data.length * 100).toFixed(1)}%<br>
                    <em style="color: ${VIZ_COLORS.textSecondary}; font-size: 11px;">Click for details</em>
                `);
        })
        .on('mousemove', function(event) {
            tooltip
                .style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
            // Reset bar
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1)
                .attr('stroke', VIZ_COLORS.borders)
                .attr('stroke-width', 1);
            
            // Hide tooltip
            tooltip.style('visibility', 'hidden');
        })
        .on('click', function(event, d) {
            // Show detailed info for this bin
            showBinDetails(d, data.length);
        })
        .transition() // Animate bars growing
        .duration(750)
        .delay((d, i) => i * 50) // Stagger animation
        .attr('y', d => yScale(d.count))
        .attr('height', d => height - yScale(d.count));
    
    // Add count labels on top of bars
    svg.selectAll('.label')
        .data(bins)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.range) + xScale.bandwidth() / 2)
        .attr('y', height) // Start from bottom
        .attr('text-anchor', 'middle')
        .style('fill', VIZ_COLORS.textPrimary)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(d => d.count > 0 ? d.count : '')
        .transition()
        .duration(750)
        .delay((d, i) => i * 50)
        .attr('y', d => yScale(d.count) - 5);
    
    // Add summary statistics
    const stats = svg.append('g')
        .attr('transform', `translate(${width - 200}, -10)`);
    
    stats.append('text')
        .attr('y', 0)
        .style('fill', VIZ_COLORS.textSecondary)
        .style('font-size', '12px')
        .text(`Total: ${data.length} earthquakes`);
    
    stats.append('text')
        .attr('y', 15)
        .style('fill', VIZ_COLORS.textSecondary)
        .style('font-size', '12px')
        .text(`Avg: ${d3.mean(magnitudes).toFixed(2)}`);
    
    stats.append('text')
        .attr('y', 30)
        .style('fill', VIZ_COLORS.textSecondary)
        .style('font-size', '12px')
        .text(`Max: ${d3.max(magnitudes).toFixed(2)}`);
}

/**
 * Show detailed information for a specific magnitude bin
 * @param {Object} binData - Bin data object
 * @param {number} totalCount - Total number of earthquakes
 */
function showBinDetails(binData, totalCount) {
    const detailHtml = `
        <div style="background: ${VIZ_COLORS.backgroundSecondary}; padding: 20px; border-radius: 8px; margin-top: 20px; border: 2px solid ${VIZ_COLORS.highlight};">
            <h4 style="color: ${VIZ_COLORS.highlight}; margin-top: 0;">
                📊 Magnitude ${binData.range} - Detailed View
            </h4>
            <p style="color: ${VIZ_COLORS.textPrimary};">
                <strong>Count:</strong> ${binData.count} earthquakes<br>
                <strong>Percentage:</strong> ${(binData.count / totalCount * 100).toFixed(1)}% of total
            </p>
            <div style="max-height: 300px; overflow-y: auto;">
                <table style="width: 100%; color: ${VIZ_COLORS.textSecondary}; font-size: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid ${VIZ_COLORS.borders};">
                            <th style="padding: 8px; text-align: left;">Location</th>
                            <th style="padding: 8px; text-align: center;">Magnitude</th>
                            <th style="padding: 8px; text-align: center;">Depth</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${binData.earthquakes.slice(0, 10).map(eq => `
                            <tr style="border-bottom: 1px solid ${VIZ_COLORS.gridLines};">
                                <td style="padding: 8px;">${eq.place || 'Unknown'}</td>
                                <td style="padding: 8px; text-align: center; color: ${VIZ_COLORS.highlight};">${eq.mag || eq.magnitude}</td>
                                <td style="padding: 8px; text-align: center;">${eq.depth || 'N/A'} km</td>
                            </tr>
                        `).join('')}
                        ${binData.earthquakes.length > 10 ? `
                            <tr>
                                <td colspan="3" style="padding: 8px; text-align: center; color: ${VIZ_COLORS.textSecondary};">
                                    <em>... and ${binData.earthquakes.length - 10} more</em>
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            <button onclick="this.parentElement.remove()" 
                    style="margin-top: 15px; padding: 8px 16px; background: ${VIZ_COLORS.highlight}; 
                           color: ${VIZ_COLORS.textPrimary}; border: none; border-radius: 5px; 
                           cursor: pointer; font-size: 13px;">
                ✖ Close Details
            </button>
        </div>
    `;
    
    // Remove existing details
    const existingDetails = document.querySelector('.bin-details');
    if (existingDetails) existingDetails.remove();
    
    // Add new details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'bin-details';
    detailsDiv.innerHTML = detailHtml;
    document.getElementById('visualizationContainer').appendChild(detailsDiv);
}

/**
 * Create Magnitude Range Stacked Bar Chart
 * Shows distribution within a specific magnitude range with finer granularity
 * 
 * @param {Array} data - Array of earthquake objects
 * @param {string} containerId - ID of the container element
 * @param {number} minMag - Minimum magnitude
 * @param {number} maxMag - Maximum magnitude
 */
function createMagnitudeRangeChart(data, containerId, minMag, maxMag) {
    d3.select(`#${containerId}`).selectAll('*').remove();
    
    const container = document.getElementById(containerId);
    if (container) container.style.display = 'block';
    
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('background-color', VIZ_COLORS.background)
        .style('border-radius', '10px')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create 0.1 magnitude bins for detailed view
    const bins = [];
    for (let i = Math.floor(minMag * 10) / 10; i <= maxMag; i += 0.1) {
        bins.push({
            label: i.toFixed(1),
            value: i,
            count: 0
        });
    }
    
    // Fill bins
    data.forEach(eq => {
        const mag = parseFloat(eq.mag || eq.magnitude);
        const bin = bins.find(b => Math.abs(b.value - mag) < 0.05);
        if (bin) bin.count++;
    });
    
    const xScale = d3.scaleBand()
        .domain(bins.map(b => b.label))
        .range([0, width])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.count)])
        .nice()
        .range([height, 0]);
    
    const colorScale = d3.scaleLinear()
        .domain([minMag, maxMag])
        .range([VIZ_COLORS.magnitudeScale[0], VIZ_COLORS.magnitudeScale[2]]);
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', VIZ_COLORS.textPrimary)
        .text(`Magnitude Range ${minMag} - ${maxMag} (0.1 increments)`);
    
    // Axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickValues(bins.filter((_, i) => i % 5 === 0).map(b => b.label)))
        .selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary)
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    svg.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary);
    
    // Bars
    svg.selectAll('.bar')
        .data(bins.filter(b => b.count > 0))
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.label))
        .attr('width', xScale.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => colorScale(d.value))
        .transition()
        .duration(750)
        .attr('y', d => yScale(d.count))
        .attr('height', d => height - yScale(d.count));
}

/**
 * Create Interactive Map for Location-Based Searches
 * Shows earthquakes on a map with circles sized by magnitude
 * 
 * @param {Array} data - Array of earthquake objects with lat/lng
 * @param {string} containerId - ID of the container element
 * @param {Object} centerPoint - {lat, lng} of search center
 * @param {number} radius - Search radius in km
 */
function createLocationMap(data, containerId, centerPoint, radius) {
    d3.select(`#${containerId}`).selectAll('*').remove();
    
    const container = document.getElementById(containerId);
    if (container) container.style.display = 'block';
    
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style('background-color', VIZ_COLORS.background)
        .style('border-radius', '10px')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Simple projection
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.longitude || d.lng))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.latitude || d.lat))
        .range([height, 0]);
    
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.magnitude || d.mag)])
        .range([3, 20]);
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', VIZ_COLORS.textPrimary)
        .text(`Earthquakes within ${radius}km of (${centerPoint.lat.toFixed(2)}, ${centerPoint.lng.toFixed(2)})`);
    
    // Draw earthquakes
    svg.selectAll('.earthquake')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'earthquake')
        .attr('cx', d => xScale(d.longitude || d.lng))
        .attr('cy', d => yScale(d.latitude || d.lat))
        .attr('r', 0)
        .attr('fill', d => {
            const mag = d.magnitude || d.mag;
            return mag > 6 ? VIZ_COLORS.magnitudeScale[2] : 
                   mag > 4 ? VIZ_COLORS.magnitudeScale[1] : 
                   VIZ_COLORS.magnitudeScale[0];
        })
        .attr('opacity', 0.6)
        .attr('stroke', VIZ_COLORS.borders)
        .transition()
        .duration(750)
        .attr('r', d => sizeScale(d.magnitude || d.mag));
    
    // Center point marker
    if (centerPoint) {
        svg.append('circle')
            .attr('cx', xScale(centerPoint.lng))
            .attr('cy', yScale(centerPoint.lat))
            .attr('r', 8)
            .attr('fill', VIZ_COLORS.warning)
            .attr('stroke', VIZ_COLORS.textPrimary)
            .attr('stroke-width', 2);
    }
}

/**
 * Create Circular Time Pattern Chart (24-hour clock)
 * Shows earthquake frequency by hour of day
 * 
 * @param {Array} data - Array of earthquake objects with time property
 * @param {string} containerId - ID of the container element
 */
function createTimePatternChart(data, containerId) {
    d3.select(`#${containerId}`).selectAll('*').remove();
    
    const container = document.getElementById(containerId);
    if (container) container.style.display = 'block';
    
    const width = 600;
    const height = 600;
    const radius = Math.min(width, height) / 2 - 60;
    
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background-color', VIZ_COLORS.background)
        .style('border-radius', '10px')
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
    
    // Group by hour
    const hourCounts = Array(24).fill(0);
    data.forEach(eq => {
        const date = new Date(eq.time);
        const hour = date.getHours();
        hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    
    // Radial scale
    const radiusScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([radius * 0.3, radius]);
    
    // Create hour segments
    const angleStep = (2 * Math.PI) / 24;
    
    hourCounts.forEach((count, hour) => {
        const angle = hour * angleStep - Math.PI / 2;
        const nextAngle = (hour + 1) * angleStep - Math.PI / 2;
        
        const innerRadius = radius * 0.3;
        const outerRadius = radiusScale(count);
        
        // Create arc
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle(angle)
            .endAngle(nextAngle);
        
        // Color based on time of day
        const isDayTime = hour >= 6 && hour < 18;
        const color = isDayTime ? VIZ_COLORS.magnitudeScale[0] : VIZ_COLORS.magnitudeScale[2];
        
        svg.append('path')
            .attr('d', arc)
            .attr('fill', color)
            .attr('opacity', 0.7)
            .attr('stroke', VIZ_COLORS.borders);
        
        // Hour labels
        const labelAngle = angle + angleStep / 2;
        const labelRadius = radius * 1.15;
        const x = Math.cos(labelAngle) * labelRadius;
        const y = Math.sin(labelAngle) * labelRadius;
        
        svg.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('fill', VIZ_COLORS.textSecondary)
            .style('font-size', '12px')
            .text(`${hour}:00`);
    });
    
    // Title
    svg.append('text')
        .attr('x', 0)
        .attr('y', -radius - 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', VIZ_COLORS.textPrimary)
        .text('24-Hour Earthquake Pattern');
}

/**
 * Create Weekend vs Weekday Bar Chart
 * Compares earthquake frequency on weekends vs weekdays
 * 
 * @param {Array} data - Array of earthquake objects
 * @param {string} containerId - ID of the container element
 */
function createWeekendChart(data, containerId) {
    d3.select(`#${containerId}`).selectAll('*').remove();
    
    const container = document.getElementById(containerId);
    if (container) container.style.display = 'block';
    
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style('background-color', VIZ_COLORS.background)
        .style('border-radius', '10px')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Group by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = dayNames.map(name => ({ day: name, count: 0, isWeekend: name === 'Saturday' || name === 'Sunday' }));
    
    data.forEach(eq => {
        const date = new Date(eq.time);
        const dayIndex = date.getDay();
        dayCounts[dayIndex].count++;
    });
    
    const xScale = d3.scaleBand()
        .domain(dayNames)
        .range([0, width])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(dayCounts, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', VIZ_COLORS.textPrimary)
        .text('Earthquake Distribution by Day of Week');
    
    // Axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary)
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    svg.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary);
    
    // Bars
    svg.selectAll('.bar')
        .data(dayCounts)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.day))
        .attr('width', xScale.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => d.isWeekend ? VIZ_COLORS.magnitudeScale[2] : VIZ_COLORS.magnitudeScale[0])
        .transition()
        .duration(750)
        .attr('y', d => yScale(d.count))
        .attr('height', d => height - yScale(d.count));
}

/**
 * Create Early Morning Analysis Area Chart
 * Shows earthquake frequency during early morning hours (0-6 AM)
 * 
 * @param {Array} data - Array of earthquake objects
 * @param {string} containerId - ID of the container element
 */
function createEarlyMorningChart(data, containerId) {
    d3.select(`#${containerId}`).selectAll('*').remove();
    
    const container = document.getElementById(containerId);
    if (container) container.style.display = 'block';
    
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style('background-color', VIZ_COLORS.background)
        .style('border-radius', '10px')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Group by hour (0-6)
    const hourCounts = Array(7).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    
    data.forEach(eq => {
        const date = new Date(eq.time);
        const hour = date.getHours();
        if (hour <= 6) {
            hourCounts[hour].count++;
        }
    });
    
    const xScale = d3.scaleLinear()
        .domain([0, 6])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(hourCounts, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', VIZ_COLORS.textPrimary)
        .text('Early Morning Earthquakes (12 AM - 6 AM)');
    
    // Create area generator
    const area = d3.area()
        .x(d => xScale(d.hour))
        .y0(height)
        .y1(d => yScale(d.count))
        .curve(d3.curveMonotoneX);
    
    // Draw area
    svg.append('path')
        .datum(hourCounts)
        .attr('fill', VIZ_COLORS.magnitudeScale[2])
        .attr('opacity', 0.6)
        .attr('d', area);
    
    // Draw line
    const line = d3.line()
        .x(d => xScale(d.hour))
        .y(d => yScale(d.count))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(hourCounts)
        .attr('fill', 'none')
        .attr('stroke', VIZ_COLORS.highlight)
        .attr('stroke-width', 2)
        .attr('d', line);
    
    // Axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(7))
        .selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary);
    
    svg.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', VIZ_COLORS.textSecondary);
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createMagnitudeHistogram,
        createMagnitudeRangeChart,
        createLocationMap,
        createTimePatternChart,
        createWeekendChart,
        createEarlyMorningChart,
        VIZ_COLORS
    };
}
