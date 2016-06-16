'use strict';

const through = require('through2');
const path = require('path');
const gutil = require('gulp-util');
const _ = require('lodash');
const Map = require('collections/map');

const pluginName = 'gulp-vuemaker';

module.exports = function() {

  let components = new Map();

  /*
   * Detect the type of the file
   */
  function detectKind(ext) {
    // Set element + optional attribute
    switch (ext) {
      case '.css':
        return {
          tag: 'style',
          lang: null,
        };
      case '.scss':
        return {
          tag: 'style',
          lang: 'sass',
        };
      case '.styl':
        return {
          tag: 'style',
          lang: 'stylus',
        };
      case '.html':
        return {
          tag: 'template',
          lang: null,
        };
      case '.jade':
        return {
          tag: 'template',
          lang: 'jade',
        };
      case '.js':
        return {
          tag: 'script',
          lang: null,
        };
      case '.coffee':
        return {
          tag: 'script',
          lang: 'coffee',
        };
      default:
        return null;
    }
  }

  /**
   * Check if firstline is:
   *   1 line comment multiline
   *   with "vue" and "scoped"
   *
   * Usage: /* vue:scoped *(\)/
   */
  function isScoped(content) {
    let endLine = content.indexOf('\n');
    let re = /^\/\*.*vue.*scoped.*\*\/$/;
    let str = content.slice(0, endLine);

    return (str.match(re) === null) ? false : true;
  }

  /*
   * Transform the files
   */
  function transform(file, encoding, cb) {
    if (file.isNull()) {
      return cb();
    }
    if (file.isStream()) {
      return cb(new gutil.PluginError(pluginName, 'Streaming not supported'));
    }

    let kind = detectKind(path.extname(file.path));
    if (kind === null) {
      return cb();
    }

    let componentName = gutil.replaceExtension(file.relative, '.vue');
    if (!components.has(componentName)) {
      components.set(componentName, new Map());
    }
    components.get(componentName).set(kind, file.contents.toString(encoding));

    return cb();
  }

  /*
   * Flush the files
   */
  function flush(cb) {
    _.forEach(components.entries(), function(component) {

      let elements = _.map(component[1].entries(), function(item) {
        let element = {};
        let attribute = (item[0].lang) ? ' lang="' + item[0].lang + '"' : '';
        // Check if scoped
        let scoped = (isScoped(item[1])) ? ' scoped' : '';
        // Set type (for sorting) and content
        element.type = item[0].tag;
        element.content = '<' + item[0].tag + attribute + scoped + '>\n' +
           item[1] +
           '</' + item[0].tag + '>\n\n';

        return element;
      });

      // Sort elements by type property
      let order = ['style', 'template', 'script'];
      elements = _.sortBy(elements, function(o) {
        return _.indexOf(order, o.type);
      });

      // New file with content property
      this.push(new gutil.File({
        path: component[0],
        contents: new Buffer(_.map(elements, 'content').join('')),
      }));

    }.bind(this));
    cb();
  }

  return through.obj(transform, flush);
};
