 // Function to show/hide loading spinner
 function showLoading(show) {
     document.getElementById("loading-spinner").style.display = show ? "block" : "none";
 }

 // Function to convert JSON to a hierarchical structure for D3.js
 function convertToHierarchy(data, key = "Root") {
     if (typeof data !== "object" || data === null) {
         return {
             name: `${key}: ${data}`
         };
     }
     const children = [];
     for (const key in data) {
         if (data.hasOwnProperty(key)) {
             const child = convertToHierarchy(data[key], key);
             children.push(child);
         }
     }
     return {
         name: key,
         children: children.length ? children : [{
             name: "Empty"
         }]
     };
 }

 // Function to visualize JSON as nodes using D3.js
 function visualizeJson(jsonData) {
     showLoading(true); // Show loading spinner
     try {
         d3.select("#graph").html("");

         // Convert JSON to a hierarchical structure
         const root = convertToHierarchy(jsonData);
         const hierarchy = d3.hierarchy(root);
         const treeLayout = d3.tree().size([800, 500]);

         // Collapse subtrees for large datasets
         hierarchy.descendants().forEach(d => {
             if (d.children && d.depth > 2) {
                 d._children = d.children;
                 d.children = null;
             }
         });

         treeLayout(hierarchy);

         // Create SVG container
         const svg = d3.select("#graph")
             .attr("width", "100%")
             .attr("height", "100%")
             .call(d3.zoom().on("zoom", (event) => {
                 svgGroup.attr("transform", event.transform);
             }))
             .append("g");

         const svgGroup = svg.append("g");

         // Draw links
         svgGroup.selectAll(".link")
             .data(hierarchy.links())
             .enter()
             .append("path")
             .attr("class", "link")
             .attr("d", d3.linkHorizontal()
                 .x(d => d.y)
                 .y(d => d.x)
             );

         // Draw nodes
         const nodes = svgGroup.selectAll(".node")
             .data(hierarchy.descendants())
             .enter()
             .append("g")
             .attr("class", "node")
             .attr("transform", d => `translate(${d.y},${d.x})`);

         // Add squares for nodes
         nodes.append("rect")
             .attr("width", 20)
             .attr("height", 20)
             .attr("x", -10)
             .attr("y", -10)
             .attr("fill", "#4CAF50")
             .attr("stroke", "#388E3C")
             .attr("stroke-width", 1.5)
             .on("mouseover", (event, d) => {
                 tooltip.transition()
                     .duration(200)
                     .style("opacity", 0.9);
                 tooltip.html(`<strong>${d.data.name}</strong><br>${JSON.stringify(d.data)}`)
                     .style("left", `${event.pageX + 5}px`)
                     .style("top", `${event.pageY - 28}px`);
             })
             .on("mouseout", () => {
                 tooltip.transition()
                     .duration(500)
                     .style("opacity", 0);
             })
             .on("click", (event, d) => {
                 if (d.children) {
                     d._children = d.children;
                     d.children = null;
                 } else {
                     d.children = d._children;
                     d._children = null;
                 }
                 visualizeJson(jsonData); // Re-render
             });

         // Add text labels for nodes
         nodes.append("text")
             .attr("class", "text")
             .attr("dy", "0.35em")
             .attr("x", d => d.children ? -15 : 15)
             .style("text-anchor", d => d.children ? "end" : "start")
             .text(d => d.data.name);
     } catch (error) {
         console.error("Error visualizing JSON:", error);
         alert("Invalid JSON input. Please check your JSON and try again.");
     } finally {
         showLoading(false); // Hide loading spinner
     }
 }

 // Function to search for a node by name
 function searchNode(query) {
     const nodes = d3.selectAll(".node");
     let foundNode = null;

     nodes.each(function(d) {
         if (d.data.name.toLowerCase().includes(query.toLowerCase())) {
             foundNode = d;
             d3.select(this).classed("highlighted", true);
         } else {
             d3.select(this).classed("highlighted", false);
         }
     });

     if (foundNode) {
         const svg = d3.select("#graph");
         const svgGroup = d3.select("#graph g");
         const [x, y] = [foundNode.y, foundNode.x];
         const scale = 2;
         const transform = d3.zoomIdentity
             .translate(-x * scale + svg.node().clientWidth / 2, -y * scale + svg.node().clientHeight / 2)
             .scale(scale);

         svgGroup.transition()
             .duration(750)
             .attr("transform", transform);
     } else {
         alert("Node not found.");
     }
 }

 // Function to export the visualization as PNG, JPG, or SVG
 function exportVisualization(format) {
     const svgElement = document.getElementById("graph");
     const svgData = new XMLSerializer().serializeToString(svgElement);

     if (format === "svg") {
         const blob = new Blob([svgData], {
             type: "image/svg+xml"
         });
         const link = document.createElement("a");
         link.download = "visualization.svg";
         link.href = URL.createObjectURL(blob);
         link.click();
     } else {
         const canvas = document.createElement("canvas");
         const ctx = canvas.getContext("2d");

         canvas.width = svgElement.clientWidth;
         canvas.height = svgElement.clientHeight;

         canvg(canvas, svgData, {
             ignoreDimensions: true,
             scaleWidth: canvas.width,
             scaleHeight: canvas.height,
             renderCallback: () => {
                 const imageFormat = format === "jpg" ? "jpeg" : "png";
                 canvas.toBlob((blob) => {
                     const link = document.createElement("a");
                     link.download = `visualization.${format}`;
                     link.href = URL.createObjectURL(blob);
                     link.click();
                 }, `image/${imageFormat}`);
             },
         });
     }
 }

 // Event listeners
 document.getElementById("visualize-button").addEventListener("click", () => {
     const jsonInput = document.getElementById("json-input").value.trim();
     if (!jsonInput) {
         alert("Please enter JSON data.");
         return;
     }
     try {
         const jsonData = JSON.parse(jsonInput);
         visualizeJson(jsonData);
         const squareSize = parseInt(document.getElementById("square-size").value);
         d3.selectAll(".node rect")
             .attr("width", squareSize)
             .attr("height", squareSize)
             .attr("x", -squareSize / 2)
             .attr("y", -squareSize / 2);
     } catch (error) {
         console.error("Error parsing JSON:", error);
         alert("Invalid JSON input. Please check your JSON and try again.");
     }
 });

 document.getElementById("clear-button").addEventListener("click", () => {
     d3.select("#graph").html("");
     document.getElementById("json-input").value = "";
 });

 document.getElementById("search-button").addEventListener("click", () => {
     const query = document.getElementById("search-input").value;
     if (query) {
         searchNode(query);
     } else {
         alert("Please enter a search query.");
     }
 });

 document.getElementById("export-button").addEventListener("click", () => {
     const format = document.getElementById("export-format").value;
     exportVisualization(format);
 });

 // Tooltip setup
 const tooltip = d3.select("body").append("div")
     .attr("class", "tooltip")
     .style("opacity", 0);