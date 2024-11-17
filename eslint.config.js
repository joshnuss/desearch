// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  prettierRecommended,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/']
  }
)
