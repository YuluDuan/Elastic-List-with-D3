/**
 *
 */

(function () {
    //data vars
    var dimensionsArray = ['Award type', 'Faculty (of lead researcher)', 'Department/School/Institute/Centre', 'Year started', 'Keywords', 'Researcher Name (Lead)', 'Collaborating Faculty'];
    var dimensions = {};
    var documents;



    //d3 vars
    var elasticList,
        xAxis,
        x,
        margin,
        cols,
        tooltip,
        header_height = 25,
        dimensionHeaderHeight = 40;

    //
    var trimmerAt = 28,
        heightEmpty = "4px"

    tooltip = d3.select("#mytooltip")
        .style("visibility", "hidden")
        .style("background-color", "#333333");

    //populate main object to hold all data
    dimensionsArray.forEach(function (dim) {
        dimensions[dim] = {};
        dimensions[dim].values = {};
        dimensions[dim].filters = d3.set();
    });


    var onDataLoaded = function (error, csv) {
        console.log(csv.length + " documents");
        documents = csv;
        documents.forEach(function (d) {
            //add flag to check if a document contains the filtered terms
            d.__filtered__ = true;

            dimensionsArray.forEach(function (dim) {
                if (d[dim] != "") {
                    if (dim === "Keywords") {
                        parseHelper(d, dim, ",");
                    } else if (dim == "Collaborating Faculty") {
                        parseHelper(d, dim, ",");
                    } else {
                        if (d[dim] in dimensions[dim].values) {
                            dimensions[dim].values[d[dim]]++;
                        } else {
                            dimensions[dim].values[d[dim]] = 1;
                        }
                    }
                }
            });
        });
        console.log(dimensions);
        draw();
    }

    // helper function helps to parse the multi-value in one cell
    var parseHelper = function (docu, dim, delimiter) {
        var listvalues = docu[dim].split(delimiter);
        // for each sub-array keywords
        listvalues.forEach(function (val) {
            // trim(): A string with removed whitespace from both ends.
            val = val.trim();
            //made each keyword a seperated counter
            if (val in dimensions[dim].values) {
                dimensions[dim].values[val]++;
            } else {
                dimensions[dim].values[val] = 1; //will never be called in the second if of updateData function
            }
        });
    }


    var updateFilters = function (dim, item) {
        if (dimensions[dim].filters.has(item))
            dimensions[dim].filters.remove(item);
        else
            dimensions[dim].filters.add(item);

        if (!existFilters())
            d3.select(".elastic-list-filters").select("p").text("No filters applied.").append("span").style("font-weight", "normal").style("color", "black").text("  (Instruction: Use shortcut search [Command/CTRL+F] to scan for keywords.)");
        else {
            var values = [];
            for (var i = 0; i < dimensionsArray.length; i++)
                values = values.concat(dimensions[dimensionsArray[i]].filters.values());

            d3.select(".elastic-list-filters").select("p").text("Filtering by: " + values.toString() + ". ").append("span").style("font-weight", "normal").style("color", "black").style("float", "right").text("  (Instruction: Use shortcut search [Command/CTRL+F] to scan for keywords.)");
        }

        updateData();
    }


    // function to see if there is a filter by selecting values 
    var existFilters = function () {
        var exist = false;
        for (var i = 0; i < dimensionsArray.length && exist == false; i++)
            exist = exist || !dimensions[dimensionsArray[i]].filters.empty();
        return exist;
    }


    //update the attribute '__filtered__' on each document based on the current active filters 
    var updateData = function () {
        //reset all the counters
        var selected_keyword = "";
        var selected_f = "";

        dimensionsArray.forEach(function (dim) {
            d3.keys(dimensions[dim].values).forEach(function (key) {
                dimensions[dim].values[key] = 0;

            });

        });

        //if there are no filters, all documents pass the criteria
        if (!existFilters()) {
            documents.forEach(function (d) {
                d.__filtered__ = true;
                dimensionsArray.forEach(function (dim) {
                    if (dim === "Keywords") {
                        parseHelper(d, dim, ",");
                    } else if (dim === "Collaborating Faculty") {
                        parseHelper(d, dim, ",");
                    } else {
                        dimensions[dim].values[d[dim]]++;
                    }
                });
            });
        }
        //otherwise loop through the documents to see which ones pass the filter criteria
        else {
            documents.forEach(function (d) {
                //document is filtered if contains ALL the filter terms
                d.__filtered__ = true;
                for (var i = 0; i < dimensionsArray.length && d.__filtered__ == true; i++) {
                    if (!dimensions[dimensionsArray[i]].filters.empty()) {
                        if (dimensionsArray[i] === "Keywords") {
                            // if keywords array has the filters key word then make whole row active
                            //splitHelperInUpdate(d, dimensionsArray[i], ",");
                            var keywords = d[dimensionsArray[i]].split(",");
                            for (var j = 0; j < keywords.length; j++) {
                                var keyword = keywords[j].trim();

                                if (dimensions[dimensionsArray[i]].filters.has(keyword)) {
                                    selected_keyword = keyword;
                                    d.__filtered__ = true;
                                    break;
                                } else {
                                    d.__filtered__ = false;
                                }
                            }

                        } else if (dimensionsArray[i] == "Collaborating Faculty") {
                            //splitHelperInUpdate(d, dimensionsArray[i], ";");
                            var faculties = d[dimensionsArray[i]].split(",");
                            for (var j = 0; j < faculties.length; j++) {
                                var f = faculties[j].trim();

                                if (dimensions[dimensionsArray[i]].filters.has(f)) {
                                    selected_f = f;
                                    d.__filtered__ = true;
                                    break;
                                } else {
                                    d.__filtered__ = false;
                                }
                            }
                        }
                        else {
                            d.__filtered__ = d.__filtered__ && dimensions[dimensionsArray[i]].filters.has(d[dimensionsArray[i]]); // filters is an object.

                        }
                    }
                }

                //if document pass the filters, increase ocurrence of this document for each filter term 
                if (d.__filtered__ == true) {
                    dimensionsArray.forEach(function (dim) {
                        if (dim === "Keywords") {
                            if (selected_keyword != "") {  // when we select the signle keyword i can 
                                dimensions[dim].values[selected_keyword]++;
                            } else {
                                parseHelper(d, dim, ",");
                            }
                        } else if (dim === "Collaborating Faculty") {
                            if (selected_f != "") {  // when we select the signle keyword 
                                dimensions[dim].values[selected_f]++;
                            } else {
                                parseHelper(d, dim, ",");
                            }

                        } else {
                            dimensions[dim].values[d[dim]]++;
                        }
                    });
                }
            });
        }
        redraw();
    }



    var draw = function () {
        margin = { top: 20, right: 20, bottom: 30, left: 40 },
            width = 1170 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom + dimensionHeaderHeight,
            value_cell_padding = 1,
            value_cell_height = 37;

        x = d3.scale.ordinal()
            .domain(dimensionsArray)
            .rangeRoundBands([0, width]);

        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        elasticList = d3.select("#elastic-list")
            .attr("class", "elastic-list")
            .style("width", width + "px")
            .style("height", height + "px");

        //dimension headers
        elasticList.append("div")
            .attr("class", "elastic-list-dimension-headers")
            .selectAll(".elastic-list-dimension-header")
            .data(dimensionsArray)
            .enter()
            .append("div")
            .attr("class", "elastic-list-dimension-header")
            .style("width", x.rangeBand() + "px")
            .style("height", dimensionHeaderHeight + "px")
            // headers
            .text(function (d) {
                var temp;

                switch (d) {
                    case "Award type":
                        temp = "Award";
                        break;

                    case "Faculty (of lead researcher)":
                        temp = "Faculty";
                        break;

                    case "Department/School/Institute/Centre":
                        temp = "Dept/School/Inst/Ctr";
                        break;

                    case "Researcher Name (Lead)":
                        temp = "Lead Researcher";
                        break;

                    default:
                        temp = d.capitalize();

                }
                return temp;
            });

        //header with the active filters
        d3.select("#filtering").append("div")
            .attr("class", "elastic-list-filters")
            .style("height", header_height)
            .append("p")
            .text("No filters applied.")
            .append("span")
            .style("font-weight", "normal")
            .style("color", "black")
            .style("float", "right")
            .text("  (Instruction: Use shortcut search [Command/CTRL+F] to scan for keywords.)");

        d3.select("#results")
            .style("width", width + "px");

        redraw();
    }



    var setHeightCell = function (dimNode, d) {
        var minValue = dimNode.attributes["__minvalue__"].value;
        return (d.value == 0) ? heightEmpty : (value_cell_height + (d.value / minValue) + 18) + "px";
    }



    var redraw = function () {
        var transitionTime = 1000;
        var getMinValueDimension = function (dimension, i) {
            //how to estimate the height of an item:
            //minimum height for an item is 20px, from here take the minimum value from
            //all items data, this value will be the base to calculate the factor to apply to
            //the rest of values to get a new height from the 20px minimum height
            return d3.min(
                d3.values(dimension.value.values).filter(function (value) {
                    return value > 0;
                })
            );
        }
        var getValuesDimension = function (dimension, i) {
            if (dimension.key == "Year started")
                return d3.entries(dimension.value.values).reverse();   //chronological order if needed
            else
                return d3.entries(dimension.value.values)
                    .sort(function (a, b) {
                        return d3.descending(a.value, b.value);
                        // return (a.value > b.value) ? -1 : (a.value < b.value) ? 1 : 0; same as above sort by descending order
                    }).sort(function (a, b) {
                        if ((a.value == 1 && b.value == 1) || (a.value == 2 && b.value == 2)) { // if a and b == 1 sorted by alphabetical order
                            return (a.key < b.key) ? -1 : (a.key > b.key) ? 1 : 0;
                        } else {
                            return;
                        }
                    })
                    .filter(function (obj) {
                        return obj.key != "";
                    });

        }

        //join new data with old elements, if any
        cols = elasticList
            .selectAll(".elastic-list-dimension")
            .data(d3.entries(dimensions));

        cols.attr("__minvalue__", getMinValueDimension);

        //COL UPDATE SELECTION
        cols.selectAll(".elastic-list-dimension-item")
            .data(getValuesDimension)
            .classed("filter", function (d) {
                return dimensions[this.parentNode.__data__.key].filters.has(d.key);
            })
            .transition()
            .duration(transitionTime)
            .style("height", function (d) {
                return setHeightCell(this.parentNode, d);
            });


        //COLS ENTER SELECTION, create new elements as needed 
        var items_in_new_cols = cols.enter()
            .append("div")
            .attr("class", "elastic-list-dimension")
            .style("width", x.rangeBand() + "px")
            .style("height", (height - dimensionHeaderHeight) + "px")
            .attr("__minvalue__", getMinValueDimension)
            .selectAll(".elastic-list-dimension-item")
            .data(getValuesDimension);


        items_in_new_cols.enter()
            .append("div")
            .attr("class", "elastic-list-dimension-item")
            .style("height", function (d) {
                return setHeightCell(this.parentNode, d);
            })
            .style("width", x.rangeBand() + "px")
            .style("left", 0)
            .on("mouseover", function (d) {
                if (d.value == 0) {
                    tooltip
                        .html(d.key + ": no matchings")
                        .style("visibility", "visible");
                }
                else if (d3.select(this).text().indexOf("...") > -1) {
                    tooltip
                        .html(d.key + ": " + d.value)
                        .style("visibility", "visible");
                }

                d3.select(this).classed("elastic-list-dimension-item-hover", true);
            })
            .on("mousemove", function (d) {
                if (d.value == 0 || d3.select(this).text().indexOf("...") > -1)
                    tooltip.style("top", (d3.event.pageY - 20) + "px").style("left", (d3.event.pageX + 5) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("visibility", "hidden");
                d3.select(this).classed("elastic-list-dimension-item-hover", false);
            })
            .on("click", function (d) {
                tooltip.style("visibility", "hidden");
                //send filter to add and its dimension
                updateFilters(this.parentNode.__data__.key, d.key);
                d3.select(this).classed("elastic-list-dimension-item-hover", false);
                d3.select(this).classed("filter", function (d) {
                    return dimensions[this.parentNode.__data__.key].filters.has(d.key);
                });
            });

        //update text data for each item
        items = elasticList.selectAll(".elastic-list-dimension-item");
        items.each(function (d, i) {
            //remove all <p>. If this terms has occurrences based on the filter criteria, add <p> again
            d3.select(this).selectAll("p").remove();
            if (d.value > 0) {
                d3.select(this).append("p")
                    .html((d.key.length > trimmerAt) ? d.key.substring(0, trimmerAt) + "..." : d.key)
                    .style("opacity", 0)
                    .attr('class', 'key')
                    .transition()
                    .duration(transitionTime)
                    .delay(200)
                    .style("opacity", 1);

                d3.select(this).append("p")
                    .html("<b>" + d.value + "</b>")
                    .style("opacity", 0)
                    .attr('class', 'value')
                    .transition()
                    .duration(transitionTime)
                    .delay(200)
                    .style("opacity", 1);
            }
        });

        var html = "";
        var Updatesum = 0;
        documents.forEach(function (d) {
            // display panel!
            if (d.__filtered__) { // 
                if (d["Award Affiliation"] == "" && d["Other relevant information (Co-Lead)"] == "" && d["Collaborating Faculty"] == "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". " + "</p>"
                } else if (d["Other relevant information (Co-Lead)"] != "" && d["Award Affiliation"] != "" && d["Collaborating Faculty"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Connected to: " + d["Award Affiliation"] + "; " + d["Other relevant information (Co-Lead)"] + ". Collaborating with: " + d["Collaborating Faculty"] + ". " + "</p>"
                } else if (d["Award Affiliation"] != "" && d["Other relevant information (Co-Lead)"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Connected to: " + d["Award Affiliation"] + "; " + d["Other relevant information (Co-Lead)"] + ". " + "</p>"
                } else if (d["Collaborating Faculty"] != "" && d["Other relevant information (Co-Lead)"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Connected to: " + d["Other relevant information (Co-Lead)"] + ". Collaborating with: " + d["Collaborating Faculty"] + ". " + "</p>"
                } else if (d["Collaborating Faculty"] != "" && d["Award Affiliation"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Connected to: " + d["Award Affiliation"] + ". Collaborating with: " + d["Collaborating Faculty"] + ". " + "</p>"
                } else if (d["Collaborating Faculty"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Collaborating with: " + d["Collaborating Faculty"] + ". " + "</p>"
                } else if (d["Award Affiliation"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Connected to: " + d["Award Affiliation"] + ". " + "</p>"
                } else if (d["Other relevant information (Co-Lead)"] != "") {
                    html += "<b>" + d["Award type"].trim() + " - " + d["Title"].trim() + ". " + d["Faculty (of lead researcher)"].trim() + ". " + d["Department/School/Institute/Centre"].trim() + ". " + d["Year started"].trim() + " - " + d["Year ended"].trim() + ". " + d["Researcher Name (Lead)"].trim() + ". " + d["Amount awarded (cum.)"].trim() + ". " + "Keywords: " + "<span class='price-motivation'> " + d.Keywords + "</span>" + ". Connected to: " + d["Other relevant information (Co-Lead)"] + ". " + "</p>"
                }

                Updatesum += parseInt(d["Amount awarded (cum.)"].replace(/[^a-zA-Z0-9 ]/g, '').trim());
            }
        });
        d3.select("#results").html(html);
        d3.select("#results-count").html("Found " + d3.select("#results").selectAll("p")[0].length + ".    Total " + Updatesum.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', }));
    }

    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    d3.csv("ElasticList.csv", onDataLoaded);
}());