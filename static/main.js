// ts_svg = d3.select('#chart').append('svg');

var width = 600, // determines the overall scale. it will just fill the available space
    mapAspectRatio = 1, 
    mareyAspectRatio = 1 / 10, // width / height
    margin = {top: 250, left: 60, right: 10, bottom: 10}, // defines how much space to give for axes
    height = width / mareyAspectRatio;

// create responsive svg for moray plots and map
var svgMap = d3.select('#map .wrap').append('svg').call(responsiveSvg, {width: width, aspectRatio: mapAspectRatio}),
	svgMarey1 = d3.select('#marey1').append('svg').call(responsiveSvg, {width: width, aspectRatio: mareyAspectRatio}),
	svgMarey2 = d3.select('#marey2').append('svg').call(responsiveSvg, {width: width, aspectRatio: mareyAspectRatio});

var formatTime = d3.timeFormat("%H:%M:%S");
var parseTime = d3.timeParse("%H:%M:%S");



// Marey Plots

var line = d3.line()
	.curve(d3.curveBasis)
    .x(function(d) { return x(parseTime(d.date)); })
    .y(function(d) { return y(d.close); });

var x = d3.scaleLinear()
    .rangeRound([margin.left, width - margin.right]);

var y = d3.scaleTime()
    .rangeRound([margin.top, height - margin.bottom])
    .domain([parseTime('00:00:00'), parseTime('23:59:59')]);

var yAxis = d3.axisLeft()
    .scale(y)
    .ticks(24)
    .tickFormat(formatTime);



// cipping path for lines so they don't show outside of the plot. idk I found it in the marey example
svgMarey1.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
  	.attr("x", -margin.left)
    .attr("y", -margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom);


function drawSubwayLabels(subway_lines) {
	var subway_lines = d3.select('#subway-line-labels').selectAll('.subway-line').data(subway_lines);

	subway_lines.enter()
		.append('div').attr('class', (d) => 'subway-line')
		.style('background-color', (d) => d.route_color ? '#'+d.route_color : null)
		.style('color', (d) => d.route_text_color ? '#'+d.route_text_color : null)
		.text(d => d.route_id)
		.on('click', function(d) {
			// toggle selected
			d3.select(this.parentNode).selectAll('.subway-line').classed('selected', false);
			d3.select(this).classed('selected', true);

			// display line details
			var details = d3.select('#line-details')

			// display line name
			var title = details.select('.title').text(d.route_long_name)
			title.append('span').text(' ('+d.route_short_name+')');
			title.append('a').attr('class', 'badge badge-pill badge-light')
				.attr('href', d.route_url).attr('target', '_blank').text('Timetable (pdf)');

			// display line description
			details.select('.description').text(d.route_desc);

			// draw graph
			loadMareyDiagram(d, svgMarey1);
		});
}

function loadMareyDiagram(line, svg) {
	d3.queue()
		.defer(d3.json, `/data/stations/${line.route_id}`)
		.defer(d3.json, `/data/trips/${line.route_id}`)
		.await(function(err, stations, trips){
			// console.log(stations, trips);
			drawMareyDiagram(stations, trips, svg);
		});
}

function drawMareyDiagram(stations, trips, svg) {
	x.domain(d3.extent(stations, (d) => d.distance));
	
	d3.select(svg.node().parentNode).classed('d-none', false)

	// Create axis

	var station = svg.selectAll('.station')
		.data(stations)
		.enter().append('g').attr('class', 'station')
		.attr("transform", (d) => `rotate(-90)translate(${-margin.top+10},${x(d.distance)})`); // can't rotate at other angle currently

	station.append("text")
		.attr("x", -6)
		.attr("dy", ".35em")
		.text((d) => d.stop_name);

	station.append("line")
		.attr("x2", width);

	svg.append("g")
	  .attr("class", "y left axis")
	  .attr('transform', `translate(${margin.left},0)`)
	  .call(yAxis);

	// var train = svg.append("g")
	//   .attr("class", "train")
	//   .attr("clip-path", "url(#clip)")
	//   .selectAll("g")
	// 	.data(data.lines)
	// 	.enter().append("g")
	// 	.attr("class", function(d) { return d.type; });

	// train.append("path")
	//   .attr("d", function(d) { return line(d.stops); });

	// train.selectAll("circle")
	//   .data(function(d) { return d.stops; })
	// .enter().append("circle")
	//   .attr("transform", function(d) { return "translate(" + x(d.time) + "," + y(d.station.distance) + ")"; })
	//   .attr("r", 2);
}



function drawMap(geojson) {
	// http://codewritingcow.com/d3-js/maps/americas/united-states/new-york/new-york-city/

	// d3+leaflet https://bost.ocks.org/mike/leaflet/

	var mapRatioAdjuster = 100,
	    scale = width*(mapAspectRatio + mapRatioAdjuster), //width * (width / height + mapRatioAdjuster),
	    nyc_center = [-74, 40.7];

    // Create the geographic projection
    var projection = d3.geoMercator()
    	.translate([width / 2, (width / mapAspectRatio) / 2])
    	.scale(scale).center(nyc_center);

    // create line generator
	var geoPath = d3.geoPath().projection(projection);

	svgMap.selectAll('path')
	  .data(geojson.features)
	  .enter()
	  .append('path')
	  .attr('stroke', '#000')
	  .attr('stroke-width', '1px')
	  .attr('fill', 'none')
	  .attr('d', geoPath);
}


function responsiveSvg(el, o){
	o = Object.assign({
		width: 100, height: null, aspectRatio: 1
	}, o);

	o.height = o.height || o.width / o.aspectRatio;
	el.attr('viewBox', `0 0 ${o.width} ${o.height}`)
	  .attr('preserveAspectRatio', 'xMidYMid meet')
}




function throttle(fn, restPeriod){ 
	// only fire a function every so often
	var free = true;
	return function(){
		if (free){
			fn.apply(this, arguments);
			free = false;
			setTimeout((d) => { free = true; }, restPeriod);
		}
	}
}

