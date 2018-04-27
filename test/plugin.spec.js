/* eslint-env node, jest */
const postcss = require('postcss');
const plugin = require('../lib/index');

const config = require('./config.json');

function run(input, warningCount) {
  return postcss()
    .use(plugin(config))
    .process(input, {from: undefined})
    .then(result => {
      const css = result.css.toString();

      expect(css).toMatchSnapshot();

      return result;
    })
    .then(result => {
      expect(result.warnings()).toHaveLength(warningCount || 0);

      return result;
    });
}

it('should match "primary", "secondary" and "accent" modifiers', () => (
  run(`
.foo_primary {
  color: #e54096;
}
.bar_secondary {
  color: #0080c5;
}
.baz_accent {
  color: #c1d730;
}
`)
));

it('should match modifiers at upper level', () => (
  run(`
.foo_primary .foo__test {
  color: #e54096;
}`
)
));

it('should match pseudo selector', () => (
  run(`
.foo_primary:hover {
  color: #e54096;
}
`)
));

it('should warn on suspicious rule', () => (
  run(`
.foo_primary {
  display: block;
}
`, 3)
));

it('should match lighten 5% function', () => (
  run(`
.foo_primary {
  color: #e856a2;
}
`)
));

it('should match lighten 15% function', () => (
  run(`
.foo_primary {
  color: #ee83bb;
}
`)
));

it('should match darken 5% function', () => (
  run(`
.foo_primary {
  color: #e22a8a;
}
`)
));

it('should match darken 15% function', () => (
  run(`
.foo_primary {
  color: #bf1a70;
}
`)
));

it('should match color inside shortcut properties', () => (
  run(`
.foo_primary {
  border: #bf1a70 1px solid;
}
`)
));

it('should remove unnecessary properties', () => (
  run(`
.foo_accent {
  background-color: #c1d730;
  border: none;
}
`)
));

it('should process rgba() color', () => (
  run(`
.foo_accent {
  background-color: rgba(193, 215, 48, 0.15);
}
`)
));

it('should process rgba() color without spaces between commas', () => (
  run(`
.foo_accent {
  background-color: rgba(193,215,48,0.15);
}
`)
));

it('should process rgba() color in border', () => (
  run(`
.foo_accent {
  border: 1px solid rgba(193, 215, 48, 0.15);
}
`)
));

it('should process rgba() color in border mirror order', () => (
  run(`
.foo_accent {
  border: rgba(193, 215, 48, 0.15) 1px solid;
}
`)
));
