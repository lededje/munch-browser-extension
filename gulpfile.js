var gulp = require('gulp')
var merge = require('event-stream').merge
var webpack = require('webpack-stream')
var $ = require('gulp-load-plugins')()

/**
 * Public tasks
 */

gulp.task('clean', function () {
  return pipe('./tmp', [$.clean()])
})

gulp.task('build', function (cb) {
  $.runSequence('clean', 'css', 'templates', 'js', 'images', 'chrome', 'opera', 'firefox', cb)
})

gulp.task('default', ['build'], function () {
  gulp.watch(['./src/**/*'], ['default'])
})

gulp.task('dist', ['build'], function (cb) {
  $.runSequence('firefox:xpi', 'chrome:zip', 'opera:nex', cb)
})

/**
 * Private tasks
 */

gulp.task('css', function () {
  return pipe('./src/styles/munchdb.scss', [
    $.sass({errLogToConsole: true}),
    $.autoprefixer({cascade: true}),
    $.concat('munchdb.css')
  ], './tmp')
})

gulp.task('templates', function () {
  gulp.src('./src/templates/**/*.mustache')
      .pipe($.hoganCompile('templates.js', {hoganModule: 'hogan.js'}))
      .pipe(gulp.dest('./src'))
})

gulp.task('js', function () {
  return pipe([
    './src/**/*.js',
    '!./src/browsers/**/*'
  ], [
    webpack(require('./webpack.config.js'))
  ], './tmp')
})

gulp.task('images', function () {
  return pipe('./src/images/**/*', './tmp/images')
})

// Chrome
gulp.task('chrome', function () {
  return merge(
    pipe('./icons/**/*', './tmp/chrome/icons'),
    pipe([
      './tmp/munchdb.css',
      './tmp/munchdb.js',
      './src/browsers/chrome/**/*'
    ], './tmp/chrome/')
  )
})

gulp.task('chrome:zip', function () {
  return pipe('./tmp/chrome/**/*', [$.zip('chrome.zip')], './dist')
})

// Opera
gulp.task('opera', ['chrome'], function () {
  return pipe('./tmp/chrome/**/*', './tmp/opera')
})

gulp.task('opera:nex', function () {
  return pipe('./dist/chrome.crx', [$.rename('opera.nex')], './dist')
})

// Firefox
gulp.task('firefox', function () {
  return merge(
    pipe('./icons/**/*', './tmp/firefox/data/icons'),
    pipe([
      './tmp/munchdb.css',
      './tmp/munchdb.js'
    ], './tmp/firefox/data'),
    pipe(['./src/browsers/firefox/firefox.js'], './tmp/firefox/lib'),
    pipe('./src/browsers/firefox/package.json', './tmp/firefox')
  )
})

gulp.task('firefox:xpi', function (cb) {
  $.run('cd ./tmp/firefox && jpm xpi').exec(function () {
    pipe('./tmp/firefox/@munchdb-*.xpi', './dist')
    return cb()
  })
})

/**
 * Helpers
 */

function pipe (src, transforms, dest) {
  if (typeof transforms === 'string') {
    dest = transforms
    transforms = null
  }
  var stream = gulp.src(src)
  transforms && transforms.forEach(function (transform) {
    stream = stream.pipe(transform)
  })
  if (dest) stream = stream.pipe(gulp.dest(dest))
  return stream
}
