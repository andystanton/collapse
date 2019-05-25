const gulp = require('gulp');
const gutil = require('gulp-util');
const babel = require('gulp-babel');

gulp.task('copy-js', () => {
    return gulp.src([
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/jquery.hotkeys/jquery.hotkeys.js',
            'node_modules/bootstrap/dist/js/bootstrap.min.js',
            'node_modules/dom-to-image-more/dist/dom-to-image-more.min.js',
            'node_modules/three/three.min.js'
        ])
        .pipe(gulp.dest('./public/js'));
});

gulp.task('copy-css', (cb) => {
    return gulp.src([
            'node_modules/bootstrap/dist/css/bootstrap.css'
        ])
        .pipe(gulp.dest('./public/css'));
});

gulp.task('copy-fonts', () => {
    return gulp.src([
            'node_modules/bootstrap/dist/fonts/*'
        ])
        .pipe(gulp.dest('./public/fonts'));
});

gulp.task('build-js', () => {
    return gulp.src([
            'src/collapse.js'
        ])
        .pipe(babel({
            presets: ['es2015']
        })).on('error', gutil.log)
        .pipe(gulp.dest('./public/js'));
});

gulp.task('watch', () => {
    return gulp.watch(['src/*.js'], ['build-js']);
});

gulp.task('default', gulp.series(['copy-js', 'copy-css', 'copy-fonts', 'build-js']));
