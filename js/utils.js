const generateColors = (function() {
  const generateColors = (numColors, numFields=1, baseCoords=[0, 0, 0]) => {
      const rDomain = Math.ceil(Math.cbrt(numFields));
      const gDomain = Math.ceil(Math.sqrt(numFields/rDomain));
      const bDomain = Math.ceil((numFields/rDomain) / gDomain);

      const rUnits = Math.ceil(Math.cbrt(numColors));
      const gUnits = Math.ceil(Math.sqrt(numColors/rUnits));
      const bUnits = Math.ceil((numColors/rUnits) / gUnits);

      const colorsArray = [];
      for (let i = 0; i < rUnits; i++) {
          for (let j = 0; j < gUnits; j++) {
              for (let k = 0; k < bUnits; k++) {
                      colorsArray.push([baseCoords[0] + Math.round(256 * i / (rUnits * rDomain)),
                                        baseCoords[1] + Math.round(256 * j / (gUnits * gDomain)),
                                        baseCoords[2] + Math.round(256 * k / (bUnits * bDomain))]);
              }
          }
      }
      if (numColors === colorsArray.length) {
          return colorsArray;
      }
      else {
          return reduceArray(colorsArray, numColors);
      }
  }

  const reduceArray = (prevArray, num) => {
      const remainder = prevArray.length - num;
      const newArray = [];
      for (let i = 0; i < prevArray.length; i++) {
          if (i % (Math.floor(prevArray.length / remainder)) !== 0 || i >= (Math.floor(prevArray.length / remainder) * remainder)) {
              newArray.push(prevArray[i]);
          }
      }
      return newArray;
  }

  return generateColors;
})();

const colorsMap = (function() {
  const colorsMap = {}
  const colors = generateColors(families.length);
  for (let i = 0; i < families.length; i++) {
    colorsMap[families[i].family] = colors[i];
  }
  families.forEach(family => {
    const subColors = generateColors(family.languages.length, families.length, colorsMap[family.family]);
    for (let i = 0; i < family.languages.length; i++) {
      colorsMap[family.languages[i]] = subColors[i];
    }
  })
  return colorsMap;
})();

const [maxPopulation, maxPercent] = (function() {
    return Object.keys(countyInfo).reduce(([accPop, accPer], county) => {
    const pop = Math.max(accPop, countyInfo[county].totalIndigenousPopulation);
    const per = Math.min(15, Math.max(accPer,
              countyInfo[county].totalIndigenousPopulation * 100 / countyInfo[county].totalPopulation));
    return [pop, per]
  }, [0, 0]);
})();

const gradients = `<defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(220, 20, 60, 1)" />
      <stop offset="100%" style="stop-color:rgba(220, 20, 60, 0)" />
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(34, 139, 34, 1)" />
      <stop offset="100%" style="stop-color:rgba(34, 139, 34, 0)" />
    </linearGradient>
  </defs>`;
