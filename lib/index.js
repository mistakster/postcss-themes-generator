const postcss = require('postcss');
const processor = require('./processor');

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

						themedRule.walkDecls(decl => {
						  const processedValue = processor(decl.value, color.match, color.themes[themeName]);

              if (decl.value === processedValue) {
                decl.remove();
              } else {
                decl.value = processedValue;
              }
						});

						if (themedRule.nodes.length < 1) {
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
