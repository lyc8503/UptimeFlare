import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/uptime.config'],
              importNames: ['workerConfig'],
              message:
                'Do not import workerConfig in client-bundled files. See https://github.com/lyc8503/UptimeFlare/issues/198 for details.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/app/page.tsx',
      'src/app/incidents/page.tsx',
      'src/app/api/**/route.ts',
      'src/middleware.ts',
      'src/server/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]

export default eslintConfig
