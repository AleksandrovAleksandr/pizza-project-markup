import del from 'del'
import gulp from 'gulp'
import imagemin, {mozjpeg, optipng, svgo} from 'gulp-imagemin'
import webp from 'gulp-webp'
import svgstore from 'gulp-svgstore'
import rename from 'gulp-rename'
import include from 'gulp-file-include'
import htmlmin from 'gulp-htmlmin'
import plumber from 'gulp-plumber'
import sourcemaps from 'gulp-sourcemaps'
import csso from 'gulp-csso'
import sassLib from 'sass'
import gulpSass from 'gulp-sass'
import postcss from 'gulp-postcss'
import browserSync from 'browser-sync'
const sync = browserSync.create()
import autoprefixer from 'autoprefixer'
import cheerio from 'gulp-cheerio'

const scss = gulpSass(sassLib)

const {src, dest, series, parallel} = gulp

export const clear = (done) => {
  del.sync('build')
  done()
}

const imagesOptimize = () =>
  src('src/img/**/*.{png,jpg}')
    .pipe(
      imagemin([
        mozjpeg({quality: 75, progressive: true}),
        optipng({optimizationLevel: 5}),
      ])
    )
    .pipe(dest('build/img'))

const imagesToWebp = () =>
  src('src/img/**/*.{png,jpg}')
    .pipe(webp({quality: 80}))
    .pipe(dest('build/img'))

const svgOptimizeAndToSprite = () =>
  src('src/img/svg/icon-*.svg')
    .pipe(
      imagemin([
        svgo({
          plugins: [
            {name: 'removeViewBox', active: false},
            {name: 'cleanupIDs', active: true},
            {name: 'removeDimensions', active: true},
            {
              name: 'removeAttributesBySelector',
              params: {
                selector: '[fill]',
                attributes: ['fill'],
              },
              active: false,
            },
          ],
        }),
      ])
    )
    .pipe(svgstore({inlineSvg: true}))
    .pipe(
      cheerio({
        run: ($) => {
          $('svg').attr('fill', 'none')
        },
        parserOptions: {xmlMode: true},
      })
    )
    .pipe(rename('icons.svg'))
    .pipe(dest('build/img'))

const html = () =>
  src('src/*.html')
    .pipe(include())
    .pipe(
      htmlmin({
        collapseWhitespace: true,
        removeComments: true,
      })
    )
    .pipe(dest('build'))
    .pipe(sync.stream())

export const styles = () =>
  src('./src/sass/styles.{sass,scss}')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(scss())
    .pipe(postcss([autoprefixer({grid: true})]))
    .pipe(csso())
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./build/css'))
    .pipe(sync.stream())

export const fonts = () =>
  src('src/fonts/**/*.{svg,ttf,woff,woff2}').pipe(dest('build/fonts'))

const server = () =>
  sync.init({
    server: {
      baseDir: 'build',
    },
  })
const watch = () => {
  gulp.watch('./src/**/**.html', html)
  gulp.watch('./src/sass/**/*.{sass,scss}', styles)
}

export default series(
  clear,
  parallel(imagesOptimize, imagesToWebp, svgOptimizeAndToSprite, fonts),
  parallel(html, styles),
  parallel(watch, server)
)
