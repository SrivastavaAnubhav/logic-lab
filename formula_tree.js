function loadGraph(content, type)
{
	// Create a new directed graph
	var g = new dagreD3.graphlib.Graph().setGraph({});

	for (const id of Object.keys(content.ids))
	{
		let options = {label: content.ids[id]};
		if (content.colors[id])
		{
			options.style = "fill: " + content.colors[id];
		}
		g.setNode(id, options);
	}

	for (const from of Object.keys(content.edges))
	{
		if (type === "formula tree")
		{
			for (const to of content.edges[from])
			{
				g.setEdge(from, to, {label: ""});
			}
		}
		else if (type === "BDD")
		{
			if (content.edges[from][0] === content.edges[from][1])
			{
				g.setEdge(from, content.edges[from][0], {label: "F/T"});
			}
			else
			{
				// TODO: make the false branch dashed (without shading the polygon)
				g.setEdge(from, content.edges[from][0], {label: "F"});
				g.setEdge(from, content.edges[from][1], {label: "T"});
			}
		}
	}

	// Set some general styles
	g.nodes().forEach(function(v) {
	  var node = g.node(v);
	  node.rx = node.ry = 5;
	});

	var svg = d3.select("#formulaTree"),
		inner = svg.select("#formulaTreeGraph");

	// Set up zoom support
	var zoom = d3.behavior.zoom().on("zoom", function()
	{
		inner.attr("transform", "translate(" + d3.event.translate + ")" + "scale(" + d3.event.scale + ")");
	});
	svg.call(zoom);

	// Create the renderer
	var render = new dagreD3.render();

	// Run the renderer. This is what draws the final graph.
	render(inner, g);

	// Center the graph
	var initialScale = 0.75;
	zoom
		.translate([(svg.attr("width") - g.graph().width * initialScale) / 2, 20])
		.scale(initialScale)
		.event(svg);
	svg.attr('height', g.graph().height * initialScale + 40);
}