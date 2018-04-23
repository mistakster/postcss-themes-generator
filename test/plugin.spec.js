/* eslint-env node, jest */
const postcss = require('postcss');
const plugin = require('../lib/index');

const config = require('./config.json');

function runProcessing(input) {
	return postcss()
    .use(plugin(config))
    .process(input, {from: undefined})
		.then(result => {
		  const css = result.css.toString();

		  expect(css).toMatchSnapshot();

			return result;
		});
}

function run(input, warningCount) {
	return runProcessing(input)
		.then(result => {
			expect(result.warnings()).toHaveLength(warningCount || 0);

			return result;
		});
}

it('should match "primary", "secondary" and "accent" modifiers', () => {
	const input = '.foo_primary { color: #e54096 }' +
		'.bar_secondary { color: #0080c5 }' +
		'.baz_accent { color: #c1d730 }';

	return run(input);
});

it('should match modifiers at upper level', () => {
  const input = '.foo_primary .foo__test { color: #e54096 }';

  return run(input);
});

it('should match pseudo selector', () => {
	const input = '.foo_primary:hover { color: #e54096 }';

	return run(input);
});

it('should warn on suspicious rule', () => {
	const input = '.foo_primary { display: block }';

	return run(input, 3);
});

it('should match lighten 5% function', () => {
	const input = '.foo_primary { color: #e856a2 }';

	return run(input);
});

it('should match lighten 15% function', () => {
	const input = '.foo_primary { color: #ee83bb }';

	return run(input);
});

it('should match darken 5% function', () => {
	const input = '.foo_primary { color: #e22a8a }';

	return run(input);
});

it('should match darken 15% function', () => {
	const input = '.foo_primary { color: #bf1a70 }';

	return run(input);
});

it('should match color inside shortcut properties', () => {
	const input = '.foo_primary { border: #bf1a70 1px solid }';

	return run(input);
});
it('should skip unknown values', () => {
	const input = '.foo_accent { background-color: #c1d730; border: none; }';

	return run(input);
});

it('should process rgba() color', () => {
	const input = '.foo_accent { background-color: rgba(193, 215, 48, 0.15) }';

	return run(input);
});

it('should process rgba() color without spaces between commas', () => {
	const input = '.foo_accent { background-color: rgba(193,215,48,0.15) }';

	return run(input);
});

it('should process rgba() color in border', () => {
	const input = '.foo_accent { border: 1px solid rgba(193, 215, 48, 0.15) }';

	return run(input);
});

it('should process rgba() color in border mirror order', () => {
	const input = '.foo_accent { border: rgba(193, 215, 48, 0.15) 1px solid }';

	return run(input);
});
