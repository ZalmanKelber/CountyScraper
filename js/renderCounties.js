(function() {
  const state = {
    scaleConstant: 1,
    selectedFamily: null,
    selectedLanguages: null,
    selectedLanguage: null,
    selectedCounty: null,
    display: "etymologies",
    width: 0,
    height: 0,
    countyInfo,
    colorsMap,
    maxPopulation,
    maxPercent,
    families,
    gradients
  }

  const { feature } = topojson;
  const { select, selectAll, drag, json, geoPath, geoAlbersUsa } = d3;

  let svg = select("#map");
  const projection = geoAlbersUsa().scale(1300).translate([487.5, 305])
  const pathGenerator = geoPath().projection(projection);

  function render() {
    state.width = window.innerWidth >= 700 ? Math.min(1250, window.innerWidth) : window.innerWidth;
    state.scaleConstant = state.width / 1250;
    state.height = state.scaleConstant * 610;
    svg.remove();
    svg = selectAll("#map-container").append("svg");
    svg
      .attr("class", "map")
      .attr("id", "map")
      .attr("width", state.width)
      .attr("height", state.height);

    document.getElementById("map").addEventListener("click", reset);
    document.getElementById("map").innerHTML = state.gradients;

    renderCounties();
    if (state.selectedLanguages) {
      renderKey(state.selectedLanguages, false);
    }
    if (state.selectedCounty) {
      renderCountyInfo(state.selectedCounty);
    }
  }

  function renderCounties() {
    const gMap = svg.append("g");

    gMap.selectAll("path[class=county]")
      .data(state.mapData.features)
      .enter().append("path")
      .attr("class", "county")
      .attr("fill", getFill)
      .attr("stroke", getStroke)
      .attr("d", pathGenerator)
      .call(drag()
          .on("start", selectCounty));

    if (state.display === "etymologies") {
      renderKey(state.families, true);
    }
    else {
      renderBar();
    }

    svg.attr("transform", `scale(${state.scaleConstant})`);
    gMap.attr("transform", `scale(${state.scaleConstant})`);
  }

  function renderCountyInfo(d) {
    const county = state.countyInfo[d.id];
    const textData = [`County: ${county.name}`,
                      `Population: ${county.totalPopulation}`,
                      `Indigenous population: ${county.totalIndigenousPopulation}`]
    if (county.foundEtymology && county.nameIsIndigenous) {
      textData.push(`Language of etymology: ${getLanguageKeyText(county.language)}`);
      textData.push(`Language family: ${getLanguageKeyText(county.family)}`)
    }
    const fontSize = 10 * state.scaleConstant;
    const gCountyText = svg.append("g");
    gCountyText.selectAll("text[class=county-text]")
        .data(textData)
        .enter().append("text")
          .attr("class", "family-key-text")
          .attr("font-size", `${fontSize}px`)
          .attr("color", "black")
          .attr("transform", (d, i) => `translate(${550 * state.scaleConstant}, ${550 * state.scaleConstant + i * 10})`)
          .text(d => d);
  }

  function renderKey(data, fam) {
    const fontSize = 10 * state.scaleConstant;
    const titleAreaHeight = 100 * state.scaleConstant;
    const bottomMargin = 10 * state.scaleConstant;
    const spacing = 20 * state.scaleConstant;
    const rectSize = (state.height / state.families.length) - spacing * 2;
    if (fam) {
      renderTitle(getKeyX(fam) + rectSize * 1.5, titleAreaHeight / 1.3, fontSize);
    }
    const gKey = svg.append("g");
    gKey.selectAll("rect[class=family-key]")
      .data(data)
      .enter().append("rect")
          .attr("class", fam ? "family-key" : "language-key")
          .attr("height", rectSize)
          .attr("width", rectSize)
          .attr("x", getKeyX(fam))
          .attr("y", (d, i) => getKeyY(i, spacing, titleAreaHeight, bottomMargin, data.length))
          .attr("fill", fam ? getFamilyKeyFill : getLanguageKeyFill)
      .call(drag()
          .on("start", fam ? selectFamily : selectLanguage))

    const gKeyText = svg.append("g");
    gKeyText.selectAll("text[class=family-key-text]")
        .data(data)
        .enter().append("text")
          .attr("class", "family-key-text")
          .attr("font-size", `${fontSize}px`)
          .attr("color", "black")
          .attr("transform", (d, i) => `translate(${getKeyX(fam) + rectSize * 1.5}, ${fontSize / 3 + getKeyY(i, spacing, titleAreaHeight, bottomMargin, data.length) + rectSize / 2})`)
          .text(fam ? getFamilyKeyText : getLanguageKeyText);
  }

  function renderTitle(x, y, fontSize) {
    const titleText = state.display === "etymologies"
      ? "Language Families:"
      : (state.display === "population" ? "Indigenous population:" : "Percent Indigenous population:");
    svg.append("text")
      .attr("font-size", `${fontSize * 2}px`)
      .attr("color", "black")
      .attr("transform", `translate(${x}, ${y})`)
      .text(titleText)
  }

  function renderBar() {
    const fontSize = 10 * state.scaleConstant;
    renderTitle(state.width - 275 * state.scaleConstant, 100 * state.scaleConstant, fontSize);
    const rectTop = 200 * state.scaleConstant;
    const rectLeft = state.width - 200 * state.scaleConstant;
    const rectHeight = 300 * state.scaleConstant;
    const rectWidth = 15 * state.scaleConstant;
    svg.append("rect")
      .attr("height", rectHeight)
      .attr("width", rectWidth)
      .attr("x", rectLeft)
      .attr("y", rectTop)
      .attr("stroke", "rgba(0, 0, 0, 0.3)")
      .attr("fill", `url(#grad${state.display === "population" ? 1 : 2})`)
    svg.append("text")
      .attr("font-size", `${fontSize}px`)
      .attr("color", "black")
      .attr("transform", `translate(${rectLeft + rectWidth * 1.5}, ${rectTop + fontSize})`)
      .text(`${state.display === "population" ? state.maxPopulation : state.maxPercent.toFixed(1) + " %"}`)
    svg.append("text")
      .attr("font-size", `${fontSize}px`)
      .attr("color", "black")
      .attr("transform", `translate(${rectLeft + rectWidth * 1.5}, ${rectTop + rectHeight})`)
      .text(`0${state.display === "population" ? "" : " %"}`)
  }

  function selectFamily(d) {
    state.selectedCounty = null;
    if (!state.selectedFamily) {
        state.selectedFamily = d.family;
        state.selectedLanguages = d.languages;
    }
    else {
      state.selectedFamily = null;
      state.selectedLanguages = null;
      state.selectedLanguage = null;
    }
    render();
  }

  function selectLanguage(d) {
    state.selectedCounty = null;
    state.selectedLanguage = d;
    render();
  }

  function selectCounty(d) {
    if (!state.selectedCounty) {
      state.selectedCounty = d;
    }
    else {
      state.selectedCounty = null;
    }
    render();
  }

  function getKeyX(fam) {
    const rightMargin = fam ? 275 : 150;
    return state.width - (rightMargin * state.scaleConstant);
  }

  function getKeyY(i, spacing, titleAreaHeight, bottomMargin, length) {
    return ((state.height - titleAreaHeight - bottomMargin) * i / length) + spacing + titleAreaHeight;
  }

  function getFill(d) {
    if (state.selectedCounty && state.selectedCounty !== d) {
      return "none";
    }
    switch (state.display) {
      case "etymologies":
        return getEtymologyFill(d);
      case "population":
        return getPopulationFill(d);
      default:
        return getPercentFill(d);
    }
  }

  function getEtymologyFill(d) {
    if (!state.countyInfo[d.id] || !state.countyInfo[d.id].foundEtymology) {
      return "rgba(0, 0, 0, 0)";
    }
    if (!state.countyInfo[d.id].nameIsIndigenous) {
      return "#e7e7e7";
    }
    if (state.selectedFamily && state.selectedFamily !== state.countyInfo[d.id].family) {
      return "#d7d7d7";
    }
    if (state.selectedLanguage && state.selectedLanguage !== state.countyInfo[d.id].language) {
      return "#d7d7d7";
    }
    const color = state.colorsMap[state.countyInfo[d.id].language]
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  function getPopulationFill(d) {
      if (state.countyInfo[d.id]) {
          return `rgba(220, 20, 60, ${Math.sqrt(state.countyInfo[d.id].totalIndigenousPopulation / state.maxPopulation)})`
      }
      return "rgba(0, 0, 0, 0)";
  }

  function getPercentFill(d) {
    if (state.countyInfo[d.id]) {
        const percent = state.countyInfo[d.id].totalIndigenousPopulation * 100 / state.countyInfo[d.id].totalPopulation;
        return `rgba(34, 139, 34, ${Math.sqrt(percent / state.maxPercent)})`
    }
    return "rgba(0, 0, 0, 0)";
  }

  function getStroke(d) {
    if (state.selectedCounty === d) {
      return "black";
    }
    if (state.countyInfo[d.id] && !state.countyInfo[d.id].nameIsIndigenous) {
      return "#e7e7e7";
    }
    return "none";
  }

  function getFamilyKeyFill(d) {
    if (state.selectedFamily && state.selectedFamily !== d.family) {
      return "none";
    }
    const color = state.colorsMap[d.family];
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  function getLanguageKeyFill(d) {
    const color = state.colorsMap[d];
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  function getFamilyKeyText(d) {
    if (state.selectedFamily && state.selectedFamily !== d.family) {
      return "";
    }
    return d.family.match(/^(.*)language/) ? d.family.match(/^(.*)language/)[1] : d.family;
  }

  function getLanguageKeyText(d) {
    return d.match(/^(.*)language/) ? d.match(/^(.*)language/)[1] : d;
  }

  function reset() {
    console.log("resetting");
    state.selectedFamily = null;
    state.selectedLanguages = null;
    state.selectedLanguage = null;
    state.selectedCounty = null;
    render();
  }

  window.addEventListener("resize", render);
  ["etymologies", "population", "percent"].forEach(display => {
    document.getElementById(display).addEventListener("click", () => {
      state.display = display;
      reset();
    });
  });

  json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json", data => {
    state.mapData = feature(data, data.objects.counties);
    render();
  });
})();
