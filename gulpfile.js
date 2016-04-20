
var gulp = require('gulp');
var fs = require('fs');
var del = require('del');
var lazypipe = require('lazypipe');
var plumber = require('gulp-plumber');
var flatten = require('gulp-flatten');
var tap = require('gulp-tap');
var rename = require('gulp-rename');
var print = require('gulp-print');
var inline = require('gulp-inline');

var watch = require('gulp-watch');
var browserSync = require('browser-sync').create();
var package = require('./package.json');

var tslint = require('gulp-tslint');
var typescript = require('gulp-typescript');

var stylish = require('jshint-stylish');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var karma = require('gulp-karma');

var less = require('gulp-less');
var prefix = require('gulp-autoprefixer');
var minify = require('gulp-cssnano');

var svgmin = require('gulp-svgmin');
var svgstore = require('gulp-svgstore');

var markdown = require('gulp-markdown');
var fileinclude = require('gulp-file-include');


/**
 * Paths to project folders
 */

var paths = {
    input: 'src/**/*',
    output: 'dist/',
    scripts: {
        input: 'src/**/*.ts',
        output: 'dist/scripts/'
    },
    styles: {
        input: 'src/**/*.{less,css}',
        output: 'dist/styles/'
    },
    svgs: {
        input: 'src/svg/*',
        output: 'dist/svg/'
    },
    images: {
        input: 'src/img/*',
        output: 'dist/img/'
    },
    static: {
        input: 'src/static/*',
        output: 'dist/'
    },
    test: {
        input: 'src/js/**/*.js',
        karma: 'test/karma.conf.js',
        spec: 'test/spec/**/*.js',
        coverage: 'test/coverage/',
        results: 'test/results/'
    },
    docs: {
        input: 'src/docs/*.{html,md,markdown}',
        output: 'docs/',
        templates: 'src/docs/_templates/',
        assets: 'src/docs/assets/**'
    }
};


gulp.task('build:scripts', ['clean:dist'], function() {
    
    return gulp.src(paths.scripts.input)
        .pipe(typescript({
			noImplicitAny: false,
			out: 'script.js'
		}))
        .pipe(gulp.dest(paths.scripts.output))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.scripts.output))
        
});

// Process, lint, and minify Less files
gulp.task('build:styles', ['clean:dist'], function() {
    return gulp.src(paths.styles.input)
        .pipe(plumber())
        .pipe(less({
            outputStyle: 'expanded',
            sourceComments: true
        }))
        .pipe(flatten())
        .pipe(prefix({
            browsers: ['last 3 version', '> 1%'],
            cascade: true,
            remove: true
        }))
        .pipe(gulp.dest(paths.styles.output))
        .pipe(rename({ suffix: '.min' }))
        .pipe(minify({
            discardComments: {
                removeAll: true
            }
        }))
        .pipe(gulp.dest(paths.styles.output));
});

// Generate SVG sprites
gulp.task('build:svgs', ['clean:dist'], function () {
    return gulp.src(paths.svgs.input)
        .pipe(plumber())
        .pipe(tap(function (file, t) {
            if ( file.isDirectory() ) {
                var name = file.relative + '.svg';
                return gulp.src(file.path + '/*.svg')
                    .pipe(svgmin())
                    .pipe(svgstore({
                        fileName: name,
                        prefix: 'icon-',
                        inlineSvg: true
                    }))
                    .pipe(gulp.dest(paths.svgs.output));
            }
        }))
        .pipe(svgmin())
        .pipe(gulp.dest(paths.svgs.output));
});

// Copy image files into output folder
gulp.task('build:images', ['clean:dist'], function() {
    return gulp.src(paths.images.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.images.output));
});

gulp.task('build:static', ['clean:dist'], function() {
    return gulp.src(paths.static.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.static.output));
});

gulp.task('lint:scripts', function () {
    return gulp.src(paths.scripts.input)
        .pipe(plumber())
        .pipe(tslint({
            configuration: {
              rules: {
                "class-name": true,
              }
            }
        }))
        .pipe(tslint.report("verbose"));
});

// Remove pre-existing content from output and test folders
gulp.task('clean:dist', function () {
    del.sync([
        paths.output + "*"
    ]);
});

// Remove pre-existing content from text folders
gulp.task('clean:test', function () {
    del.sync([
        paths.test.coverage,
        paths.test.results
    ]);
});

// Run unit tests
gulp.task('test:scripts', function() {
    return gulp.src([paths.test.input].concat([paths.test.spec]))
        .pipe(plumber())
        .pipe(karma({ configFile: paths.test.karma }))
        .on('error', function(err) { throw err; });
});

// Generate documentation
gulp.task('build:docs', ['compile', 'clean:docs'], function() {
    return gulp.src(paths.docs.input)
        .pipe(plumber())
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(tap(function (file, t) {
            if ( /\.md|\.markdown/.test(file.path) ) {
                return t.through(markdown);
            }
        }))
        .pipe(gulp.dest(paths.docs.output));
});

// Copy distribution files to docs
gulp.task('copy:dist', ['compile', 'clean:docs'], function() {
    return gulp.src(paths.output + '/**')
        .pipe(plumber())
        .pipe(gulp.dest(paths.docs.output + '/dist'));
});

// Copy documentation assets to docs
gulp.task('copy:assets', ['clean:docs'], function() {
    return gulp.src(paths.docs.assets)
        .pipe(plumber())
        .pipe(gulp.dest(paths.docs.output + '/assets'));
});

gulp.task('clean:docs', function () {
    return del.sync(paths.docs.output);
});

gulp.task('serve',  [] , function( cb ){

    browserSync.init({
        open:  false ,
        server: {
            baseDir: "./"
        }
    });

    gulp.watch([paths.input,"index.html"]).on('change', function(file) {
        gulp.start('refresh');
    });
});

gulp.task('watch',['default'],function(){
     gulp.watch([paths.input,"index.html"]).on('change', function(file) {
        gulp.start('default');
    });
})

// rebuild and notify browsertSync
gulp.task('refresh', ['compile'], function () {
   browserSync.reload();
});

gulp.task('inline', ['compile'], function () {
    
 return gulp.src('index.html')
  .pipe(inline({
    base: '/',
    js: uglify,
    css: minify,
    // disabledTypes: ['svg', 'img', 'js'], // Only inline css files 
    // ignore: ['./css/do-not-inline-me.css']
  }))
  .pipe(rename({suffix:"-inline"}))
  .pipe(gulp.dest('./'));
  
});

gulp.task('compile', [
    'lint:scripts',
    'clean:dist',
    'build:scripts',
    'build:styles',
    'build:images',
    'build:static',
    'build:svgs'
]);

gulp.task('docs', [
    'clean:docs',
    'build:docs',
    'copy:dist',
    'copy:assets'
]);

gulp.task('default', [
    'compile',
    'docs'
]);

gulp.task('test', [
    'default',
    'test:scripts'
]);