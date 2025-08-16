/** @type {import('karma').Config} */
module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false, // keep Jasmine Spec Runner output visible
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    coverageReporter: {
      // coverage output folder
      dir: require('path').join(__dirname, 'coverage'),
      // put reports directly in coverage/ (so path is coverage/lcov.info)
      subdir: '.',
      reporters: [
        { type: 'html' },         // coverage/index.html
        { type: 'text-summary' }, // console summary
        { type: 'lcovonly' },     // coverage/lcov.info  <-- Sonar uses this
      ],
      // optional: enforce build to fail if coverage dips
      // check: { global: { statements: 80, branches: 80, functions: 80, lines: 80 } }
    },
    browsers: ['Chrome'],
    singleRun: false,             // set true in CI if you like
    restartOnFileChange: true,
  });
};
