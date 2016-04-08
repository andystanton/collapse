const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('copy-js', () => {
    gulp.src([
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/dom-to-image/dist/dom-to-image.min.js',
            'node_modules/three/three.min.js'
        ])
        .pipe(gulp.dest('./public/js'));
});

gulp.task('build-js', () => {
    gulp.src([
            'src/worker.js',
            'src/collapse.js'
        ])
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./public/js'));
});

gulp.task('watch', () => {
  gulp.watch(['src/*.js'], ['build-js']);
});

gulp.task('default', ['copy-js', 'build-js']);
