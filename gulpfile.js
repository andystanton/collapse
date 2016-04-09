const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('copy-js', () => {
    gulp.src([
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/bootstrap/dist/js/bootstrap.min.js',
            'node_modules/dom-to-image/dist/dom-to-image.min.js',
            'node_modules/three/three.min.js'
        ])
        .pipe(gulp.dest('./public/js'));
});

gulp.task('copy-css', () => {
    gulp.src([
            'node_modules/bootstrap/dist/css/bootstrap.css'
        ])
        .pipe(gulp.dest('./public/css'));
});

gulp.task('copy-fonts', () => {
    gulp.src([
            'node_modules/bootstrap/dist/fonts/*'
        ])
        .pipe(gulp.dest('./public/fonts'));
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

gulp.task('default', ['copy-js', 'copy-css', 'copy-fonts', 'build-js']);
