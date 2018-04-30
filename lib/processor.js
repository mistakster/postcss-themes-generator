const convert = require('color-convert');
const cssTree = require('css-tree');
const memoize = require('lodash/memoize');

const EPSILON = 0.2;

const convertHexHsl = memoize(
  function (color) {
    return convert.hex.hsl.raw(color);
  }
);

const convertHslRgb = memoize(
  function (h, s, l) {
    return convert.hsl.rgb(h, s, l);
  },
  function (h, s, l) {
    return `${h}|${s}|${l}`;
  }
);

const convertRgbHsl = memoize(
  function (r, g, b) {
    return convert.rgb.hsl.raw(r, g, b);
  },
  function (r, g, b) {
    return `${r}|${g}|${b}`;
  }
);

function compareValues(a, b) {
  return Math.abs(a - b) < EPSILON;
}

function compareWithoutLightness(nodeColorHsl, baseColorHsl) {
  const nodeHSL = nodeColorHsl;

  return compareValues(nodeColorHsl[0], baseColorHsl[0]) &&
    compareValues(nodeColorHsl[1], baseColorHsl[1]);
}

function buildColorGenerator(baseColorHsl, themeColorHsl) {
  return (nodeColorHsl, callback) => {
    if (compareWithoutLightness(nodeColorHsl, baseColorHsl)) {
      const diff = Math.round(nodeColorHsl[2] - baseColorHsl[2]);

      callback(convertHslRgb(
        themeColorHsl[0],
        themeColorHsl[1],
        themeColorHsl[2] + diff
      ));
    }
  }
}

module.exports = function (value, baseColor, themeColor) {
  const ast = cssTree.parse(value, {context: 'value'});
  const baseColorHsl = convertHexHsl(baseColor);
  const themeColorHsl = convertHexHsl(themeColor);
  const colorGenerator = buildColorGenerator(baseColorHsl, themeColorHsl);

  let isProcessed = false;

  cssTree.walk(ast, {
    visit: 'HexColor',
    enter: (node, item, list) => {
      const nodeColorHsl = convertHexHsl(`#${node.value}`);

      colorGenerator(nodeColorHsl, rgb => {
        node.value = convert.rgb.hex(rgb).toLowerCase();
        isProcessed = true;
      });
    }
  });

  cssTree.walk(ast, {
    visit: 'Function',
    enter: (node, item, list) => {
      if (node.name !== 'rgba') {
        return;
      }

      const color = node.children
        .filter(c => c.type === 'Number')
        .map(c => c.value)
        .toArray();

      const nodeColorHsl = convertRgbHsl.apply(null, color);

      colorGenerator(nodeColorHsl, rgb => {
        list.replace(item, list.createItem({
          type: 'Function',
          name: 'rgba',
          children: [
            {type: 'Number', value: rgb[0]},
            {type: 'Operator', value: ','},
            {type: 'WhiteSpace', value: ' '},
            {type: 'Number', value: rgb[1]},
            {type: 'Operator', value: ','},
            {type: 'WhiteSpace', value: ' '},
            {type: 'Number', value: rgb[2]},
            {type: 'Operator', value: ','},
            {type: 'WhiteSpace', value: ' '},
            {type: 'Number', value: color[3]},
          ]
        }));
        isProcessed = true;
      });
    }
  });

  return isProcessed ? cssTree.generate(ast) : value;
};
