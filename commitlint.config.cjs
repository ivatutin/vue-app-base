/**
 * Commitlint config — расширяет conventional commits для русскоязычных сообщений.
 * См. CONTRIBUTING.md § Workflow.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subject пишем на русском, заглавные/строчные в начале — допустимы.
    'subject-case': [0],
    // Body/footer на русском бывает длинным — даём 200 символов на строку.
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200],
    // Header чуть длиннее, чем дефолтный 100 — для русских описаний.
    'header-max-length': [2, 'always', 120],
  },
}
