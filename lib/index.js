const postcss = require('postcss');
const convert = require('color-convert');

const hexColor = /^(.+\s)?(#[a-fA-F0-9]{6})(\s.+)?$/;
const rgbaColor = /^(.+\s)?rgba\(([01]?\d\d?|2[0-4]\d|25[0-5])\s*,\s*([01]?\d\d?|2[0-4]\d|25[0-5])\s*,\s*([01]?\d\d?|2[0-4]\d|25[0-5])\s*,\s*([1]|[0].[0-9]+)\)/;

const EPSILON = 0.2;

function compareColors(color1, color2) {
	return (
		color1.length === 3 &&
		color2.length === 3 &&
		Math.abs(color1[0] - color2[0]) < EPSILON &&
		Math.abs(color1[1] - color2[1]) < EPSILON
	);
}

function colorDifference(color1, color2) {
	return color2[2] - color1[2];
}

function convertHexToHsl(color) {
	const hslColor = convert.hex.hsl.raw(color);

	if (!hslColor || hslColor.length !== 3) {
		throw new Error(`"${color}" doesn’t look like HEX color value`);
	}

	return hslColor;
}
function convertHexToRgb(color) {
	const rgbColor = convert.hex.rgb.raw(color);

	if (!rgbColor || rgbColor.length !== 3) {
		throw new Error(`"${color}" doesn’t look like HEX color value`);
	}

	return rgbColor;
}

function convertRgbToHsl(r, g, b) {
	const hslColor = convert.rgb.hsl.raw(r, g, b);

	if (!hslColor || hslColor.length !== 3) {
		throw new Error(`"${r + g + b}" doesn’t look like RGB color value`);
	}

	return hslColor;
}

module.exports = postcss.plugin('postcss-themes-generator', opts => {
	if (!Array.isArray(opts) || opts.length < 1) {
		throw new Error('Themes are not configured');
	}

	const matchers = opts.map(color => {
		const rx = new RegExp(`_${color.name}(:[a-zA-Z]+)?(\\s.*)?$`);

		return function (rule) {
			return rx.test(rule.selector) ? color : null;
		};
	});

	return (root, result) => {
		root.walkRules(rule => {
			matchers.forEach(matcher => {
				const color = matcher(rule);

				if (!color) {
					return;
				}

				const themed = Object.keys(color.themes)
					.map(themeName => {
						const themedRule = rule.clone();

						themedRule.selectors = themedRule.selectors.map(selector => `.theme-${themeName} ${selector}`);
						let foundDeclaration = false;
						let madeReplace = false;

						themedRule.walkDecls(decl => {
							const values = decl.value.match(hexColor);
							const rgbaValues = decl.value.match(rgbaColor);

							if (rgbaValues) {
								const hslColor = convertRgbToHsl(rgbaValues[2], rgbaValues[3], rgbaValues[4]);
								const hslMatchColor = convertHexToHsl(color.match);

								if (compareColors(hslMatchColor, hslColor)) {
									const diff = colorDifference(hslMatchColor, hslColor);

									if (Math.abs(diff) < EPSILON) {
										const rgbThemeAtr = convertHexToRgb(color.themes[themeName]);
										const rgbaThemeColor = 'rgba(' + rgbThemeAtr[0] + ', ' + rgbThemeAtr[1] + ', ' + rgbThemeAtr[2] + ', ' + rgbaValues[5] + ')';

										decl.value = decl.value.replace(rgbaColor, `$1${rgbaThemeColor}`);
										madeReplace = true;
									}
								}
							}

							if (!values) {
								foundDeclaration = true;
								return;
							}

							const hslColor = convertHexToHsl(values[2], decl);
							const hslMatchColor = convertHexToHsl(color.match);

							if (compareColors(hslMatchColor, hslColor)) {
								const diff = colorDifference(hslMatchColor, hslColor);

								if (Math.abs(diff) < EPSILON) {
									decl.value = decl.value.replace(hexColor, `$1${color.themes[themeName]}$3`);
									madeReplace = true;
								} else {
									const hslThemeColor = convert.hex.hsl.raw(color.themes[themeName]);

									hslThemeColor[2] += Math.round(diff);
									const hexThemeColor = '#' + convert.hsl.hex(hslThemeColor).toLowerCase();

									decl.value = decl.value.replace(hexColor, `$1${hexThemeColor}$3`);
									madeReplace = true;
								}
							}

							foundDeclaration = true;
						});

						if (foundDeclaration !== madeReplace) {
							rule.warn(result, 'Suspicious rule');
						}

						return themedRule;
					});

				themed.unshift(rule.clone());

				rule.replaceWith(themed);
			});
		});
	};
});
