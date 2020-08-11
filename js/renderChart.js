(function() {
  const allCountiesCategories = ["noData", "notIndigenous", "indigenous"]
  const familyCategories = Object.keys(stats).filter(key => {
    return key !== "noData" && key !== "notIndigenous" && key !== "indigenous";
  });
  const data1 = familyCategories.map(fam => {
    return {title: fam, value: stats[fam].number}
  });
  const data2 = familyCategories.map(fam => {
    return {title: fam, value: stats[fam].population}
  });
  const data3 = allCountiesCategories.map(cat => {
    return {title: cat, value: stats[cat].number}
  });
  const data4 = allCountiesCategories.map(cat => {
    return {title: cat, value: stats[cat].population}
  });
  const data5 = familyCategories.map(fam => {
    return {title: fam, value: 1}
  });
  const data6 = allCountiesCategories.map(cat => {
    return {title: cat, value: 1}
  });

  const { arc, pie, select, selectAll } = d3;

  const state = {
    width: 0,
    height: 0,
    margin: 0,
    outerRadius: 0,
    innerRadius: 0,
    scaleConstant: 1,
    allCounties: true,
    population: false,
    colorsMap
  }

  let svg = select("#chart");

  function renderChart() {
    state.width = window.innerWidth >= 700 ? Math.min(700, window.innerWidth) : window.innerWidth - 100;
    state.scaleConstant = state.width / 700;
    state.height = state.width;
    state.margin = 200 * state.scaleConstant
    state.outerRadius = (state.width / 2 - state.margin) * 0.6;
    state.innerRadius = (state.width / 2 - state.margin) * 0.4;
    svg.remove();
    svg = selectAll("#chart-container").append("svg");
    svg
      .attr("class", "chart")
      .attr("id", "chart")
      .attr("width", state.width)
      .attr("height", state.height)
      .append("g")
        .attr("transform", `translate(${state.width / 2}, ${state.height / 2})`);
    const chartArc = arc()
         .innerRadius(state.innerRadius)
         .outerRadius(state.outerRadius);
    const chartPie = pie()
         .value(d => d.value)
         .sort(null);

    svg.selectAll('path[class="donut"]')
         .data(chartPie(getData()))
         .enter().append("path")
         .attr("class", "donut")
         .attr("d", chartArc)
         .attr("fill", getColor)
         .attr("transform", `translate(${state.width / 2}, ${state.height / 2})`)
         .attr("points", d => renderLabel(d, chartArc));
  }

  function renderLabel(d, chartArc) {
    const fontSize = 10 * state.scaleConstant;
    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
    const outerRadius = state.outerRadius / Math.pow(Math.abs(Math.sin(midangle)), 0.3)
    const outerArc = arc()
         .innerRadius(outerRadius)
         .outerRadius(outerRadius)
    const [x1, y1] = chartArc.centroid(d) // line insertion in the slice
    const [x2, y2] = outerArc.centroid(d) // line break: we use the other arc generator that has been built only for that
    const x3 = state.width * getConstant(midangle) * (midangle < Math.PI ? 1 : -1);
    svg.append("polyline")
      .attr("stroke", "black")
      .attr("fill", "none")
      .attr("points", [[x1 + state.width / 2, y1 + state.width / 2],
                       [x2 + state.width / 2, y2 + state.width / 2],
                       [x3 + state.width / 2, y2 + state.width / 2]])
    svg.append("text")
        .attr("class", "chart-label")
        .attr("font-size", `${fontSize}px`)
        .text(() => getLabelText(d.data))
        .attr("transform", `translate(${x3 + 3 * state.scaleConstant * (midangle < Math.PI ? 1 : -1)+ state.width / 2}, ${y2 + fontSize / 3 + state.width / 2})`)
        .attr("text-anchor", midangle < Math.PI ? "start" : "end")
  }

  function getLabelText(data) {
    if (state.population) {
      return data.title + " | total population: " + data.value;
    }
    return data.title + " | " + data.value + " counties";
  }

  function getConstant(theta) {
    if (theta < Math.PI / 3 || (theta > Math.PI * 2 / 3 && theta < Math.PI * 4 / 3) || theta > Math.PI * 5 / 3) {
      return .1;
    }
    return .17;
  }

  function transition() {
    const chartArc = arc()
         .innerRadius(state.innerRadius)
         .outerRadius(state.outerRadius);
    const chartPie = pie()
         .value(d => d.value)
         .sort(null);
    const path = selectAll('path[class="donut"]')
              .data(chartPie(getData()))
    path.transition().duration(1000).attr("d", chartArc);
    setTimeout(renderChart, 1000)
  }

  function getData() {
    if (state.allCounties) {
      if (state.population) {
        return data4;
      }
      return data3;
    }
    if (state.population) {
      return data2;
    }
    return data1;
  }

  function getColor(d) {
    switch (d.data.title) {
      case "noData":
        return "#e7dde7";
      case "notIndigenous":
        return "#b7b787"
      case "indigenous":
        return "#013220";
      default:
        const color = state.colorsMap[d.data.title]
        return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    }
  }

  document.getElementById("chart-1").addEventListener("click", e => {
    e.preventDefault();
    state.population = false;
    if (state.allCounties) {
      transition()
    }
    else {
      state.allCounties = true;
      renderChart();
    }
  });
  document.getElementById("chart-2").addEventListener("click", e => {
    e.preventDefault();
    state.population = true;
    if (state.allCounties) {
      transition()
    }
    else {
      state.allCounties = true;
      renderChart();
    }
  });
  document.getElementById("chart-3").addEventListener("click", e => {
    e.preventDefault();
    state.population = false;
    if (!state.allCounties) {
      transition()
    }
    else {
      state.allCounties = false;
      renderChart();
    }
  });
  document.getElementById("chart-4").addEventListener("click", e => {
    e.preventDefault();
    state.population = true;
    if (!state.allCounties) {
      transition()
    }
    else {
      state.allCounties = false;
      renderChart();
    }
  });

  window.addEventListener("resize", renderChart);

  renderChart();
})();
