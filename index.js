'use strict';

const through = require('through2');
const path = require('path');
const gutil = require('gulp-util');
const _ = require('lodash');
const Map = require('collections/map');

const pluginName = 'gulp-vuemaker';

module.exports = function(file, opt) {

  let components = new Map();

  /*
   * Detect the type of the file
   */
  function detectKind(ext) {
    switch (ext) {
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
      default:
        return null;
    }
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
    _.forEach(components.entries(), function(component, idx) {

      let elements = _.map(component[1].entries(), function(item, text) {
        let content = '';
        if (item[0].lang) {
          content = '<' + item[0].tag + ' lang="' + item[0].lang + '">\n' +
           item[1] +
           '</' + item[0].tag + '>\n\n';
        } else {
          content = '<' + item[0].tag + '>\n'
          + item[1] +
          '</' + item[0].tag + '>\n\n';
        }
        return content;
      });

      this.push(new gutil.File({
        path: component[0],
        contents: new Buffer(elements.join('')),
      }));

    }.bind(this));
    cb();
  }

  return through.obj(transform, flush);
};
