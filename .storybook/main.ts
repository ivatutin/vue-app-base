import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  // По ADR-0007 stories живут рядом с обёртками в src/shared/ui/base/ или
  // рядом с widgets/<x>/ui/. MDX сейчас не используется — оставлен в
  // паттерне на будущее.
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/**/*.mdx',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  framework: '@storybook/vue3-vite',
}
export default config
