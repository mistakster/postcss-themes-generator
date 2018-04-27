/* eslint-env node, jest */
const postcss = require('postcss');
const plugin = require('../lib/index');

const config = require('./config.json');

function run(input, warningCount, opts) {
  if (typeof opts === 'undefined') {
    opts = {from: undefined};
  }

  return postcss()
    .use(plugin(config))
    .process(input, opts)
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

it('should match a pseudo selector', () => (
  run(`
.foo_primary:hover {
  color: #e54096;
}
`)
));

it('should match and process multiple selectors', () => (
  run(`
.foo_primary, .bar_primary, baz_primary {
  color: #e54096;
}
.foo_secondary, .bar_secondary {
  color: #0080c5;
}
.baz_accent, .foo_accent {
  color: #c1d730;
}
`)
));

it('should check that all selectors must be the same type', () => (
  run(`
.foo_primary, .bar_secondary {
  color: #e54096;
}
.foo_primary, .bar {
  color: #e54096;
}
.baz, .bar_primary {
  color: #e54096;
}
`, 4)
));

it('should warn on a suspicious rule', () => (
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

it('should process a rgba() color', () => (
  run(`
.foo_accent {
  background-color: rgba(193, 215, 48, 0.15);
  outline-color: rgba(193,215,48,0.15);
  border: 1px solid rgba(193, 215, 48, 0.15);
}
`)
));
